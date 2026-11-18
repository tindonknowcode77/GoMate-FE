import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type RevenueType = 'monthly' | 'yearly';
type RevenueBucket = { key: string; label: string; revenue: number; settledPayouts: number; transactions: number };
type RevenueSource = { key: string; label: string; amount: number };
type RevenueData = {
  type: RevenueType;
  year: number;
  month?: number;
  currency: 'VND';
  totalRevenue: number;
  previousRevenue: number;
  growthPercentage: number | null;
  comparison: 'MoM' | 'YoY';
  settledPayouts: number;
  transactions: number;
  buckets: RevenueBucket[];
  sources: RevenueSource[];
};
type Props = { t: (key: string) => string };
type RequestState = { key: string; error: string };

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const number = (value: number) => Number(value || 0).toLocaleString('vi-VN');
const compactMoney = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}k`;
  return String(value);
};

function RevenueChart({ buckets, t }: { buckets: RevenueBucket[]; t: Props['t'] }) {
  const width = 760, height = 250, left = 54, right = 12, top = 14, bottom = 36;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxRevenue = Math.max(1, ...buckets.map(item => item.revenue));
  const slotWidth = plotWidth / Math.max(1, buckets.length);
  const barWidth = Math.max(3, Math.min(24, slotWidth * 0.58));
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map(ratio => maxRevenue * ratio);
  const labelEvery = buckets.length <= 14 ? 1 : Math.ceil(buckets.length / 9);

  return <div className="gm-admin-revenue-chart-wrap">
    <svg className="gm-admin-revenue-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('Recognized revenue chart')}>
      {tickValues.map((value, index) => {
        const y = top + plotHeight - plotHeight * index / (tickValues.length - 1);
        return <g key={index}>
          <line x1={left} x2={width - right} y1={y} y2={y} className="gm-admin-chart-gridline" />
          <text x={left - 8} y={y + 3} textAnchor="end" className="gm-admin-chart-axis-label">{compactMoney(value)}</text>
        </g>;
      })}
      {buckets.map((bucket, index) => {
        const x = left + slotWidth * index + (slotWidth - barWidth) / 2;
        const barHeight = bucket.revenue ? Math.max(2, bucket.revenue / maxRevenue * plotHeight) : 0;
        const labelVisible = index % labelEvery === 0 || index === buckets.length - 1;
        return <g key={bucket.key}>
          <rect x={x} y={top + plotHeight - barHeight} width={barWidth} height={barHeight} rx="3" className="gm-admin-revenue-bar">
            <title>{`${bucket.label}: ${formatMoney(bucket.revenue)} · ${bucket.transactions} ${t('transactions')}`}</title>
          </rect>
          {labelVisible && <text x={left + slotWidth * index + slotWidth / 2} y={height - 11} textAnchor="middle" className="gm-admin-chart-axis-label">{bucket.label}</text>}
        </g>;
      })}
    </svg>
  </div>;
}

export default function AdminRevenueAnalytics({ t }: Props) {
  const [type, setType] = useState<RevenueType>('monthly');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState<RevenueData | null>(null);
  const [requestState, setRequestState] = useState<RequestState>({ key: '', error: '' });
  const [retry, setRetry] = useState(0);
  const requestKey = `${type}:${year}:${month}:${retry}`;
  const loading = requestState.key !== requestKey;
  const error = loading ? '' : requestState.error;
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 7 }, (_, index) => currentYear - index), [currentYear]);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ type, year: String(year) });
    if (type === 'monthly') params.set('month', String(month));
    api<RevenueData>(`/portal/admin/analytics/revenue?${params}`, { timeoutMs: 15000 })
      .then(value => { if (alive) { setData(value); setRequestState({ key: requestKey, error: '' }); } })
      .catch(reason => { if (alive) setRequestState({ key: requestKey, error: reason instanceof Error ? reason.message : 'Không tải được doanh thu.' }); });
    return () => { alive = false; };
  }, [type, year, month, requestKey]);

  const growth = data?.growthPercentage;
  const growthLabel = growth === null || growth === undefined ? t('No comparison data') : `${growth > 0 ? '+' : ''}${growth.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
  const growthTone = growth === null || growth === undefined ? 'is-neutral' : growth >= 0 ? 'is-up' : 'is-down';

  return <section className="gm-admin-dashboard-panel gm-admin-revenue-panel" aria-busy={loading}>
    <header className="gm-admin-dashboard-panel-heading gm-admin-revenue-heading">
      <div><span className="gm-eyebrow">{t('FINANCIAL REPORT')}</span><h3>{t('Revenue analytics')}</h3><p>{t('Recognized platform fees from completed business payouts')}</p></div>
      <div className="gm-admin-revenue-filters">
        <div className="gm-admin-period-control" role="group" aria-label={t('Revenue period')}>
          <button type="button" aria-pressed={type === 'monthly'} onClick={() => setType('monthly')}>{t('Monthly')}</button>
          <button type="button" aria-pressed={type === 'yearly'} onClick={() => setType('yearly')}>{t('Yearly')}</button>
        </div>
        {type === 'monthly' && <label><span>{t('Month')}</span><select aria-label={t('Month')} className="gm-simple-input" value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{t('Month')} {value}</option>)}</select></label>}
        <label><span>{t('Year')}</span><select aria-label={t('Year')} className="gm-simple-input" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
        <button type="button" className="gm-btn gm-btn--secondary" disabled={loading} onClick={() => setRetry(value => value + 1)}>{t('Refresh')}</button>
      </div>
    </header>
    {error && <p className="gm-admin-stats-error" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>{t('Retry')}</button></p>}

    <div className="gm-admin-revenue-summary">
      <article className="gm-admin-revenue-summary-card is-primary"><span>{t('Recognized revenue')}</span><strong>{data ? formatMoney(data.totalRevenue) : '—'}</strong><small>{number(data?.transactions ?? 0)} {t('completed payouts')}</small></article>
      <article className="gm-admin-revenue-summary-card"><span>{t('Previous period revenue')}</span><strong>{data ? formatMoney(data.previousRevenue) : '—'}</strong><small>{data?.comparison === 'YoY' ? t('Same period last year') : t('Previous month')}</small></article>
      <article className={`gm-admin-revenue-summary-card ${growthTone}`}><span>{t(data?.comparison === 'YoY' ? 'Year over year growth' : 'Month over month growth')}</span><strong>{data ? growthLabel : '—'}</strong><small>{t('Compared with the previous complete period')}</small></article>
      <article className="gm-admin-revenue-summary-card"><span>{t('Business payouts completed')}</span><strong>{data ? formatMoney(data.settledPayouts) : '—'}</strong><small>{t('Net transferred to businesses')}</small></article>
    </div>

    <RevenueChart buckets={data?.buckets ?? []} t={t} />

    <div className="gm-admin-revenue-sources">
      <div><h4>{t('Revenue sources')}</h4><p>{t('Only completed payout fees are counted as platform revenue.')}</p></div>
      {data?.sources.map(source => <div className="gm-admin-revenue-source" key={source.key}><span><i aria-hidden="true" />{t(source.label)}</span><strong>{formatMoney(source.amount)}</strong></div>)}
    </div>
  </section>;
}
