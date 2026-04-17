import { formatDateTime } from '../utils/formatters';
import { isTr } from '../utils/i18n';
import { Repeat } from 'lucide-react';

function TaskCard({
  editingDraft,
  isEditing,
  onArchiveTask,
  onBeginEdit,
  onCancelEdit,
  onChangeEditingDraft,
  onSaveEdit,
  onToggleTask,
  task,
}) {
  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      onSaveEdit(task.id);
    }

    if (event.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <article className={`task-card ${task.is_completed ? 'task-card-complete' : ''}`}>
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
        ) : (
          <>
            <div className="task-copy">
              <h3>{task.title}</h3>
              <p>{task.description || (isTr ? 'Henüz açıklama eklenmedi.' : 'No description added yet.')}</p>
            </div>
            <div className="task-meta">
              <span>{task.is_completed ? (isTr ? 'Tamamlandı' : 'Completed') : (isTr ? 'Devam ediyor' : 'In progress')}</span>
              <span>{formatDateTime(task.updated_at || task.created_at)}</span>
              {task.recurrence && task.recurrence !== 'none' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand)', fontWeight: 500 }}>
                  <Repeat size={12} />
                  {task.recurrence === 'daily' ? (isTr ? 'Günlük Rutin' : 'Daily') : task.recurrence === 'weekly' ? (isTr ? 'Haftalık Rutin' : 'Weekly') : (isTr ? 'Aylık Rutin' : 'Monthly')}
                  <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: '0.2rem' }}>
                    ({isTr ? 'Başlangıç:' : 'Since'} {new Date(task.created_at).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {!isEditing ? (
        <div className="task-actions">
          <button className="button button-secondary" onClick={() => onBeginEdit(task)} type="button">
            {isTr ? 'Düzenle' : 'Edit'}
          </button>
          <button className="button button-ghost button-danger" onClick={() => onArchiveTask(task)} type="button">
            {isTr ? 'Arşivle' : 'Archive'}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default TaskCard;
