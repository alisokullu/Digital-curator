import { isTr } from '../utils/i18n';

function StatCard({ label, value, tone = 'default' }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InsightsView({ activeFolder, folders, stats }) {
  return (
    <section className="insights-view">
      <div className="stats-grid">
        <StatCard label={isTr ? "Tamamlama oranı" : "Completion rate"} tone="brand" value={`${stats.completionRate}%`} />
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
    </section>
  );
}

export default InsightsView;
