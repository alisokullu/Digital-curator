import { useState, useMemo } from 'react';
import { isTr } from '../utils/i18n';

function StatCard({ label, value, tone = 'default' }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InsightsView({ activeFolder, folders, stats, history = [] }) {
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' or 'folder'

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'folder' && activeFolder) {
      return history.filter(h => h.folder_id === activeFolder.id);
    }
    
    // Aggregation for 'all' mode
    const groups = {};
    history.forEach(item => {
      const key = `${item.period_date}-${item.period_type}`;
      if (!groups[key]) {
        groups[key] = {
          period_date: item.period_date,
          period_type: item.period_type,
          completed_count: 0,
          total_count: 0,
          isAggregate: true
        };
      }
      groups[key].completed_count += item.completed_count;
      groups[key].total_count += item.total_count;
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.period_date) - new Date(a.period_date));
  }, [history, historyFilter, activeFolder]);

  const getPeriodLabel = (type, date) => {
    const d = new Date(date);
    const options = { day: 'numeric', month: 'long' };
    const dateStr = d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', options);

    if (type === 'daily') return isTr ? `Günlük (${dateStr})` : `Daily (${dateStr})`;
    if (type === 'weekly') return isTr ? `Haftalık (${dateStr})` : `Weekly (${dateStr})`;
    if (type === 'monthly') return isTr ? `Aylık (${d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })})` : `Monthly (${d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })})`;
    return dateStr;
  };

  return (
    <section className="insights-view">
      <div className="stats-grid">
        <StatCard label={isTr ? "Tamamlama oranı" : "Completion rate"} tone="brand" value={`${stats.completionRate}%`} />
        <StatCard label={isTr ? "Aktif rutinler" : "Active routines"} value={stats.totalRoutines} />
        <StatCard label={isTr ? "Aktif görevler" : "Active tasks"} value={stats.active} />
        <StatCard label={isTr ? "Tamamlandı" : "Completed"} value={stats.completed} />
        <StatCard label={isTr ? "Arşivlendi" : "Archived"} tone="muted" value={stats.archived} />
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
        <div className="section-header">
          <div>
            <span className="eyebrow">{isTr ? 'Performans Akışı' : 'Performance Flow'}</span>
            <h2>{isTr ? 'Görev Geçmişi' : 'Task History'}</h2>
          </div>
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
        </div>

        <div className="history-flow">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, index) => {
              const progress = item.total_count ? Math.round((item.completed_count / item.total_count) * 100) : 0;
              return (
                <div className="history-item" key={`${item.period_date}-${item.period_type}-${index}`} style={{ '--delay': `${index * 0.05}s` }}>
                  <div className="history-info">
                    <span className="history-date">{getPeriodLabel(item.period_type, item.period_date)}</span>
                    <span className="history-stats">
                      {item.completed_count} / {item.total_count} {isTr ? 'Tamamlandı' : 'Completed'}
                    </span>
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
      </article>
    </section>
  );
}

export default InsightsView;
