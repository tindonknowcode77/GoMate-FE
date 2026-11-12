import { useState } from 'react';
import { Icon, PillButton, StatusPill } from './GoMatePortal';

export default function GroupMembers({ group, onCommand, busy }) {
  const [search, setSearch] = useState('');
  const [kickTarget, setKickTarget] = useState(null);
  const [kickReason, setKickReason] = useState('');
  const roster = group.attendance?.length ? group.attendance : group.depositMembers.map(member => ({ ...member, userId: member.id, status: 'unmarked' }));
  const members = roster.filter(member => member.name?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const attendanceLabels = { unmarked: 'Chưa điểm danh', present: 'Có mặt', late: 'Đến muộn', absent: 'Vắng mặt' };
  const editable = onCommand && ['published', 'in-progress'].includes(group.status);
  const depositMap = new Map((group.depositMembers || []).map(item => [item.id, item]));

  return <div className="gm-group-member-sections">
    {group.requests?.length > 0 && <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Yêu cầu tham gia</h3><span className="gm-group-request-count">{group.requests.length} chờ duyệt</span></div>{group.requests.map(request => <div className="gm-group-member-row gm-join-request" key={request.id}><span className="gm-group-avatar">{request.name?.trim().slice(0, 1) || '?'}</span><strong>{request.name}</strong><div className="gm-group-member-actions"><PillButton variant="secondary" disabled={busy || !editable} onClick={() => onCommand(group, 'requests/' + request.id, { status: 'rejected' })}>Từ chối tham gia</PillButton><PillButton disabled={busy || !editable} onClick={() => onCommand(group, 'requests/' + request.id, { status: 'approved' })} icon="check">Duyệt tham gia</PillButton></div></div>)}</section>}

    {group.leaveRequests?.length > 0 && <section className="gm-group-section">
      <div className="gm-group-section-heading"><h3>Yêu cầu xin rời sát giờ (&le; 6 tiếng)</h3><span className="gm-group-request-count">{group.leaveRequests.length} chờ duyệt</span></div>
      {group.leaveRequests.map(req => <div className="gm-group-member-row gm-join-request" key={req.id}>
        <span className="gm-group-avatar">{req.name?.trim().slice(0, 1) || '?'}</span>
        <div className="gm-group-member-name"><strong>{req.name}</strong><small>Lý do: {req.reason}</small></div>
        <div className="gm-group-member-actions">
          <PillButton variant="secondary" disabled={busy || !editable} onClick={() => onCommand(group, 'leave-requests/' + req.id, { status: 'rejected' })}>Từ chối</PillButton>
          <PillButton disabled={busy || !editable} onClick={() => onCommand(group, 'leave-requests/' + req.id, { status: 'approved' })} icon="check">Duyệt rời (Hoàn 100%)</PillButton>
        </div>
      </div>)}
    </section>}

    <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Thành viên & điểm danh <span>({roster.length})</span></h3><label className="gm-group-search"><Icon name="search" size={17} /><input aria-label="Tìm thành viên trong nhóm" placeholder="Tìm thành viên…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {members.map(member => {
        const dep = depositMap.get(member.userId);
        return <div className="gm-group-member-row" key={member.userId}>
          <span className="gm-group-avatar">{member.name?.trim().slice(0, 1) || '?'}</span>
          <div className="gm-group-member-name">
            <strong>{member.name}</strong>
            {member.userId === group.ownerId && <small>Người tổ chức</small>}
            {dep && <small> · {dep.status === 'paid' ? `Đã cọc ${Number(dep.amount || 0).toLocaleString('vi-VN')}đ` : 'Chưa cọc'}</small>}
          </div>
          <div className="gm-group-member-actions">
            {editable ? <select className="gm-simple-input" aria-label={'Điểm danh ' + member.name} value={member.status} disabled={busy} onChange={event => onCommand(group, 'attendance/' + member.userId, { status: event.target.value })}>{Object.entries(attendanceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <StatusPill tone={['present', 'late'].includes(member.status) ? 'green' : member.status === 'absent' ? 'red' : 'orange'}>{attendanceLabels[member.status] || member.status}</StatusPill>}
            {editable && member.userId !== group.ownerId && <PillButton variant="secondary" disabled={busy} onClick={() => { setKickTarget(member); setKickReason(''); }}>Đá khỏi nhóm</PillButton>}
          </div>
        </div>;
      })}
      {!members.length && <div className="gm-group-section-empty"><Icon name="users" size={26} /><p>{search ? 'Không tìm thấy thành viên' : 'Chưa có thành viên'}</p></div>}
    </section>

    {kickTarget && <div className="gm-confirm-backdrop"><section className="gm-confirm-dialog" role="alertdialog" aria-modal="true">
      <h3>Đưa thành viên ra khỏi nhóm?</h3>
      <strong>{kickTarget.name}</strong>
      <p>{depositMap.get(kickTarget.userId)?.status === 'paid' ? 'Thành viên này đã đóng tiền cọc. Khi bị doanh nghiệp đưa ra khỏi nhóm, hệ thống sẽ tự động mở hoàn 100% tiền cọc về Ví của thành viên.' : 'Thành viên sẽ bị xóa khỏi nhóm và nhận thông báo.'}</p>
      <label className="gm-field" style={{ marginTop: 8 }}>
        <span>Lý do (tùy chọn)</span>
        <input className="gm-simple-input" placeholder="Nhập lý do đưa ra khỏi nhóm…" value={kickReason} onChange={e => setKickReason(e.target.value)} />
      </label>
      <div className="gm-live-actions" style={{ marginTop: 12 }}>
        <PillButton variant="secondary" disabled={busy} onClick={() => setKickTarget(null)}>Hủy</PillButton>
        <PillButton disabled={busy} onClick={async () => {
          const ok = await onCommand(group, 'members/' + kickTarget.userId, { reason: kickReason.trim() });
          if (ok !== false) setKickTarget(null);
        }}>{busy ? 'Đang xử lý…' : 'Xác nhận đá khỏi nhóm'}</PillButton>
      </div>
    </section></div>}
  </div>;
}
