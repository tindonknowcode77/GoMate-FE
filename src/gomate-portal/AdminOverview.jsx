import AdminStats from './AdminStats';

export default function AdminOverview({ onNavigate, onAddAdministrator, t, formatDate }) {
  return <div className="gm-admin-overview">
    <AdminStats onNavigate={onNavigate} onAddAdministrator={onAddAdministrator} t={t} formatDate={formatDate} />
  </div>;
}
