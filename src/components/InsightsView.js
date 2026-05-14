import { useEffect, useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { isTr } from '../utils/i18n';

const locale = isTr ? 'tr-TR' : 'en-US';

const getLocalISODate = (date = new Date()) => {
  const d = new Date(date);
  const z = d.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(d.getTime() - z);
  return localDate.toISOString().split('T')[0];
};

const parseLocalDate = (dateString) => new Date(`${dateString}T00:00:00`);

const getProgress = (item) => (
  item?.total_count ? Math.round((item.completed_count / item.total_count) * 100) : null
);

const formatPercent = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : '--');

function StatCard({ label, value, tone = 'default', taskList = null }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {taskList && taskList.length > 0 && (
        <div className="stat-tooltip">
          <ul>
            {taskList.slice(0, 5).map(t => <li key={t.id}>{t.title}</li>)}
            {taskList.length > 5 && <li>{isTr ? `... ve ${taskList.length - 5} daha` : `... and ${taskList.length - 5} more`}</li>}
          </ul>
        </div>
      )}
    </article>
  );
}

function InsightsView({ activeFolder, folders, stats, history = [] }) {
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyView, setHistoryView] = useState('flow');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [todayKey, setTodayKey] = useState(() => getLocalISODate());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayKey(getLocalISODate());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'folder' && activeFolder) {
      return history.filter(h => h.folder_id === activeFolder.id);
    }

    const groups = {};
    history.forEach(item => {
      const key = `${item.period_date}-${item.period_type}`;
      if (!groups[key]) {
        groups[key] = {
          period_date: item.period_date,
          period_type: item.period_type,
          completed_count: 0,
          total_count: 0,
          tasks_snapshot: [],
          isAggregate: true
        };
      }
      groups[key].completed_count += item.completed_count;
      groups[key].total_count += item.total_count;
      if (item.tasks_snapshot && Array.isArray(item.tasks_snapshot)) {
        groups[key].tasks_snapshot.push(...item.tasks_snapshot);
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.period_date) - new Date(a.period_date));
  }, [history, historyFilter, activeFolder]);

  const liveTodayEntry = useMemo(() => {
    const todayTasks = stats.activeTasksList.filter((task) => {
      if (task.recurrence !== 'daily') {
        return false;
      }
      if (historyFilter === 'folder' && activeFolder) {
        return task.folder_id === activeFolder.id;
      }
      return true;
    });

    if (!todayTasks.length) {
      return null;
    }

    return {
      period_date: todayKey,
      period_type: 'daily',
      completed_count: todayTasks.filter((task) => task.is_completed).length,
      total_count: todayTasks.length,
      tasks_snapshot: todayTasks.map((task) => ({
        title: task.title,
        is_completed: task.is_completed,
        duration_total: task.duration_total || 0,
        duration_progress: task.duration_progress || 0
      })),
      isLive: true
    };
  }, [stats.activeTasksList, historyFilter, activeFolder, todayKey]);

  const calendarData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const dailyByDate = {};

    filteredHistory
      .filter((item) => item.period_type === 'daily')
      .forEach((item) => {
        const date = parseLocalDate(item.period_date);
        if (date.getFullYear() !== year || date.getMonth() !== month) return;
        dailyByDate[item.period_date] = item;
      });

    if (liveTodayEntry) {
      const liveDate = parseLocalDate(liveTodayEntry.period_date);
      if (liveDate.getFullYear() === year && liveDate.getMonth() === month) {
        dailyByDate[todayKey] = liveTodayEntry;
      }
    }

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let i = 0; i < mondayFirstOffset; i += 1) {
      cells.push({ type: 'empty', key: `empty-start-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = getLocalISODate(date);
      const entry = dailyByDate[key] || null;
      const progress = getProgress(entry);
      cells.push({
        type: 'day',
        key,
        day,
        date,
        entry,
        progress,
        isToday: key === todayKey
      });
    }

    const dailyValues = Object.values(dailyByDate)
      .map(getProgress)
      .filter((value) => value !== null);
    const weeklyValues = filteredHistory
      .filter((item) => {
        if (item.period_type !== 'weekly') return false;
        const date = parseLocalDate(item.period_date);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map(getProgress)
      .filter((value) => value !== null);

    const average = (values) => (
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
    );

    return {
      cells,
      dailyAverage: average(dailyValues),
      weeklyAverage: average(weeklyValues),
      hasEntries: dailyValues.length > 0 || weeklyValues.length > 0
    };
  }, [filteredHistory, liveTodayEntry, selectedMonth, todayKey]);

  const getPeriodLabel = (type, date) => {
    const d = parseLocalDate(date);
    const options = { day: 'numeric', month: 'long' };
    const dateStr = d.toLocaleDateString(locale, options);

    if (type === 'daily') return isTr ? `Günlük (${dateStr})` : `Daily (${dateStr})`;
    if (type === 'weekly') return isTr ? `Haftalık (${dateStr})` : `Weekly (${dateStr})`;
    if (type === 'monthly') return isTr ? `Aylık (${d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })})` : `Monthly (${d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })})`;
    return dateStr;
  };

  const shiftMonth = (amount) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const monthLabel = selectedMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekDays = isTr ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <section className="insights-view">
      <div className="stats-grid">
        <StatCard label={isTr ? "Tamamlama oranı" : "Completion rate"} tone="brand" value={`${stats.completionRate}%`} />
        <StatCard label={isTr ? "Aktif rutinler" : "Active routines"} value={stats.totalRoutines} taskList={stats.routinesList} />
        <StatCard label={isTr ? "Aktif görevler" : "Active tasks"} value={stats.active} taskList={stats.activeTasksList} />
        <StatCard label={isTr ? "Tamamlandı" : "Completed"} value={stats.completed} taskList={stats.completedTasksList} />
      </div>

      <div className="insights-layout">
        <article className="panel-card">
          <div className="section-header">
            <div>
              <span className="eyebrow">{isTr ? 'Klasör durumu' : 'Folder health'}</span>
              <h2>{isTr ? 'Koleksiyon özeti' : 'Collection snapshot'}</h2>
            </div>
          </div>

          <div className="folder-insights">
            {stats.byFolder.length ? (
              stats.byFolder.map((folder) => {
                const progress = folder.total ? Math.round((folder.completed / folder.total) * 100) : 0;

                return (
                  <div className="folder-insight-row" key={folder.id}>
                    <div>
                      <h3>{folder.name}</h3>
                      <p>
                        {folder.completed} {isTr ? 'tamamlandı' : 'done'} / {folder.open} {isTr ? 'açık' : 'open'}
                      </p>
                    </div>
                    <div className="progress-cluster">
                      <div className="progress-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <strong>{progress}%</strong>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-copy">{isTr ? 'Henüz klasör yok. İlerlemeyi ölçmek için bir tane oluşturun.' : 'No folders yet. Create one to start measuring progress.'}</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-header">
            <div>
              <span className="eyebrow">{isTr ? 'Mevcut odak' : 'Current focus'}</span>
              <h2>{activeFolder?.name || (isTr ? 'Klasör seçilmedi' : 'No folder selected')}</h2>
            </div>
          </div>

          <div className="focus-metrics">
            <p>
              {activeFolder
                ? (isTr ? 'Odağınızdaki koleksiyonun hızlı bir özeti için bu alanı kullanın.' : 'Use this area as a quick read on the collection currently in focus.')
                : (isTr ? 'Durumunu görmek için kenar çubuğundan bir klasör seçin.' : 'Pick a folder from the sidebar to see its status here.')}
            </p>

            {activeFolder ? (
              <>
                <div className="focus-row">
                  <span>{isTr ? 'Toplam klasör' : 'Total folders'}</span>
                  <strong>{folders.length}</strong>
                </div>
                <div className="focus-row">
                  <span>{isTr ? 'Aktif görevler' : 'Active tasks'}</span>
                  <strong>{stats.active}</strong>
                </div>
                <div className="focus-row">
                  <span>{isTr ? 'Kalan işler' : 'Remaining work'}</span>
                  <strong>{stats.remaining}</strong>
                </div>
              </>
            ) : null}
          </div>
        </article>
      </div>

      <article className="panel-card history-panel">
        <div className="section-header history-header">
          <div>
            <span className="eyebrow">{isTr ? 'Performans Akışı' : 'Performance Flow'}</span>
            <h2>{isTr ? 'Görev Geçmişi' : 'Task History'}</h2>
          </div>
          <div className="history-controls">
            <div className="filter-tabs">
              <button
                className={historyFilter === 'all' ? 'active' : ''}
                onClick={() => setHistoryFilter('all')}
              >
                {isTr ? 'Hepsi' : 'All'}
              </button>
              <button
                className={historyFilter === 'folder' ? 'active' : ''}
                onClick={() => setHistoryFilter('folder')}
                disabled={!activeFolder}
              >
                {isTr ? 'Mevcut Klasör' : 'Current Folder'}
              </button>
            </div>
            <div className="view-tabs" aria-label={isTr ? 'Geçmiş görünümü' : 'History view'}>
              <button
                aria-label={isTr ? 'Liste görünümü' : 'List view'}
                className={historyView === 'flow' ? 'active' : ''}
                onClick={() => setHistoryView('flow')}
                title={isTr ? 'Liste' : 'List'}
                type="button"
              >
                <List size={16} />
              </button>
              <button
                aria-label={isTr ? 'Takvim görünümü' : 'Calendar view'}
                className={historyView === 'calendar' ? 'active' : ''}
                onClick={() => setHistoryView('calendar')}
                title={isTr ? 'Takvim' : 'Calendar'}
                type="button"
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>

        {historyView === 'flow' ? (
          <div className="history-flow">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item, index) => {
                const progress = getProgress(item) || 0;
                return (
                  <div className="history-item" key={`${item.period_date}-${item.period_type}-${index}`} style={{ '--delay': `${index * 0.05}s` }}>
                    <div className="history-info">
                      <span className="history-date">{getPeriodLabel(item.period_type, item.period_date)}</span>
                      <span className="history-stats">
                        {item.completed_count} / {item.total_count} {isTr ? 'Tamamlandı' : 'Completed'}
                      </span>
                      {item.tasks_snapshot && item.tasks_snapshot.length > 0 && (
                        <div className="history-tasks-preview">
                          {item.tasks_snapshot.map((task, i) => (
                            <span
                              key={i}
                              className={`history-task-tag ${task.is_completed ? 'task-done' : 'task-open'}`}
                            >
                              {task.title}
                              {task.duration_total > 0 && ` (${task.duration_progress}/${task.duration_total} ${isTr ? 'dk' : 'min'})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="history-progress">
                      <div className="progress-track">
                        <span style={{ width: `${progress}%` }} className={progress === 100 ? 'complete' : ''} />
                      </div>
                      <span className="progress-pct">{progress}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-copy">
                {isTr
                  ? 'Henüz geçmiş verisi yok. Periyotlar tamamlandıkça burada görünecektir.'
                  : 'No history data yet. It will appear here as periods complete.'}
              </p>
            )}
          </div>
        ) : (
          <div className="history-calendar-view">
            <div className="calendar-toolbar">
              <button aria-label={isTr ? 'Önceki ay' : 'Previous month'} className="calendar-nav-btn" onClick={() => shiftMonth(-1)} type="button">
                <ChevronLeft size={18} />
              </button>
              <strong>{monthLabel}</strong>
              <button aria-label={isTr ? 'Sonraki ay' : 'Next month'} className="calendar-nav-btn" onClick={() => shiftMonth(1)} type="button">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="calendar-summary">
              <article>
                <span>{isTr ? 'Günlük Ortalama' : 'Daily Average'}</span>
                <strong>{formatPercent(calendarData.dailyAverage)}</strong>
              </article>
              <article>
                <span>{isTr ? 'Haftalık Ortalama' : 'Weekly Average'}</span>
                <strong>{formatPercent(calendarData.weeklyAverage)}</strong>
              </article>
              <article>
                <span>{isTr ? 'Canlı Bugün' : 'Live Today'}</span>
                <strong>{liveTodayEntry ? formatPercent(getProgress(liveTodayEntry)) : '--'}</strong>
              </article>
            </div>

            <div className="performance-calendar">
              {weekDays.map((day) => (
                <span className="calendar-weekday" key={day}>{day}</span>
              ))}
              {calendarData.cells.map((cell) => {
                if (cell.type === 'empty') {
                  return <span className="calendar-empty-cell" key={cell.key} />;
                }

                const progress = cell.progress || 0;
                const hasData = Boolean(cell.entry);
                const tooltipTasks = cell.entry?.tasks_snapshot?.slice(0, 5) || [];

                return (
                  <div
                    className={`calendar-day ${hasData ? 'has-data' : 'no-data'} ${cell.isToday ? 'today' : ''}`}
                    key={cell.key}
                    style={{ '--progress': `${progress * 3.6}deg` }}
                  >
                    <div className="calendar-day-ring">
                      <span>{cell.day}</span>
                    </div>
                    <div className="calendar-day-tooltip">
                      <strong>{cell.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      {hasData ? (
                        <>
                          <span>{progress}%</span>
                          <p>{cell.entry.completed_count} / {cell.entry.total_count} {isTr ? 'tamamlandı' : 'completed'}</p>
                          {cell.entry.isLive && <em>{isTr ? 'Canlı gün' : 'Live day'}</em>}
                          {tooltipTasks.length > 0 && (
                            <div className="calendar-tooltip-tasks">
                              {tooltipTasks.map((task, index) => (
                                <small className={task.is_completed ? 'task-done' : 'task-open'} key={`${task.title}-${index}`}>
                                  {task.title}
                                </small>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p>{isTr ? 'Veri yok' : 'No data'}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!calendarData.hasEntries && (
              <p className="empty-copy calendar-empty-copy">
                {isTr
                  ? 'Bu ay için henüz günlük veya haftalık performans verisi yok.'
                  : 'No daily or weekly performance data for this month yet.'}
              </p>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

export default InsightsView;
