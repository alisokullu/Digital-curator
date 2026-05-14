import { isTr } from '../utils/i18n';

function Header({ activeFolder, onMenuOpen, onSearchChange, searchTerm, stats, view }) {
  const titleMap = {
    tasks: activeFolder?.name || (isTr ? 'Gorev koleksiyonlari' : 'Task collections'),
    notes: isTr ? 'Notlar' : 'Notes',
    vocabulary: isTr ? 'Kelimeler' : 'Vocabulary',
    insights: isTr ? 'Istatistikler' : 'Insights',
    archive: isTr ? 'Arsiv' : 'Archive',
    admin: isTr ? 'Admin Paneli' : 'Admin Panel',
  };

  const subtitleMap = {
    tasks: isTr
      ? `${stats.byFolder.length} klasorde ${stats.active} aktif gorev.`
      : `${stats.active} active tasks across ${stats.byFolder.length} folders.`,
    notes: isTr
      ? 'Notlariniz ve fikirleriniz tek yerde.'
      : 'Your notes and ideas in one place.',
    vocabulary: isTr
      ? 'Kelime kartlariniz ve gunluk rutininiz.'
      : 'Your word cards and daily routine.',
    insights: isTr
      ? `Aktif panonuz genelinde %${stats.completionRate} tamamlama orani.`
      : `${stats.completionRate}% completion rate across your active board.`,
    archive: isTr
      ? `Arsivde bekleyen ${stats.archived} oge.`
      : `${stats.archived} items waiting in the archive.`,
    admin: isTr
      ? 'Sistem geneli metrikler ve veri sagligi.'
      : 'System-wide metrics and data health.',
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
            ? (isTr ? 'Arsivdeki gorevleri ara' : 'Search archived tasks')
            : (isTr ? 'Gorevleri ve notlari ara' : 'Search tasks and notes')}
          type="search"
          value={searchTerm}
        />
      </label>
    </header>
  );
}

export default Header;
