import { isTr } from '../utils/i18n';
import { Plus, Repeat, Info } from 'lucide-react';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end', padding: '0 0.5rem 0.5rem 0' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Repeat size={14} style={{ position: 'absolute', left: '0.5rem', color: 'var(--text-muted)' }} />
            <select
              className="composer-recurrence-select"
              value={draftTask.recurrence || 'none'}
              onChange={(e) => onChangeDraft((curr) => ({ ...curr, recurrence: e.target.value }))}
              style={{ padding: '0.5rem 0.5rem 0.5rem 1.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value="none">{isTr ? 'Tek Seferlik' : 'One-time'}</option>
              <option value="daily">{isTr ? 'Günlük Rutin' : 'Daily Routine'}</option>
              <option value="weekly">{isTr ? 'Haftalık Rutin' : 'Weekly Routine'}</option>
              <option value="monthly">{isTr ? 'Aylık Rutin' : 'Monthly Routine'}</option>
            </select>
          </div>
          <div className="info-tooltip-wrapper">
            <Info size={16} className="info-icon" />
            <div className="info-tooltip">
              <strong>{isTr ? 'Rutin Sıfırlama Mantığı' : 'Routine Reset Logic'}</strong>
              <p>• {isTr ? 'Günlük: Her gece 00:00' : 'Daily: Every night 00:00'}</p>
              <p>• {isTr ? 'Haftalık: Pazartesi 00:00' : 'Weekly: Monday 00:00'}</p>
              <p>• {isTr ? 'Aylık: Ayın 1\'i 00:00' : 'Monthly: 1st of the month 00:00'}</p>
            </div>
          </div>
          <button 
            className="composer-submit" 
            disabled={!hasFolder || !draftTask.title.trim() || busy} 
            type="submit"
            aria-label={isTr ? 'Görev Ekle' : 'Add Task'}
            style={{ margin: 0 }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
      </form>
    </section>
  );
}

export default TaskComposer;
