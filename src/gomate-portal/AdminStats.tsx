import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Icon, StatusPill } from './GoMatePortal';

type Period = 'week' | 'month';
type TrendBucket = { start: string; label: string; users: number; activities: number };
type Growth = { current: number; previous: number; percentage: number | null };
type PendingBusiness = { id: string; ownerId: string; company: string; category: string; createdAt: string; status: string };
type PendingPost = { id: string; ownerId: string; title: string; businessName: string; createdAt: string; status: string };
type UpcomingActivity = { id: string; title: string; hostName: string; category: string; startsAt: string; location: string; status: string };
type RecentActivity = { id: string; kind: 'user-registered' | 'business-submitted' | 'post-created' | 'activity-created'; actorId: string; actorName: string; detail: string; status?: string; createdAt: string };
type DashboardData = {
  users: number;
  usersByRole: { member: number; host: number; business: number; admin: number };
  activities: { active: number; completed: number; pendingReview: number; upcoming: number };
  pendingBusinesses: number;
  pendingPosts: number;
  trend: { period: Period; buckets: TrendBucket[] };
  growth: { users: Growth; activities: Growth };
  pendingBusinessItems: PendingBusiness[];
  pendingPostItems: PendingPost[];
  upcomingActivityItems: UpcomingActivity[];
  activityCategories: { category: string; count: number }[];
  recentActivity: RecentActivity[];
};
type PerformanceData = {
  lateArrival: { late: number; present: number; total: number; rate: number };
  businessCancellation: { total: number; rejected: number; withdrawn: number; cancelledActivities: number; cancelledOrRejected: number; rate: number };
  topLocations: { name: string; area: string; activityCount: number; participantCount: number }[];
};
type Props = {
  onNavigate: (section: string) => void;
  onAddAdministrator: () => void;
  t: (key: string) => string;
  formatDate: (value: string) => string;
};
type RequestState = { key: string; error: string };

const number = (value: number) => value.toLocaleString('vi-VN');
const percent = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

function GrowthNote({ value, t }: { value: Growth; t: Props['t'] }) {
  const direction = value.percentage === null ? 'is-neutral' : value.percentage >= 0 ? 'is-up' : 'is-down';
  const label = value.percentage === null ? t('New activity') : percent(value.percentage);
  return <small className={`gm-admin-growth-indicator ${direction}`} title={`${number(value.current)} ${t('most recent completed period')} · ${number(value.previous)} ${t('previous completed period')}`}>
    <span aria-hidden="true">{value.percentage !== null && value.percentage < 0 ? '↓' : '↑'}</span>{label} <span>{t('vs previous period')}</span>
  </small>;
}

