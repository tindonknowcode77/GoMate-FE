import { Icon, StatusPill } from './GoMatePortal';

const newestFirst = (left, right) => (Date.parse(right.createdAt || '') || 0) - (Date.parse(left.createdAt || '') || 0);

function QueuePanel({ title, count, items, kind, emptyText, onNavigate, t, formatDate }) {
  const isBusiness = kind === 'businesses';
  return <section className="gm-admin-overview-queue">
    <header className="gm-admin-overview-queue-heading">
      <div><span className="gm-eyebrow">{t('Review queue')}</span><h3>{t(title)}</h3></div>
      <span className="gm-admin-overview-queue-count">{count}</span>
    </header>
    {items.length ? <ul className="gm-admin-overview-list">
      {items.slice(0, 4).map(row => <li key={row.id}>
        <span className={`gm-admin-overview-row-icon ${isBusiness ? 'is-business' : 'is-post'}`}><Icon name={isBusiness ? 'business' : 'activity'} size={17} /></span>
        <span className="gm-admin-overview-row-copy">
          <strong>{isBusiness ? row.company : row.title}</strong>
          <small>{isBusiness ? row.category || t('Business') : row.businessName || t('Business post')}</small>
          {(row.createdAt || row.event?.startsAt) && <small>{formatDate(row.createdAt || row.event?.startsAt)}</small>}
        </span>
        <StatusPill tone="orange">{t('Pending')}</StatusPill>
      </li>)}
    </ul> : <div className="gm-admin-overview-empty"><Icon name="check" size={17} /><span>{t(emptyText)}</span></div>}
    <button type="button" className="gm-admin-overview-queue-link" onClick={() => onNavigate(kind)}>
      {t('View all')}<Icon name="arrow" size={14} />
    </button>
  </section>;
}

export default function AdminOverview({ metrics, applications, posts, onNavigate, t, formatDate }) {
  const pendingApplications = applications.filter(row => row.status === 'pending').sort(newestFirst);
  const pendingPosts = posts.filter(row => row.status === 'pending').sort(newestFirst);
  const stats = [
    { label: 'Pending business applications', value: metrics.pendingBusinesses ?? pendingApplications.length, icon: 'business', tone: 'emerald', target: 'businesses' },
    { label: 'Pending posts', value: metrics.pendingPosts ?? pendingPosts.length, icon: 'edit', tone: 'amber', target: 'posts' },
    { label: 'Total accounts', value: metrics.users ?? 0, icon: 'users', tone: 'blue', target: 'users' },
  ];

  return <div className="gm-admin-overview">
    <div className="gm-admin-overview-stats">
      {stats.map(item => <button type="button" className={`gm-admin-overview-stat gm-admin-overview-stat--${item.tone}`} key={item.target} onClick={() => onNavigate(item.target)}>
        <span className="gm-admin-overview-stat-icon"><Icon name={item.icon} size={19} /></span>
        <span className="gm-admin-overview-stat-label">{t(item.label)}</span>
        <strong>{Number(item.value).toLocaleString('vi-VN')}</strong>
        <span className="gm-admin-overview-stat-link">{t('View all')}<Icon name="arrow" size={13} /></span>
      </button>)}
    </div>
    <div className="gm-admin-overview-queues">
      <QueuePanel title="Business applications" count={pendingApplications.length} items={pendingApplications} kind="businesses" emptyText="No pending business applications" onNavigate={onNavigate} t={t} formatDate={formatDate} />
      <QueuePanel title="Pending posts" count={pendingPosts.length} items={pendingPosts} kind="posts" emptyText="No posts waiting for review" onNavigate={onNavigate} t={t} formatDate={formatDate} />
    </div>
  </div>;
}
