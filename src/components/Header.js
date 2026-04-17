import { isTr } from '../utils/i18n';

function Header({ activeFolder, onMenuOpen, onSearchChange, searchTerm, stats, view }) {
  const titleMap = {
    tasks: activeFolder?.name || (isTr ? 'Görev koleksiyonları' : 'Task collections'),
    insights: isTr ? 'İstatistikler' : 'Insights',
    archive: isTr ? 'Arşiv' : 'Archive',
  };

  const subtitleMap = {
    tasks: isTr 
      ? `${stats.byFolder.length} klasörde ${stats.active} aktif görev.`
      : `${stats.active} active tasks across ${stats.byFolder.length} folders.`,
    insights: isTr
      ? `Aktif panonuz genelinde %${stats.completionRate} tamamlama oranı.`
      : `${stats.completionRate}% completion rate across your active board.`,
    archive: isTr
      ? `Arşivde bekleyen ${stats.archived} öğe.`
      : `${stats.archived} items waiting in the archive.`,
  };

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <button className="menu-button" onClick={onMenuOpen} type="button">
          <span />
          <span />
          <span />
        </button>
        <div>
          <span className="eyebrow">The Digital Curator</span>
          <h1>{titleMap[view]}</h1>
          <p>{subtitleMap[view]}</p>
        </div>
      </div>

      <label className="search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M10.5 4a6.5 6.5 0 1 0 4.048 11.587l4.432 4.433 1.414-1.414-4.433-4.432A6.5 6.5 0 0 0 10.5 4Z"
            fill="currentColor"
          />
        </svg>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={view === 'archive' 
            ? (isTr ? 'Arşivdeki görevleri ara' : 'Search archived tasks') 
            : (isTr ? 'Görevleri ve notları ara' : 'Search tasks and notes')}
          type="search"
          value={searchTerm}
        />
      </label>
    </header>
  );
}

export default Header;
