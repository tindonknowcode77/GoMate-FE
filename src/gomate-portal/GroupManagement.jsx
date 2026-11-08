import PostLifecycleActions from './PostLifecycleActions';
import { Icon, PillButton } from './GoMatePortal';

export function GroupTabs({ group, activeTab, onTab }) {
  const tabs = [['overview', 'Tổng quan', 'grid'], ['participation', 'Thành viên', 'users'], ['chat', 'Chat nhóm', 'chat'], ['itinerary', 'Lịch trình', 'activity'], ['deposits', 'Tiền cọc', 'wallet'], ['offers', 'Thông báo', 'bell'], ['manage', 'Quản lý', 'settings']];
  return <div className="gm-active-tabs gm-group-tabs" role="tablist" aria-label="Nội dung nhóm" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll('[role=tab]')], index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); buttons[next].focus(); buttons[next].click();
  }}>{tabs.map(([id, label, icon]) => <button type="button" role="tab" key={id} id={'group-tab-' + id} aria-controls={'group-panel-' + group.id} aria-selected={activeTab === id} aria-label={label} tabIndex={activeTab === id ? 0 : -1} className={activeTab === id ? 'is-active' : ''} onClick={() => onTab(id)}><Icon name={icon} size={17} /><span>{label}</span>{id === 'participation' && group.requests?.length > 0 && <span className="gm-group-tab-count">{group.requests.length}</span>}</button>)}</div>;
}

export default function GroupManagement({ group, settings, lifecyclePost, onLifecycle, busy, onNavigateStaff }) {
  return <div className="gm-group-management">
    {settings}
    <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Nhân sự phụ trách</h3>{onNavigateStaff && <PillButton variant="secondary" icon="users" onClick={onNavigateStaff}>Phân công nhân sự</PillButton>}</div>{group.managers?.length ? group.managers.map(manager => <div className="gm-group-member-row" key={manager.userId}><span className="gm-group-avatar">{manager.name?.slice(0, 1)}</span><div className="gm-group-member-name"><strong>{manager.name}</strong><small>{manager.title}</small></div></div>) : <p className="gm-group-muted">Chưa phân công nhân sự.</p>}</section>
    {lifecyclePost && onLifecycle && <section className="gm-group-section gm-group-danger-zone"><div className="gm-group-section-heading"><h3>Trạng thái & hiển thị</h3></div><PostLifecycleActions layout="panel" post={lifecyclePost} group={lifecyclePost.groups?.find(item => item.activityId === group.id) || { activityId: group.id, name: group.name }} onAction={onLifecycle} busy={busy} /></section>}
  </div>;
}
