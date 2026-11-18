import AdminRevenueAnalytics from './AdminRevenueAnalytics';

type Props = { t: (key: string) => string };

export default function AdminRevenueReport({ t }: Props) {
  return <section className="gm-admin-revenue-report-page">
    <AdminRevenueAnalytics t={t} />
  </section>;
}
