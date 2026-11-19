import AdminRevenueAnalytics from './AdminRevenueAnalytics';
import { useState } from 'react';
import AdminBusinessPicker, { BusinessOption } from './AdminBusinessPicker';

type Props = { t: (key: string) => string };

export default function AdminRevenueReport({ t }: Props) {
  const [business, setBusiness] = useState<BusinessOption | null>(null);
  return <section className="gm-admin-revenue-report-page">
    <AdminBusinessPicker value={business} onChange={setBusiness} t={t} />
    <AdminRevenueAnalytics t={t} businessId={business?.id} company={business?.company} />
  </section>;
}