function exportDashboard(data: DashboardData) {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), dashboard: data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `gomate-admin-dashboard-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function QueuePanel({ title, count, items, kind, emptyText, onNavigate, t, formatDate }: {
  title: string; count: number; items: (PendingBusiness | PendingPost)[]; kind: 'businesses' | 'posts';
  emptyText: string; onNavigate: Props['onNavigate']; t: Props['t']; formatDate: Props['formatDate'];
}) {
  const isBusiness = kind === 'businesses';
  return <section className="gm-admin-dashboard-panel gm-admin-dashboard-queue">
    <header className="gm-admin-dashboard-panel-heading">
      <div><span className="gm-eyebrow">{t('Pending workflow')}</span><h3>{t(title)}</h3></div>
      <span className="gm-admin-overview-queue-count">{number(count)}</span>
    </header>
    {items.length ? <ul className="gm-admin-overview-list">
      {items.slice(0, 5).map(row => <li key={row.id}>
        <span className={`gm-admin-overview-row-icon ${isBusiness ? 'is-business' : 'is-post'}`}><Icon name={isBusiness ? 'business' : 'activity'} size={17} /></span>
        <span className="gm-admin-overview-row-copy">
          <strong>{isBusiness ? (row as PendingBusiness).company : (row as PendingPost).title}</strong>
          <small>{isBusiness ? (row as PendingBusiness).category || t('Business') : (row as PendingPost).businessName || t('Business post')}</small>
          <small>{formatDate(row.createdAt)}</small>
        </span>
        <StatusPill tone="orange" status="pending">{t('Pending')}</StatusPill>
      </li>)}
    </ul> : <div className="gm-admin-overview-empty"><Icon name="check" size={17} /><span>{t(emptyText)}</span></div>}
    <button type="button" className="gm-admin-overview-queue-link" onClick={() => onNavigate(kind)}>{t('View all')}<Icon name="arrow" size={14} /></button>
  </section>;
}

export default function AdminStats({ onNavigate, onAddAdministrator, t, formatDate }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<DashboardData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [requestState, setRequestState] = useState<RequestState>({ key: '', error: '' });
  const [performanceRequestState, setPerformanceRequestState] = useState<RequestState>({ key: '', error: '' });
  const [retry, setRetry] = useState(0);
  const requestKey = `${period}:${retry}`;
  const loading = requestState.key !== requestKey;
  const error = loading ? '' : requestState.error;
  const performanceLoading = performanceRequestState.key !== requestKey;
  const performanceError = performanceLoading ? '' : performanceRequestState.error;

  useEffect(() => {
    let alive = true;
    api<DashboardData>(`/portal/admin/dashboard-stats?period=${period}`, { timeoutMs: 15000 })
      .then(value => { if (alive) { setData(value); setRequestState({ key: requestKey, error: '' }); } })
      .catch(reason => { if (alive) setRequestState({ key: requestKey, error: reason instanceof Error ? reason.message : 'Không tải được tổng quan.' }); });
    return () => { alive = false; };
  }, [period, requestKey]);

  useEffect(() => {
    let alive = true;
    api<PerformanceData>('/portal/admin/analytics/performance', { timeoutMs: 15000 })
      .then(value => { if (alive) { setPerformance(value); setPerformanceRequestState({ key: requestKey, error: '' }); } })
      .catch(reason => { if (alive) setPerformanceRequestState({ key: requestKey, error: reason instanceof Error ? reason.message : 'Không tải được chỉ số hiệu suất.' }); });
    return () => { alive = false; };
  }, [requestKey]);

  useEffect(() => {
    const timer = setInterval(() => setRetry(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.buckets.flatMap(bucket => [bucket.users, bucket.activities]) ?? [])), [data]);
  const maxCategory = useMemo(() => Math.max(1, ...(data?.activityCategories.map(item => item.count) ?? [])), [data]);
  const roleStats = [
    { label: 'Members', value: data?.usersByRole.member ?? 0, color: 'member' },
    { label: 'Hosts', value: data?.usersByRole.host ?? 0, color: 'host' },
    { label: 'Businesses', value: data?.usersByRole.business ?? 0, color: 'business' },
    { label: 'Administrators', value: data?.usersByRole.admin ?? 0, color: 'admin' },
  ];
  const pendingTotal = (data?.pendingPosts ?? 0) + (data?.activities.pendingReview ?? 0);

  return <section className="gm-admin-dashboard-home" aria-busy={loading}>
    <div className="gm-admin-dashboard-heading">
      <div><span className="gm-eyebrow">{t('ADMINISTRATION')}</span><h2>{t('Dashboard overview')}</h2><p>{t('Live totals and account activity')}</p></div>
      <div className="gm-admin-heading-actions">
        <button type="button" className="gm-btn gm-btn--secondary" disabled={loading} onClick={() => setRetry(value => value + 1)}><Icon name="refresh" size={15} />{t('Refresh')}</button>
        <button type="button" className="gm-btn gm-btn--secondary" disabled={!data} onClick={() => data && exportDashboard(data)}><Icon name="download" size={15} />{t('Export report')}</button>
      </div>
    </div>
    {error && <p className="gm-admin-stats-error" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>{t('Retry')}</button></p>}

    <section className="gm-admin-dashboard-section" aria-label={t('System metrics')}>
      <div className="gm-admin-dashboard-kpis">
        <button type="button" className="gm-admin-kpi gm-admin-kpi--users" onClick={() => onNavigate('users')}>
          <span>{t('Total accounts')}</span><strong>{number(data?.users ?? 0)}</strong>
          <span className="gm-admin-kpi-detail">{number(data?.usersByRole.member ?? 0)} {t('members')} · {number(data?.usersByRole.host ?? 0)} {t('hosts')}</span>
          {data && <GrowthNote value={data.growth.users} t={t} />}
        </button>
        <button type="button" className="gm-admin-kpi gm-admin-kpi--business" onClick={() => onNavigate('businesses')}>
          <span>{t('Pending business verification')}</span><strong>{number(data?.pendingBusinesses ?? 0)}</strong>
          <span className="gm-admin-kpi-detail">{t('Awaiting review')}</span>
        </button>
        <button type="button" className="gm-admin-kpi gm-admin-kpi--posts" onClick={() => onNavigate('posts')}>
          <span>{t('Posts and activities pending')}</span><strong>{number(pendingTotal)}</strong>
          <span className="gm-admin-kpi-detail">{number(data?.pendingPosts ?? 0)} {t('posts')} · {number(data?.activities.pendingReview ?? 0)} {t('activities')}</span>
        </button>
        <button type="button" className="gm-admin-kpi gm-admin-kpi--activities" onClick={() => onNavigate('posts')}>
          <span>{t('Active and upcoming activities')}</span><strong>{number(data?.activities.active ?? 0)}<small> / {number(data?.activities.upcoming ?? 0)}</small></strong>
          <span className="gm-admin-kpi-detail">{t('Active now')} · {t('Next 7 days')}</span>
          {data && <GrowthNote value={data.growth.activities} t={t} />}
        </button>
      </div>
      <div className="gm-admin-role-strip" aria-label={t('Accounts by role')}>
        {roleStats.map(item => <button type="button" key={item.color} className={`gm-admin-role-metric is-${item.color}`} onClick={() => onNavigate('users')}>
          <span>{t(item.label)}</span><strong>{number(item.value)}</strong>
        </button>)}
      </div>
    </section>

    <section className="gm-admin-performance-section">
      <header className="gm-admin-dashboard-panel-heading"><div><span className="gm-eyebrow">{t('OPERATIONAL QUALITY')}</span><h3>{t('Performance and operations')}</h3><p>{t('Calculated from completed attendance and business event records')}</p></div></header>
      {performanceError && <p className="gm-admin-stats-error" role="alert">{performanceError}</p>}
      <div className="gm-admin-performance-grid" aria-busy={performanceLoading}>
        <article className="gm-admin-performance-card gm-admin-performance-card--late">
          <div><span>{t('Late arrival rate')}</span><strong>{performance ? `${performance.lateArrival.rate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—'}</strong></div>
          <p>{number(performance?.lateArrival.late ?? 0)} {t('late arrivals')} / {number(performance?.lateArrival.total ?? 0)} {t('attended members')}</p>
          <small>{t('Present and late statuses only; hosts are excluded.')}</small>
        </article>
        <article className="gm-admin-performance-card gm-admin-performance-card--cancellation">
          <div><span>{t('Business cancellation rate')}</span><strong>{performance ? `${performance.businessCancellation.rate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—'}</strong></div>
          <p>{number(performance?.businessCancellation.cancelledOrRejected ?? 0)} {t('cancelled or rejected')} / {number(performance?.businessCancellation.total ?? 0)} {t('business event entries')}</p>
          <small>{number(performance?.businessCancellation.cancelledActivities ?? 0)} {t('cancelled events')} · {number(performance?.businessCancellation.rejected ?? 0)} {t('rejected')} · {number(performance?.businessCancellation.withdrawn ?? 0)} {t('withdrawn')}</small>
        </article>
        <section className="gm-admin-dashboard-panel gm-admin-top-locations">
          <header className="gm-admin-dashboard-panel-heading"><div><h4>{t('Top locations')}</h4><p>{t('Ranked by activity and participant volume')}</p></div></header>
          {performance?.topLocations.length ? <ol>{performance.topLocations.slice(0, 5).map((location, index) => <li key={`${location.name}:${location.area}`}>
            <span className="gm-admin-location-rank">{index + 1}</span><span className="gm-admin-location-copy"><strong>{location.name}</strong><small>{location.area || t('Area not specified')}</small></span>
            <span className="gm-admin-location-counts"><strong>{number(location.participantCount)}</strong><small>{number(location.activityCount)} {t('activities')}</small></span>
          </li>)}</ol> : <p className="gm-admin-growth-empty">{performanceLoading ? t('Loading statistics') : t('No activity locations')}</p>}
        </section>
      </div>
    </section>

    <div className="gm-admin-dashboard-analytics">
      <section className="gm-admin-dashboard-panel gm-admin-chart-panel">
        <header className="gm-admin-dashboard-panel-heading">
          <div><h3>{t('User registrations')}</h3><p>{t(period === 'week' ? 'Last 8 weeks' : 'Last 12 months')}</p></div>
          <div className="gm-admin-period-control" role="group" aria-label={t('Growth period')}>
            <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>{t('Weekly')}</button>
            <button type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>{t('Monthly')}</button>
          </div>
        </header>
        <div className="gm-admin-growth-legend"><span className="is-users">{t('Users')}</span><span className="is-activities">{t('Activities')}</span></div>
        <div className="gm-admin-growth-bars" role="img" aria-label={t('User and activity growth chart')}>
          {(data?.trend.buckets ?? []).map(bucket => <div className="gm-admin-growth-bucket" key={bucket.start}>
            <div className="gm-admin-growth-bar-pair">
              <span className="gm-admin-growth-bar is-users" title={`${t('Users')}: ${number(bucket.users)}`} style={{ height: `${Math.max(bucket.users ? 5 : 0, bucket.users / maxTrend * 100)}%` }} />
              <span className="gm-admin-growth-bar is-activities" title={`${t('Activities')}: ${number(bucket.activities)}`} style={{ height: `${Math.max(bucket.activities ? 5 : 0, bucket.activities / maxTrend * 100)}%` }} />
            </div><time dateTime={bucket.start}>{bucket.label}</time>
          </div>)}
        </div>
        <p className="gm-admin-growth-note" aria-live="polite">{loading ? t('Loading statistics') : t('Statistics are grouped by Vietnam time')}</p>
      </section>

      <section className="gm-admin-dashboard-panel gm-admin-category-panel">
        <header className="gm-admin-dashboard-panel-heading"><div><h3>{t('Activity categories')}</h3><p>{t('Distribution across published and pending activities')}</p></div></header>
        {data?.activityCategories.length ? <ol className="gm-admin-category-list">{data.activityCategories.slice(0, 8).map(item => <li key={item.category}>
          <span title={item.category}>{item.category}</span><div className="gm-admin-category-track"><span style={{ width: `${item.count / maxCategory * 100}%` }} /></div><strong>{number(item.count)}</strong>
        </li>)}</ol> : <p className="gm-admin-growth-empty">{loading ? t('Loading statistics') : t('No activity data')}</p>}
      </section>
    </div>

    <div className="gm-admin-dashboard-queues">
      <QueuePanel title="Business applications" count={data?.pendingBusinesses ?? 0} items={data?.pendingBusinessItems ?? []} kind="businesses" emptyText="No pending business applications" onNavigate={onNavigate} t={t} formatDate={formatDate} />
      <QueuePanel title="Pending posts" count={data?.pendingPosts ?? 0} items={data?.pendingPostItems ?? []} kind="posts" emptyText="No posts waiting for review" onNavigate={onNavigate} t={t} formatDate={formatDate} />
    </div>

    <div className="gm-admin-dashboard-lower">
      <section className="gm-admin-dashboard-panel gm-admin-upcoming-panel">
        <header className="gm-admin-dashboard-panel-heading"><div><span className="gm-eyebrow">{t('NEXT 7 DAYS')}</span><h3>{t('Upcoming activities')}</h3></div><span className="gm-admin-overview-queue-count">{number(data?.activities.upcoming ?? 0)}</span></header>
        {data?.upcomingActivityItems.length ? <ul className="gm-admin-upcoming-list">{data.upcomingActivityItems.map(item => <li key={item.id}>
          <span className="gm-admin-upcoming-date">{new Date(item.startsAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
          <span><strong>{item.title}</strong><small>{item.category} · {item.hostName} · {item.location}</small></span>
          <StatusPill tone="green" status="published">{t('Scheduled')}</StatusPill>
        </li>)}</ul> : <div className="gm-admin-overview-empty"><Icon name="check" size={17} /><span>{t('No upcoming activities')}</span></div>}
        <button type="button" className="gm-admin-overview-queue-link" onClick={() => onNavigate('posts')}>{t('View all')}<Icon name="arrow" size={14} /></button>
      </section>

      <section className="gm-admin-dashboard-panel gm-admin-recent-panel">
        <header className="gm-admin-dashboard-panel-heading"><div><span className="gm-eyebrow">{t('SYSTEM ACTIVITY')}</span><h3>{t('Recent activity')}</h3></div></header>
        {data?.recentActivity.length ? <ol className="gm-admin-timeline">{data.recentActivity.map(item => <li key={item.id}>
          <span className={`gm-admin-timeline-icon is-${item.kind}`}><Icon name={item.kind === 'user-registered' ? 'users' : item.kind === 'business-submitted' ? 'business' : 'activity'} size={15} /></span>
          <span className="gm-admin-timeline-copy"><strong>{item.actorName}</strong><span>{t(item.kind)}</span><small>{item.detail}</small></span>
          <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
        </li>)}</ol> : <div className="gm-admin-overview-empty"><span>{t('No recent activity')}</span></div>}
      </section>
    </div>

    <section className="gm-admin-quick-actions">
      <div><span className="gm-eyebrow">{t('QUICK ACTIONS')}</span><h3>{t('Go to a workspace')}</h3></div>
      <button type="button" className="gm-btn gm-btn--secondary" onClick={() => onNavigate('businesses')}><Icon name="business" size={15} />{t('Review businesses')}</button>
      <button type="button" className="gm-btn gm-btn--secondary" onClick={() => onNavigate('posts')}><Icon name="edit" size={15} />{t('Review posts')}</button>
      <button type="button" className="gm-btn gm-btn--secondary" onClick={() => onNavigate('users')}><Icon name="users" size={15} />{t('Manage accounts')}</button>
      <button type="button" className="gm-btn gm-btn--primary" onClick={onAddAdministrator}><Icon name="plus" size={15} />{t('Add administrator')}</button>
    </section>
  </section>;
}
