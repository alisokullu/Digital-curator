import { Activity, Database, FileText, ListChecks, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { isTr } from '../utils/i18n';

const numberFormat = new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US');

const formatNumber = (value) => numberFormat.format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return isTr ? 'Tarih yok' : 'No date';
  return new Date(value).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getRecentTitle = (item) => {
  if (item.type === 'note') return item.title || (isTr ? 'Basliksiz not' : 'Untitled note');
  if (item.type === 'word') return item.english || (isTr ? 'Kelime' : 'Word');
  return item.title || (isTr ? 'Basliksiz gorev' : 'Untitled task');
};

function AdminStat({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <article className={`stat-card admin-stat-card admin-stat-card-${tone}`}>
      <div className="admin-stat-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

function HealthItem({ label, ok, value }) {
  return (
    <div className="admin-health-item">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <span className={`admin-health-pill ${ok ? 'admin-health-ok' : 'admin-health-warn'}`}>
        {ok ? (isTr ? 'OK' : 'OK') : (isTr ? 'Kontrol' : 'Check')}
      </span>
    </div>
  );
}

function AdminView({ error, loading, onRefresh, overview }) {
  const totals = overview?.totals || {};
  const health = overview?.health || {};
  const recentRecords = overview?.recent_records || [];

  if (loading) {
    return <section className="panel-empty">{isTr ? 'Admin ozeti yukleniyor...' : 'Loading admin overview...'}</section>;
  }

  return (
    <section className="admin-view">
      <div className="view-intro">
        <div>
          <span className="eyebrow">{isTr ? 'Yonetim' : 'Administration'}</span>
          <h1>{isTr ? 'Admin Paneli' : 'Admin Panel'}</h1>
        </div>
        <button className="button button-secondary" onClick={onRefresh} type="button">
          <RefreshCw size={16} />
          <span>{isTr ? 'Yenile' : 'Refresh'}</span>
        </button>
      </div>

      {error ? <div className="flash-inline flash-error">{error}</div> : null}

      <div className="stats-grid admin-stats-grid">
        <AdminStat icon={Users} label={isTr ? 'Toplam kullanici' : 'Total users'} tone="brand" value={totals.users} />
        <AdminStat icon={ListChecks} label={isTr ? 'Toplam gorev' : 'Total tasks'} value={totals.tasks} />
        <AdminStat icon={FileText} label={isTr ? 'Toplam not' : 'Total notes'} value={totals.notes} />
        <AdminStat icon={Database} label={isTr ? 'Toplam kelime' : 'Total words'} value={totals.words} />
      </div>

      <div className="admin-layout">
        <article className="panel-card">
          <div className="section-header">
            <div>
              <span className="eyebrow">{isTr ? 'Aktivite' : 'Activity'}</span>
              <h2>{isTr ? 'Son olusturulan kayitlar' : 'Recently created records'}</h2>
            </div>
          </div>

          <div className="admin-activity-list">
            {recentRecords.length ? (
              recentRecords.map((item) => (
                <div className="admin-activity-row" key={`${item.type}-${item.id}`}>
                  <div className="admin-activity-icon">
                    <Activity size={16} />
                  </div>
                  <div>
                    <strong>{getRecentTitle(item)}</strong>
                    <span>
                      {item.type} - {formatDateTime(item.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-copy">{isTr ? 'Henuz aktivite yok.' : 'No activity yet.'}</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-header">
            <div>
              <span className="eyebrow">{isTr ? 'Saglik' : 'Health'}</span>
              <h2>{isTr ? 'RLS ve veri kontrolleri' : 'RLS and data checks'}</h2>
            </div>
          </div>

          <div className="admin-health-list">
            <HealthItem
              label={isTr ? 'RLS aktif tablolar' : 'Tables with RLS'}
              ok={Number(health.rls_enabled_tables || 0) >= 6}
              value={`${formatNumber(health.rls_enabled_tables)} / ${formatNumber(health.checked_tables)}`}
            />
            <HealthItem
              label={isTr ? 'Eksik user_id' : 'Missing user_id'}
              ok={Number(health.rows_missing_user_id || 0) === 0}
              value={formatNumber(health.rows_missing_user_id)}
            />
            <HealthItem
              label={isTr ? 'Rolu olmayan kullanici' : 'Users without role'}
              ok={Number(health.users_without_role || 0) === 0}
              value={formatNumber(health.users_without_role)}
            />
            <HealthItem
              label={isTr ? 'Admin rolu' : 'Admin roles'}
              ok={Number(health.admin_roles || 0) > 0}
              value={formatNumber(health.admin_roles)}
            />
          </div>
        </article>
      </div>

      <article className="panel-card admin-security-note">
        <ShieldCheck size={18} />
        <p>
          {isTr
            ? 'Bu panel Supabase user_roles tablosundaki admin rolu ve get_admin_overview RPC yetkisiyle calisir.'
            : 'This panel is backed by the admin role in Supabase user_roles and the get_admin_overview RPC permission.'}
        </p>
      </article>
    </section>
  );
}

export default AdminView;
