import { useMemo, useState } from 'react';
import { Icon, StatusPill } from './GoMatePortal';

export const groupStatus = {
  published: ['Sắp diễn ra', 'blue'], 'in-progress': ['Đang diễn ra', 'green'], completed: ['Đã hoàn tất', 'purple'],
  cancelled: ['Đã hủy', 'red'], expired: ['Đã hết hạn', 'orange'], active: ['Đang hoạt động', 'green'], draft: ['Bản nháp', 'orange'],
};
export const shortDate = value => {
  if (!value) return 'Chưa có lịch';
  const date = new Date(value), zone = { timeZone: 'Asia/Ho_Chi_Minh' };
  return date.toLocaleDateString('vi-VN', { ...zone, day: '2-digit', month: '2-digit' }) + ' · ' + date.toLocaleTimeString('vi-VN', { ...zone, hour: '2-digit', minute: '2-digit' });
};

export default function BusinessGroupBrowser({ groups, children }) {
  const [selectedId, setSelectedId] = useState(''), [search, setSearch] = useState(''), [filter, setFilter] = useState('active');
  const filtered = useMemo(() => groups.filter(group => {
    const matches = filter === 'all' || (filter === 'active' ? ['published', 'in-progress', 'active'].includes(group.status) : group.status === filter);
    const term = search.trim().toLocaleLowerCase('vi');
    return matches && [group.name, group.campaignTitle, group.location, group.meetingPoint].filter(Boolean).join(' ').toLocaleLowerCase('vi').includes(term);
  }), [groups, filter, search]);
  const selected = filtered.find(group => group.id === selectedId) || filtered[0];
  const [browserOpen, setBrowserOpen] = useState(false);
  const requests = groups.reduce((sum, group) => sum + (group.requests?.length || 0), 0);
  return <div className="gm-active-dashboard gm-groups-workspace">
    <div className="gm-groups-page-heading"><div><span className="gm-eyebrow">ĐIỀU HÀNH DOANH NGHIỆP</span><h3>Quản lý nhóm</h3></div><div className="gm-groups-totals"><span><b>{groups.length}</b> nhóm</span>{requests > 0 && <span className="gm-groups-pending"><b>{requests}</b> yêu cầu mới</span>}</div></div>
    <div className="gm-groups-layout">
      <aside className="gm-group-browser" aria-label="Danh sách nhóm" data-open={browserOpen}>
        <button type="button" className="gm-group-mobile-toggle" aria-expanded={browserOpen} aria-controls="gm-group-browser-options" onClick={() => setBrowserOpen(value => !value)}><Icon name="users" size={21} /><span><small>NHÓM ĐANG CHỌN</small><strong>{selected?.name || 'Chọn nhóm'}</strong></span><span>{browserOpen ? 'Đóng' : 'Đổi nhóm'}</span><Icon name="arrow" size={16} /></button>
        <div className="gm-group-browser-heading"><strong>Nhóm của bạn</strong><span>{filtered.length}</span></div>
        <div id="gm-group-browser-options" className="gm-group-browser-options"><div className="gm-group-browser-filters"><label className="gm-group-search"><Icon name="search" size={18} /><input aria-label="Tìm nhóm" placeholder="Tìm nhóm, bài đăng…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Xóa tìm kiếm nhóm" onClick={() => setSearch('')}><Icon name="close" size={16} /></button>}</label><select className="gm-simple-input" aria-label="Lọc trạng thái nhóm" value={filter} onChange={event => setFilter(event.target.value)}><option value="active">Đang hoạt động</option><option value="all">Tất cả nhóm</option><option value="published">Sắp diễn ra</option><option value="in-progress">Đang diễn ra</option><option value="completed">Đã hoàn tất</option><option value="cancelled">Đã thu hồi / Hủy</option><option value="expired">Đã hết hạn</option></select></div>
        <div className="gm-group-tiles">{filtered.map(group => {
          const [label, tone] = groupStatus[group.status] || [group.status, 'orange'];
          return <button type="button" aria-pressed={selected?.id === group.id} data-group-id={group.id} className={'gm-group-tile ' + (selected?.id === group.id ? 'is-selected' : '')} key={group.id} onClick={() => { setSelectedId(group.id); setBrowserOpen(false); }}><span className="gm-group-tile-top"><span>{group.campaignTitle}</span><StatusPill tone={tone}>{label}</StatusPill></span><strong>{group.name}</strong><small><Icon name="activity" size={14} />{shortDate(group.startsAt)}</small><span className="gm-group-tile-bottom"><span><Icon name="users" size={14} />{group.memberCount ?? group.depositMembers.length}/{group.maxParticipants}</span>{group.requests?.length > 0 && <span className="gm-group-request-count">{group.requests.length} chờ duyệt</span>}</span></button>;
        })}</div>
        {!filtered.length && <div className="gm-group-list-empty"><Icon name="search" size={25} /><p>Không tìm thấy nhóm</p><button type="button" className="gm-text-action" onClick={() => { setFilter('all'); setSearch(''); }}>Xem tất cả nhóm</button></div>}
        </div>
      </aside>
      {selected ? children(selected) : <section className="gm-group-detail gm-group-no-selection"><span className="gm-group-empty-icon"><Icon name="users" size={30} /></span><h3>{groups.length ? 'Không có nhóm phù hợp' : 'Chưa có nhóm nào'}</h3><p>{groups.length ? 'Thử từ khóa khác hoặc đổi bộ lọc trạng thái.' : 'Các nhóm của bài đăng đã được duyệt sẽ xuất hiện tại đây.'}</p></section>}
    </div>
  </div>;
}
