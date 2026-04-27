import { useState } from 'react';
import { formatDateTime } from '../utils/formatters';
import { isTr } from '../utils/i18n';
import { Repeat, Settings2, Clock, Save, X, ChevronRight, ChevronLeft } from 'lucide-react';

function TaskCard({
  editingDraft,
  isEditing,
  onArchiveTask,
  onBeginEdit,
  onCancelEdit,
  onChangeEditingDraft,
  onSaveEdit,
  onToggleTask,
  onUpdateDuration,
  onUpdateProgress,
  task,
}) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempDuration, setTempDuration] = useState(task.duration_total || 0);

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      onSaveEdit(task.id);
    }

    if (event.key === 'Escape') {
      onCancelEdit();
      setIsCustomizing(false);
    }
  };

  const handleDurationSave = () => {
    onUpdateDuration(task.id, parseInt(tempDuration) || 0);
    setIsCustomizing(false);
  };

  const handleProgressAdjust = (delta) => {
    const nextVal = Math.min(task.duration_total, Math.max(0, (task.duration_progress || 0) + delta));
    const isNowCompleted = nextVal >= task.duration_total && task.duration_total > 0 && !task.is_completed;
    onUpdateProgress(task.id, nextVal, isNowCompleted);
  };

  const progressPct = task.duration_total ? Math.min(100, Math.round(((task.duration_progress || 0) / task.duration_total) * 100)) : 0;

  return (
    <article className={`task-card ${task.is_completed ? 'task-card-complete' : ''} ${isCustomizing ? 'task-card-customizing' : ''}`}>
      <button
        aria-label={task.is_completed ? (isTr ? `${task.title} görevini aç` : `Mark ${task.title} as open`) : (isTr ? `${task.title} görevini tamamla` : `Mark ${task.title} as complete`)}
        className={`task-check ${task.is_completed ? 'task-check-active' : ''}`}
        onClick={() => onToggleTask(task)}
        type="button"
      >
        <span />
      </button>

      <div className="task-body">
        {isEditing ? (
          <div className="task-editor">
            <input
              autoFocus
              onChange={(event) =>
                onChangeEditingDraft((current) => ({ ...current, title: event.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder={isTr ? "Görev başlığı" : "Task title"}
              type="text"
              value={editingDraft.title}
            />
            <textarea
              onChange={(event) =>
                onChangeEditingDraft((current) => ({ ...current, description: event.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder={isTr ? "Görev detayları" : "Task details"}
              rows="3"
              value={editingDraft.description}
            />
            <div className="task-editor-actions">
              <button className="button button-primary" onClick={() => onSaveEdit(task.id)} type="button">
                {isTr ? 'Kaydet' : 'Save'}
              </button>
              <button className="button button-ghost" onClick={onCancelEdit} type="button">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        ) : isCustomizing ? (
          <div className="task-customizer">
             <div className="customizer-header">
                <Clock size={16} />
                <span>{isTr ? 'Süre Bazlı Takip' : 'Duration Tracking'}</span>
             </div>
             <p>{isTr ? 'Bu görev için bir hedef süre (dakika) belirleyin.' : 'Set a target duration (minutes) for this task.'}</p>
             <div className="customizer-input-row">
                <input 
                  type="number" 
                  value={tempDuration} 
                  onChange={e => setTempDuration(e.target.value)}
                  placeholder="Dakika (ör: 60)"
                  autoFocus
                />
                <button className="button button-primary" onClick={handleDurationSave}><Save size={16}/> {isTr ? 'Ayarla' : 'Set'}</button>
                <button className="button button-ghost" onClick={() => setIsCustomizing(false)}><X size={16}/></button>
             </div>
          </div>
        ) : (
          <>
            <div className="task-copy">
              <h3>{task.title}</h3>
              <p>{task.description || (isTr ? 'Henüz açıklama eklenmedi.' : 'No description added yet.')}</p>
            </div>

            {task.duration_total > 0 && (
              <div className="task-progress-zone">
                <div className="progress-header">
                   <span>{isTr ? 'İlerleme:' : 'Progress:'} <strong>{task.duration_progress || 0} / {task.duration_total} dk</strong></span>
                   <span className="progress-pct-badge">{progressPct}%</span>
                </div>
                <div className="task-slider-container">
                   <input 
                     type="range" 
                     min="0" 
                     max={task.duration_total} 
                     value={task.duration_progress || 0}
                     onChange={(e) => {
                       const nextVal = parseInt(e.target.value);
                       const isNowCompleted = nextVal >= task.duration_total && task.duration_total > 0 && !task.is_completed;
                       onUpdateProgress(task.id, nextVal, isNowCompleted);
                     }}
                     className="task-progress-slider"
                   />
                   <div className="task-progress-bar-bg">
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                   </div>
                </div>
              </div>
            )}

            <div className="task-meta">
              <span>{task.is_completed ? (isTr ? 'Tamamlandı' : 'Completed') : (isTr ? 'Devam ediyor' : 'In progress')}</span>
              <span>{formatDateTime(task.updated_at || task.created_at)}</span>
              {task.recurrence && task.recurrence !== 'none' && (
                <span className="task-routine-badge">
                  <Repeat size={12} />
                  {task.recurrence === 'daily' ? (isTr ? 'Günlük' : 'Daily') : task.recurrence === 'weekly' ? (isTr ? 'Haftalık' : 'Weekly') : (isTr ? 'Aylık' : 'Monthly')}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {!isEditing && !isCustomizing ? (
        <div className="task-actions">
          <button className="button button-secondary" onClick={() => onBeginEdit(task)} title={isTr ? 'Düzenle' : 'Edit'} type="button">
            {isTr ? 'Düzenle' : 'Edit'}
          </button>
          <button className="button button-secondary" onClick={() => setIsCustomizing(true)} title={isTr ? 'Özelleştir' : 'Customize'} type="button">
            <Settings2 size={16} />
            {isTr ? 'Özelleştir' : 'Customize'}
          </button>
          <button className="button button-ghost button-danger" onClick={() => onArchiveTask(task)} title={isTr ? 'Arşivle' : 'Archive'} type="button">
            {isTr ? 'Arşivle' : 'Archive'}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default TaskCard;
