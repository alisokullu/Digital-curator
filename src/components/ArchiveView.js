import { formatDateTime } from '../utils/formatters';
import { isTr } from '../utils/i18n';

function ArchiveView({ archivedTasks, onDeleteTask, onEmptyArchive, onRestoreTask }) {
  if (!archivedTasks.length) {
    return (
      <section className="panel-empty">
        <h2>{isTr ? 'Arşiv temiz.' : 'Archive is clean.'}</h2>
        <p>{isTr ? 'Silinen görevler buraya düşer. İhtiyacınız olduğunda geri yükleyebilirsiniz.' : 'Soft-deleted tasks land here. Restore them whenever you need a second pass.'}</p>
      </section>
    );
  }

  return (
    <section className="archive-view">
      <div className="section-header">
        <div>
          <span className="eyebrow">{isTr ? 'Arşiv' : 'Archive'}</span>
          <h2>{isTr ? 'Çöp Kutusu' : 'Trash bin'}</h2>
        </div>
        <button className="button button-ghost button-danger" onClick={onEmptyArchive} type="button">
          {isTr ? 'Arşivi boşalt' : 'Empty archive'}
        </button>
      </div>

      <div className="archive-list">
        {archivedTasks.map((task) => (
          <article className="archive-card" key={task.id}>
            <div>
              <h3>{task.title}</h3>
              <p>{task.description || (isTr ? 'Bu görev için açıklama kaydedilmedi.' : 'No description saved for this task.')}</p>
              <div className="task-meta">
                <span>{task.folders?.name || (isTr ? 'Bilinmeyen klasör' : 'Unknown folder')}</span>
                <span>{formatDateTime(task.updated_at || task.created_at)}</span>
              </div>
            </div>

            <div className="archive-actions">
              <button className="button button-secondary" onClick={() => onRestoreTask(task)} type="button">
                {isTr ? 'Geri Yükle' : 'Restore'}
              </button>
              <button
                className="button button-ghost button-danger"
                onClick={() => onDeleteTask(task.id)}
                type="button"
              >
                {isTr ? 'Kalıcı olarak sil' : 'Delete forever'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ArchiveView;
