import { CheckSquare, Archive as ArchiveIcon, Activity, Plus, Folder, Briefcase, Calendar, Globe, Trash2 } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'tasks', label: 'Görevler', enLabel: 'Tasks', icon: CheckSquare },
  { id: 'insights', label: 'İstatistikler', enLabel: 'Insights', icon: Activity },
  { id: 'archive', label: 'Arşiv', enLabel: 'Archive', icon: ArchiveIcon },
];

const getFolderIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('work') || lower.includes('iş')) return Briefcase;
  if (lower.includes('daily') || lower.includes('günlük')) return Calendar;
  return Folder;
};

function Sidebar({
  activeFolderId,
  busy,
  folders,
  isAddingFolder,
  isOpen,
  newFolderName,
  onChangeFolderName,
  onClose,
  onCreateFolder,
  onDeleteFolder,
  onOpenFolder,
  onToggleAddFolder,
  onToggleTheme,
  onViewChange,
  theme,
  view,
  onSignOut,
}) {
  const lang = localStorage.getItem('digital-curator-lang') || 'tr';
  const isTr = lang === 'tr';

  const toggleLang = () => {
    localStorage.setItem('digital-curator-lang', isTr ? 'en' : 'tr');
    window.location.reload();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <img src="/logo.png" alt="Digital Curator" style={{ width: 36, height: 36, borderRadius: '8px' }} />
        <div>
          <span className="eyebrow" style={{ marginBottom: 0 }}>Mono Indigo</span>
          <h2 style={{ fontSize: '1.25rem' }}>The Digital Curator ✦</h2>
        </div>
        <button className="sidebar-close" onClick={onClose} type="button">
          {isTr ? 'Kapat' : 'Close'}
        </button>
      </div>

      <nav className="nav-cluster">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-link ${view === item.id ? 'nav-link-active' : ''}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <Icon size={18} className="lucide-icon" />
              <span>{isTr ? item.label : item.enLabel}</span>
            </button>
          );
        })}
      </nav>

      <section className="sidebar-section">
        <div className="collections-header">
          <span>{isTr ? 'Koleksiyonlar' : 'Collections'}</span>
          <button className="add-collection-btn" onClick={onToggleAddFolder} type="button">
            <Plus size={16} />
          </button>
        </div>

        {isAddingFolder ? (
          <form className="folder-form" onSubmit={onCreateFolder} style={{ marginBottom: '1rem' }}>
            <input
              autoFocus
              onChange={(event) => onChangeFolderName(event.target.value)}
              placeholder={isTr ? 'Klasör adı' : 'Collection name'}
              type="text"
              value={newFolderName}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="button button-primary" style={{ flex: 1, padding: '0.6rem' }} disabled={busy} type="submit">
                {isTr ? 'Kaydet' : 'Save'}
              </button>
              <button className="button button-ghost" style={{ padding: '0.6rem' }} onClick={onToggleAddFolder} type="button">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="folder-list">
          {folders.length ? (
            folders.map((folder) => {
              const FolderIcon = getFolderIcon(folder.name);
              return (
                <div className="folder-row" key={folder.id}>
                  <button
                    className={`folder-link ${activeFolderId === folder.id && view === 'tasks' ? 'folder-link-active' : ''}`}
                    onClick={() => onOpenFolder(folder.id)}
                    type="button"
                  >
                    <FolderIcon size={18} className="lucide-icon" />
                    <span>{folder.name}</span>
                  </button>
                  <button
                    aria-label={`Delete ${folder.name}`}
                    className="folder-delete"
                    onClick={() => onDeleteFolder(folder.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="empty-copy">{isTr ? 'Henüz klasör yok.' : 'No collections yet.'}</p>
          )}

          {!isAddingFolder && (
            <button className="new-collection-btn-large" onClick={onToggleAddFolder} type="button">
              <Plus size={18} />
              {isTr ? 'Yeni Koleksiyon' : 'New Collection'}
            </button>
          )}
        </div>
      </section>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="theme-toggle" onClick={onToggleTheme} type="button">
          <span>{theme === 'light' ? (isTr ? 'Karanlık mod' : 'Dark mode') : (isTr ? 'Aydınlık mod' : 'Light mode')}</span>
          <strong>{theme === 'light' ? (isTr ? 'Açık' : 'On') : (isTr ? 'Kapalı' : 'Off')}</strong>
        </button>

        <button className="theme-toggle" onClick={toggleLang} type="button">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} className="lucide-icon" /> 
            {isTr ? 'Dil' : 'Language'}
          </span>
          <strong>{isTr ? 'Türkçe' : 'English'}</strong>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
