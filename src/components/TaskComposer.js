import { isTr } from '../utils/i18n';
import { Plus } from 'lucide-react';

function TaskComposer({ busy, draftTask, hasFolder, onChangeDraft, onSubmit }) {
  return (
    <section className="composer-premium">
      <form className="composer-form" onSubmit={onSubmit}>
        <div className="composer-input-group">
          <input
            className="composer-title"
            disabled={!hasFolder}
            onChange={(event) => onChangeDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder={hasFolder ? (isTr ? 'Yeni bir görev yazın...' : 'Type a new task...') : (isTr ? 'Önce bir klasör oluşturun' : 'Create a folder first')}
            type="text"
            value={draftTask.title}
          />
          {draftTask.title && (
            <textarea
              className="composer-desc"
              disabled={!hasFolder}
              onChange={(event) => onChangeDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder={isTr ? 'Detaylar veya alt notlar (opsiyonel)' : 'Details or sub-notes (optional)'}
              rows="1"
              value={draftTask.description}
            />
          )}
        </div>
        <button 
          className="composer-submit" 
          disabled={!hasFolder || !draftTask.title.trim() || busy} 
          type="submit"
          aria-label={isTr ? 'Görev Ekle' : 'Add Task'}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </form>
    </section>
  );
}

export default TaskComposer;
