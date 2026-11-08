import { useEffect, useRef, useState } from 'react';
import { Icon, PillButton, StatusPill } from './GoMatePortal';
import { groupStatus, shortDate } from './BusinessGroupBrowser';

export function GroupActionBar({ group, busy, onCommand, onTab }) {
  const [confirm, setConfirm] = useState(null), dialog = useRef(null);
  const [label, tone] = groupStatus[group.status] || [group.status, 'orange'];
  const memberCount = group.memberCount ?? group.depositMembers.length;
  const ready = Boolean(group.readiness?.ready), running = group.status === 'in-progress', upcoming = group.status === 'published';
  const action = running ? 'complete' : group.itineraryConfirmed ? 'start' : 'confirm-schedule';
  const actionLabel = running ? 'Kết thúc hoạt động' : group.itineraryConfirmed ? 'Bắt đầu hoạt động' : 'Chốt lịch đi';
  const needsPayment = group.depositAmount > 0 && group.depositMembers.some(member => member.status !== 'paid');
  useEffect(() => {
    if (!confirm) return;
    const previous = document.activeElement, panel = dialog.current;
    panel?.querySelector('button')?.focus();
    const key = event => {
      if (event.key === 'Escape' && !busy) setConfirm(null);
      if (event.key !== 'Tab') return;
      const targets = [...panel.querySelectorAll('button:not([disabled])')];
      if (!targets.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [confirm, busy]);
  return <>
    <header className="gm-group-context"><div className="gm-group-context-top"><span className="gm-group-post-name">{group.campaignTitle || group.promotionalPostTitle}</span><StatusPill tone={tone}>{label}</StatusPill></div><h2>{group.name}</h2><div className="gm-group-context-meta"><span><Icon name="activity" size={16} />{shortDate(group.startsAt)} – {shortDate(group.endsAt)}</span><span><Icon name="grid" size={16} />{group.meetingPoint || group.location || 'Chưa có địa điểm'}</span></div></header>
    <div className="gm-group-metrics"><div><span>Thành viên</span><strong>{memberCount}<small> / {group.maxParticipants}</small></strong><span>{Math.max(0, group.maxParticipants - memberCount)} chỗ còn lại</span></div><button type="button" onClick={() => onTab('participation')}><span>Chờ duyệt</span><strong className={group.requests?.length ? 'has-pending' : ''}>{group.requests?.length || 0}<Icon name="arrow" size={18} /></strong><span>Yêu cầu tham gia</span></button><button type="button" onClick={() => onTab('deposits')}><span>Cọc đã ghi nhận</span><strong>{group.depositMembers.filter(member => member.status === 'paid').reduce((sum, member) => sum + Number(member.amount || group.depositAmount), 0).toLocaleString('vi-VN')}<small> đ</small></strong><span>{group.depositMembers.filter(member => member.status === 'paid').length}/{group.depositMembers.length} thành viên</span></button></div>
    {onCommand && (upcoming || running) && <section className={'gm-group-next-action ' + (ready || running ? 'is-ready' : '')} aria-label="Hành động tiếp theo"><span className="gm-group-next-icon"><Icon name={running ? 'play' : ready ? 'check' : 'activity'} size={21} /></span><div><strong>{running ? 'Hoạt động đang diễn ra' : group.itineraryConfirmed ? 'Lịch trình đã chốt' : ready ? 'Nhóm đã sẵn sàng' : 'Hoàn tất chuẩn bị'}</strong><p>{running ? 'Theo dõi điểm danh trước khi kết thúc.' : !ready ? needsPayment ? 'Kiểm tra các khoản cọc đang chờ.' : 'Cần thêm thành viên được duyệt.' : group.itineraryConfirmed ? 'Bắt đầu khi các thành viên đã có mặt.' : 'Chốt lịch để thông báo cho thành viên.'}</p></div><div className="gm-group-next-buttons">{(!ready && upcoming || running) && <PillButton variant="secondary" onClick={() => onTab(running || !needsPayment ? 'participation' : 'deposits')}>{running ? 'Điểm danh' : needsPayment ? 'Xem tiền cọc' : 'Xem thành viên'}</PillButton>}<PillButton icon={running ? 'check' : 'play'} disabled={busy || upcoming && !ready} onClick={() => action === 'confirm-schedule' ? void onCommand(group, 'actions/' + action) : setConfirm(action)}>{actionLabel}</PillButton></div></section>}
    {confirm && <div className="gm-confirm-backdrop"><section className="gm-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="gm-group-action-title" ref={dialog}><h3 id="gm-group-action-title">{confirm === 'start' ? 'Bắt đầu hoạt động?' : 'Kết thúc hoạt động?'}</h3><strong>{group.name}</strong><p>{confirm === 'start' ? 'Trạng thái nhóm sẽ chuyển sang đang diễn ra.' : 'Nhóm sẽ đóng và thành viên có thể đánh giá. Hoàn tất hoạt động không tự giải ngân tiền cọc.'}</p><div className="gm-live-actions"><PillButton variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Quay lại</PillButton><PillButton disabled={busy} onClick={async () => { if (await onCommand(group, 'actions/' + confirm) !== false) setConfirm(null); }}>{busy ? 'Đang xử lý…' : confirm === 'start' ? 'Xác nhận bắt đầu' : 'Xác nhận kết thúc'}</PillButton></div></section></div>}
  </>;
}

export default function GroupOverview({ group, onTab, onOpenWallet }) {
  const approved = group.depositMembers.length, paid = group.depositMembers.filter(member => member.status === 'paid').length;
  const checks = [{ label: 'Có thành viên tham gia', done: approved > 0, tab: 'participation' }, { label: group.depositAmount ? 'Ghi nhận tiền cọc' : 'Không yêu cầu tiền cọc', done: !group.depositAmount || approved > 0 && paid === approved, tab: 'deposits' }, { label: 'Lịch trình đã chuẩn bị', done: group.itinerary.length > 0, tab: 'itinerary' }, { label: 'Đã chốt lịch đi', done: Boolean(group.itineraryConfirmed) || ['in-progress', 'completed'].includes(group.status), tab: 'itinerary' }];
  return <div className="gm-group-overview"><section className="gm-group-section"><div className="gm-group-section-heading"><h3>Chuẩn bị hoạt động</h3><span>{checks.filter(item => item.done).length}/{checks.length}</span></div><div className="gm-group-checklist">{checks.map(item => <button type="button" key={item.label} onClick={() => onTab(item.tab)}><span className={'gm-group-check ' + (item.done ? 'is-done' : '')}><Icon name={item.done ? 'check' : 'activity'} size={15} /></span><span>{item.label}</span><Icon name="arrow" size={16} /></button>)}</div></section>
    <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Lịch trình</h3><button type="button" className="gm-text-action" onClick={() => onTab('itinerary')}>{group.itinerary.length ? 'Xem tất cả' : 'Thêm lịch trình'}<Icon name="arrow" size={15} /></button></div>{group.itinerary.length ? <div className="gm-group-timeline-preview">{group.itinerary.slice(0, 3).map(item => <div key={item.id}><time>{item.time}</time><span><strong>{item.title}</strong><small>{item.location || group.meetingPoint || group.location}</small></span></div>)}</div> : <div className="gm-group-section-empty"><Icon name="activity" size={24} /><p>Chưa có lịch trình</p></div>}</section>
    <section className="gm-group-section gm-group-quick-actions"><h3>Truy cập nhanh</h3><button type="button" onClick={() => onTab('chat')}><span className="gm-group-quick-icon"><Icon name="chat" size={21} /></span><span><strong>Chat nhóm</strong><small>Trao đổi với thành viên</small></span><Icon name="arrow" size={18} /></button><button type="button" onClick={() => onTab('offers')}><span className="gm-group-quick-icon"><Icon name="bell" size={21} /></span><span><strong>Gửi thông báo</strong><small>Cập nhật và ưu đãi cho nhóm</small></span><Icon name="arrow" size={18} /></button>{onOpenWallet && <button type="button" onClick={onOpenWallet}><span className="gm-group-quick-icon"><Icon name="wallet" size={21} /></span><span><strong>Ví & đối soát</strong><small>Theo dõi hoàn cọc và giải ngân</small></span><Icon name="arrow" size={18} /></button>}</section>
  </div>;
}
