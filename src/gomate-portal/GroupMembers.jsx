import { useState } from 'react';
import { Icon, PillButton, StatusPill } from './GoMatePortal';

export default function GroupMembers({ group, onCommand, busy }) {
  const [search, setSearch] = useState('');
  const roster = group.attendance?.length ? group.attendance : group.depositMembers.map(member => ({ ...member, userId: member.id, status: 'unmarked' }));
  const members = roster.filter(member => member.name?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const attendanceLabels = { unmarked: 'Chưa điểm danh', present: 'Có mặt', late: 'Đến muộn', absent: 'Vắng mặt' };
  const editable = onCommand && ['published', 'in-progress'].includes(group.status);
  return <div className="gm-group-member-sections">
    {group.requests?.length > 0 && <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Yêu cầu tham gia</h3><span className="gm-group-request-count">{group.requests.length} chờ duyệt</span></div>{group.requests.map(request => <div className="gm-group-member-row gm-join-request" key={request.id}><span className="gm-group-avatar">{request.name?.trim().slice(0, 1) || '?'}</span><strong>{request.name}</strong><div className="gm-group-member-actions"><PillButton variant="secondary" disabled={busy || !editable} onClick={() => onCommand(group, 'requests/' + request.id, { status: 'rejected' })}>Từ chối tham gia</PillButton><PillButton disabled={busy || !editable} onClick={() => onCommand(group, 'requests/' + request.id, { status: 'approved' })} icon="check">Duyệt tham gia</PillButton></div></div>)}</section>}
    <section className="gm-group-section"><div className="gm-group-section-heading"><h3>Thành viên & điểm danh <span>({roster.length})</span></h3><label className="gm-group-search"><Icon name="search" size={17} /><input aria-label="Tìm thành viên trong nhóm" placeholder="Tìm thành viên…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {members.map(member => <div className="gm-group-member-row" key={member.userId}><span className="gm-group-avatar">{member.name?.trim().slice(0, 1) || '?'}</span><div className="gm-group-member-name"><strong>{member.name}</strong>{member.userId === group.ownerId && <small>Người tổ chức</small>}</div>{editable ? <select className="gm-simple-input" aria-label={'Điểm danh ' + member.name} value={member.status} disabled={busy} onChange={event => onCommand(group, 'attendance/' + member.userId, { status: event.target.value })}>{Object.entries(attendanceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <StatusPill tone={['present', 'late'].includes(member.status) ? 'green' : member.status === 'absent' ? 'red' : 'orange'}>{attendanceLabels[member.status] || member.status}</StatusPill>}</div>)}
      {!members.length && <div className="gm-group-section-empty"><Icon name="users" size={26} /><p>{search ? 'Không tìm thấy thành viên' : 'Chưa có thành viên'}</p></div>}
    </section>
  </div>;
}
