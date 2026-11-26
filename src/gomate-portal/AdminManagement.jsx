import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Icon, PillButton, StatusPill } from './GoMatePortal';
import { usePortalNotice } from './PortalNotifications';
import './admin-management.css';
import { validateAdminForm } from './adminFormValidation';
import AdminRoleManager from './AdminRoleManager';
import AdminBusinessWorkspace from './AdminBusinessWorkspace';
import AdminAttendanceComplaint from './AdminAttendanceComplaint';
import VerificationDocumentPreview from './VerificationDocumentPreview';

const titles = { users: 'người dùng', businesses: 'doanh nghiệp', posts: 'bài đăng', reports: 'báo cáo', tickets: 'yêu cầu hỗ trợ' };
const statuses = { users: ['active', 'banned', 'pending'], businesses: ['pending', 'approved', 'rejected'], posts: ['pending', 'approved', 'rejected', 'withdrawn'], reports: ['pending', 'resolved', 'dismissed'], tickets: ['open', 'closed'] };
const labels = { active: 'Đang hoạt động', banned: 'Đã khóa', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', withdrawn: 'Đã thu hồi', resolved: 'Đã xử lý', dismissed: 'Bỏ qua', open: 'Đang mở', closed: 'Đã đóng', admin: 'Quản trị viên', business: 'Doanh nghiệp', 'business-staff': 'Nhân sự doanh nghiệp', host: 'Host', user: 'Thành viên', member: 'Thành viên' };
const roleFilterValue = role => role.id === 'member' ? 'user' : role.id;
const businessFields = [['company', 'Tên doanh nghiệp', 150], ['address', 'Địa chỉ', 500], ['website', 'Website', 500, 'url', true], ['representativeName', 'Người đại diện', 120], ['representativeTitle', 'Chức danh', 80], ['representativeEmail', 'Email đại diện', 254, 'email'], ['representativePhone', 'Điện thoại', 40, 'tel']];
const title = row => row.name || row.company || row.title || row.subject || row.reason;
const eventPayload = event => Object.fromEntries(['category', 'location', 'province', 'address', 'meetingPoint', 'startsAt', 'endsAt', 'registrationDeadline', 'estimatedCost', 'minParticipants', 'maxParticipants', 'itinerary', 'plan', 'planLink', 'coordinates'].filter(key => event[key] !== undefined).map(key => [key, event[key]]));
function postPayload(row, form) {
  const result = Object.fromEntries(['title', 'copy', 'badge', 'discount', 'border', 'premium', 'discountPercent', 'offer', 'offerTerms'].map(key => [key, form[key] ?? row?.[key] ?? ({ border: 'Solid', premium: false, discountPercent: 0 }[key] ?? '')]));
  result.discountPercent = Number(result.discountPercent);
  if (row?.event) result.event = eventPayload(row.event);
  if (row?.groups) result.groups = row.groups.map(group => ({ name: group.name, locationId: group.locationId || '', depositAmount: group.depositAmount || 0, event: eventPayload(group.event) }));
  return result;
}
async function documentValue(file) {
  if (!file || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) throw Error('Chọn giấy phép PDF, PNG hoặc JPEG tối đa 10 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(Error('Không đọc được giấy phép')); reader.onload = () => resolve({ name: file.name, mime: file.type, base64: String(reader.result).split(',')[1] }); reader.readAsDataURL(file); });
}

export default function AdminManagement({ kind, me, onChanged, refreshVersion = 0, initialCreateRoleId, onQuickCreateConsumed }) {
  const notify = usePortalNotice();
  const [result, setResult] = useState({ items: [], total: 0 }), [page, setPage] = useState(1);
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [role, setRole] = useState('');
  const [dateFrom, setDateFrom] = useState(''), [dateTo, setDateTo] = useState(''), [sortBy, setSortBy] = useState('createdAt'), [sortDirection, setSortDirection] = useState('desc');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editor, setEditor] = useState(null), [form, setForm] = useState({}), [file, setFile] = useState(null);
  const [selected, setSelected] = useState(null), [note, setNote] = useState(''), [reply, setReply] = useState(''), [confirm, setConfirm] = useState(null);
  const [roles, setRoles] = useState([]), [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const generation = useRef(0), lock = useRef(false), dialogRef = useRef(null);
  const base = '/portal/admin/' + kind;
  const closeRoleManager = useCallback(() => setRoleManagerOpen(false), []);
  const loadRoles = useCallback(async () => {
    if (kind !== 'users') return;
    try { setRoles(await api('/portal/admin/roles', { timeoutMs: 8000 })); }
    catch (reason) { setError(reason.message); }
  }, [kind]);
  useEffect(() => { void loadRoles(); }, [loadRoles]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setSearch(query.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(async () => {
    const request = ++generation.current; setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), q: search });
    if (status) params.set('status', status);
    if (kind === 'users' && role) params.set('role', role);
    if (['users', 'posts'].includes(kind)) {
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('sortBy', sortBy);
      params.set('sortDirection', sortDirection);
    }
    try { const value = await api(`${base}?${params}`, { timeoutMs: 8000 }); if (request === generation.current) { setResult(value); if (!value.items.length && page > 1) setPage(page - 1); } }
    catch (reason) { if (request === generation.current) setError(reason.message); }
    finally { if (request === generation.current) setLoading(false); }
  }, [base, kind, page, search, status, role, dateFrom, dateTo, sortBy, sortDirection]);
  const refreshRoles = useCallback(async () => { await loadRoles(); await load(); }, [loadRoles, load]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load, refreshVersion]);
  const modalOpen = Boolean(editor || selected || confirm);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.querySelector('input, textarea, select, button')?.focus();
    const key = event => {
      if (event.key === 'Escape' && !lock.current) { setEditor(null); setSelected(null); setConfirm(null); }
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [modalOpen]);
  const run = async (action, success) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); setEditor(null); setSelected(null); setConfirm(null); notify(success); await load(); await onChanged(); }
    catch (reason) { setError(reason.message); notify(reason.message, 'error'); }
    finally { lock.current = false; setBusy(false); }
  };
  const openEditor = row => {
    setError(''); setSelected(null); setEditor({ row }); setFile(null);
    setForm(row ? { discountPercent: 0, offer: '', offerTerms: '', website: '', ...row, roleId: row.adminRoleId || (row.role === 'admin' ? 'admin' : 'member'), plan: row.subscription?.plan || 'free', subscriptionStatus: row.subscription?.status || 'active' } : { ownerId: '', name: '', email: '', password: '', roleId: 'member', company: '', category: 'Events', taxId: '', address: '', website: '', representativeName: '', representativeTitle: '', representativeEmail: '', representativePhone: '', title: '', copy: '', discountPercent: 0, offer: '', offerTerms: '', subject: '', message: '', activityId: '', reason: 'Lý do khác', detail: '', status: 'open' });
  };
  useEffect(() => {
    if (kind !== 'users' || !initialCreateRoleId) return;
    openEditor(null);
    setForm(value => ({ ...value, roleId: initialCreateRoleId }));
    onQuickCreateConsumed?.();
  }, [initialCreateRoleId]);
  const save = event => { event.preventDefault(); void run(async () => {
    const row = editor.row;
    validateAdminForm(kind, form, Boolean(row));
    let body;
    if (kind === 'users') body = row ? { name: form.name, roleId: form.roleId, adminVersion: row.adminVersion } : { name: form.name, email: form.email, password: form.password, roleId: form.roleId };
    if (kind === 'businesses') {
      const data = Object.fromEntries(businessFields.map(([key]) => [key, form[key] || '']));
      body = row ? { ...data, version: row.version, adminVersion: row.adminVersion } : { ownerId: form.ownerId, application: { ...data, category: form.category, taxId: form.taxId, document: await documentValue(file) } };
    }
    if (kind === 'posts') body = { ...(row ? { version: row.version, adminVersion: row.adminVersion } : { ownerId: form.ownerId }), post: postPayload(row, form) };
    if (kind === 'reports') body = row ? { detail: form.detail, adminVersion: row.adminVersion } : { activityId: form.activityId, reason: form.reason, detail: form.detail };
    if (kind === 'tickets') body = row ? { subject: form.subject, status: form.status, adminVersion: row.adminVersion } : { ownerId: form.ownerId, subject: form.subject, message: form.message };
    await api(base + (row ? '/' + row.id : ''), { method: row ? 'PUT' : 'POST', body: JSON.stringify(body) });
  }, `Đã lưu ${titles[kind]}.`); };
  const control = ([key, label, maxLength, type = 'text', optional = false]) => <label className="gm-field" key={key}><span>{label}</span><input className="gm-simple-input" type={type} maxLength={maxLength} required={!optional} value={form[key] ?? ''} min={type === 'number' ? 0 : undefined} max={key === 'discountPercent' ? 100 : undefined} minLength={key === 'password' ? 6 : key === 'name' ? 2 : undefined} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} /></label>;
  const area = (key, label, maxLength, optional = false) => <label className="gm-field"><span>{label}</span><textarea className="gm-simple-input" rows={4} required={!optional} maxLength={maxLength} value={form[key] || ''} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} /></label>;
  const select = (key, label, choices) => <label className="gm-field"><span>{label}</span><select aria-label={label} className="gm-simple-input" value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))}>{choices.map(value => <option key={value} value={value}>{labels[value] || value}</option>)}</select></label>;
  const decide = (row, decision) => void run(async () => {
    if (decision === 'rejected' && !note.trim()) throw Error('Nhập lý do từ chối.');
    await api(`/portal/${kind === 'businesses' ? 'applications' : 'posts'}/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: decision, reviewNote: note, version: row.version }) });
  }, 'Đã lưu quyết định duyệt.');
  const detail = async row => { setNote(''); setReply(''); setError(''); try { setSelected(await api(base + '/' + row.id)); } catch (reason) { setError(reason.message); } };
  return <section className={`gm-panel gm-live-panel gm-admin-management ${kind === 'posts' ? 'gm-admin-management--posts' : ''}`}>
    <div className="gm-panel-heading"><div>{kind === 'posts' && <span className="gm-eyebrow">KIỂM DUYỆT NỘI DUNG</span>}<h3>{kind === 'posts' ? 'Duyệt bài đăng' : `Quản lý ${titles[kind]}`}</h3><p className="gm-live-muted">{kind === 'posts' ? `${result.total} bài đăng` : `${result.total} mục · Tạo, xem, sửa và xóa`}</p></div><div className="gm-admin-heading-actions">{kind === 'users' && <PillButton variant="secondary" disabled={busy || loading} onClick={() => setRoleManagerOpen(true)}>Quản lý role</PillButton>}<PillButton disabled={busy || loading} onClick={() => openEditor(null)}>Thêm mới</PillButton></div></div>
    {error && !modalOpen && <p role="alert" className="gm-form-error">{error}</p>}
    <form className={`gm-admin-filters ${kind === 'users' ? 'gm-admin-user-filters' : ''}`} onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><input aria-label="Tìm kiếm" placeholder="Tìm theo tên, email hoặc nội dung" className="gm-simple-input" value={query} maxLength={120} onChange={event => setQuery(event.target.value)} /><PillButton disabled={loading || busy} type="submit">Tìm kiếm</PillButton>{kind === 'users' && <select aria-label="Lọc theo vai trò" className="gm-simple-input" value={role} onChange={event => { setRole(event.target.value); setPage(1); }}><option value="">Tất cả vai trò</option>{roles.map(item => <option key={item.id} value={roleFilterValue(item)}>{item.name}</option>)}</select>}{statuses[kind].length > 0 && <select aria-label="Lọc trạng thái" className="gm-simple-input" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{statuses[kind].map(value => <option key={value} value={value}>{labels[value]}</option>)}</select>}{['users', 'posts'].includes(kind) && <><label className="gm-admin-date-filter"><span>Từ ngày</span><input aria-label="Từ ngày" className="gm-simple-input" type="date" value={dateFrom} max={dateTo || undefined} onChange={event => { setDateFrom(event.target.value); setPage(1); }} /></label><label className="gm-admin-date-filter"><span>Đến ngày</span><input aria-label="Đến ngày" className="gm-simple-input" type="date" value={dateTo} min={dateFrom || undefined} onChange={event => { setDateTo(event.target.value); setPage(1); }} /></label><select aria-label="Sắp xếp theo" className="gm-simple-input" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(1); }}>{(kind === 'users' ? [['createdAt', 'Ngày tạo'], ['name', 'Tên'], ['email', 'Email'], ['role', 'Vai trò'], ['status', 'Trạng thái']] : [['createdAt', 'Ngày tạo'], ['title', 'Tiêu đề'], ['status', 'Trạng thái']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Chiều sắp xếp" className="gm-simple-input" value={sortDirection} onChange={event => { setSortDirection(event.target.value); setPage(1); }}><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></> }<PillButton variant="secondary" disabled={loading || busy} onClick={() => void load()}>Tải lại</PillButton></form>
    {loading ? <p role="status">Đang tải…</p> : !result.items.length ? <p>Không tìm thấy {titles[kind]}.</p> : <div className="gm-table-wrap"><table className="gm-table"><thead><tr><th>{kind === 'posts' ? 'Bài đăng' : 'Tên / nội dung'}</th><th>{kind === 'posts' ? 'Trạng thái' : 'Trạng thái / quyền'}</th><th>{kind === 'posts' ? 'Duyệt / quản lý' : 'Thao tác'}</th></tr></thead><tbody>{result.items.map(row => <tr key={row.id}>
      <td>{kind === 'posts' ? <div className="gm-admin-post-summary"><strong>{title(row)}</strong><small className="gm-admin-secondary">{row.businessName || row.business?.company || row.ownerName || 'Doanh nghiệp'}{row.pendingRevision ? ' · Có chỉnh sửa chờ duyệt' : ''}</small>{row.copy && <span className="gm-admin-post-copy">{row.copy}</span>}<div className="gm-admin-post-meta">{row.event?.startsAt && <span><Icon name="activity" size={14} />{new Date(row.event.startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</span>}{row.event?.location && <span><Icon name="location" size={14} />{row.event.location}</span>}{row.groups?.length > 0 && <span><Icon name="users" size={14} />{row.groups.length} nhóm</span>}{(row.discountPercent > 0 || row.offer || row.discount) && <span><Icon name="tag" size={14} />{row.discountPercent > 0 ? `Giảm ${row.discountPercent}%` : row.discount}{row.offer ? ` · ${row.offer}` : ''}</span>}</div>{row.reviewNote && <small className="gm-admin-post-note">{row.reviewNote}</small>}</div> : <><strong>{title(row)}</strong><small className="gm-admin-secondary">{row.email || row.businessName || row.representativeEmail || row.ownerEmail || row.ownerName || row.activityId || row.ownerId}</small></>}</td>
      <td><StatusPill status={kind === 'users' ? row.adminStatus : row.status || row.effectiveRole || row.role || 'user'}>{kind === 'users' ? labels[row.adminStatus] || 'Chưa xác minh' : labels[row.status] || labels[row.effectiveRole] || row.role || 'Người dùng'}</StatusPill>{kind === 'users' && <small className="gm-admin-secondary">{row.effectiveRoleName || labels[row.effectiveRole] || labels[row.role] || 'Thành viên'} · {row.subscription?.plan || 'free'} · {row.email_verified ? 'Đã xác minh' : 'Chưa xác minh'}</small>}</td>
      <td>{['users', 'businesses', 'posts'].includes(kind) ? <div className="gm-admin-icon-actions"><button type="button" className={`gm-admin-icon-action gm-admin-icon-action--details ${kind === 'posts' && row.status === 'pending' ? 'is-primary' : ''}`} title={`Chi tiết ${title(row)}`} aria-label="Chi tiết" disabled={busy} onClick={() => void detail(row)}><Icon name={kind === 'posts' && row.status === 'pending' ? 'check' : 'eye'} size={17} /></button><button type="button" className="gm-admin-icon-action gm-admin-icon-action--edit" title={`Sửa ${title(row)}`} aria-label="Sửa" disabled={busy || kind === 'posts' && !['pending', 'rejected'].includes(row.status)} onClick={() => openEditor(row)}><Icon name="edit" size={17} /></button><button type="button" className="gm-admin-icon-action gm-admin-icon-action--delete" title={`Xóa ${title(row)}`} aria-label="Xóa" disabled={busy || kind === 'users' && (row.id === me.id || row.role === 'admin')} onClick={() => { setError(''); setConfirm(row); }}><Icon name="trash" size={17} /></button></div> : <div className={`gm-live-actions ${kind === 'posts' ? 'gm-admin-post-row-actions' : ''}`}><PillButton variant={kind === 'posts' && row.status === 'pending' ? 'primary' : 'secondary'} icon={kind === 'posts' && row.status === 'pending' ? 'check' : undefined} disabled={busy} onClick={() => void detail(row)}>Chi tiết</PillButton><PillButton variant="secondary" disabled={busy || kind === 'posts' && !['pending', 'rejected'].includes(row.status) || kind === 'reports' && row.status !== 'pending'} onClick={() => openEditor(row)}>Sửa</PillButton><PillButton variant="secondary" disabled={busy} onClick={() => { setError(''); setConfirm(row); }}>Xóa</PillButton></div>}</td>
    </tr>)}</tbody></table></div>}
    <div className="gm-admin-pagination"><PillButton variant="secondary" disabled={page === 1 || loading || busy} onClick={() => setPage(page - 1)}>Trang trước</PillButton><span>Trang {page} / {Math.max(1, Math.ceil(result.total / 20))}</span><PillButton variant="secondary" disabled={page * 20 >= result.total || loading || busy} onClick={() => setPage(page + 1)}>Trang sau</PillButton></div>
    {modalOpen && <div className="gm-modal-backdrop"><section className="gm-user-modal gm-admin-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><header className="gm-modal-head"><h3 id="admin-dialog-title">{confirm ? 'Xác nhận xóa' : editor ? `${editor.row ? 'Sửa' : 'Thêm'} ${titles[kind]}` : `Chi tiết ${titles[kind]}`}</h3><PillButton variant="secondary" disabled={busy} onClick={() => { setEditor(null); setSelected(null); setConfirm(null); }}>Đóng</PillButton></header>
      {error && <p role="alert" className="gm-form-error">{error}</p>}
      {confirm && <><p>Xóa “{title(confirm)}”? Mục này sẽ được ẩn, lịch sử được giữ lại. Với bài đăng, các nhóm liên quan sẽ được xử lý theo luồng thu hồi hiện có.</p><PillButton disabled={busy} onClick={() => void run(() => api(base + '/' + confirm.id, { method: 'DELETE', body: JSON.stringify({ adminVersion: confirm.adminVersion, ...(['posts', 'businesses'].includes(kind) ? { version: confirm.version } : {}) }) }), 'Đã xóa mục đã chọn.')}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</PillButton></>}
      {editor && <form onSubmit={save}><fieldset disabled={busy} className="gm-admin-fields">
        {!editor.row && ['businesses', 'posts', 'tickets'].includes(kind) && <>{control(['ownerId', 'ID tài khoản sở hữu (xem trong mục người dùng)', 100])}<p className="gm-live-muted">Bài đăng cần tài khoản doanh nghiệp đã được duyệt.</p></>}
        {kind === 'users' && <>{control(['name', 'Họ tên', 100])}<label className="gm-field"><span>Vai trò</span><select aria-label="Vai trò thành viên" className="gm-simple-input" value={form.roleId || 'member'} onChange={event => setForm(value => ({ ...value, roleId: event.target.value }))}>{roles.filter(item => item.assignable).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="gm-live-muted">Vai trò Host, doanh nghiệp và nhân sự được hệ thống suy ra từ hoạt động hoặc hồ sơ đã duyệt. Vai trò tùy chỉnh dùng để phân loại thành viên; chỉ Quản trị viên có quyền quản trị.</p>{!editor.row && <>{control(['email', 'Email', 254, 'email'])}{control(['password', 'Mật khẩu ban đầu', 128, 'password'])}<p className="gm-live-muted">Tài khoản mới cần xác minh email trước khi đăng nhập.</p></>}</>}
        {kind === 'businesses' && <>{businessFields.map(control)}{!editor.row && <>{control(['category', 'Ngành nghề', 100])}{control(['taxId', 'Mã số thuế (10 hoặc 13 chữ số)', 13])}<label className="gm-field"><span>Giấy phép xác minh (tối đa 10 MB)</span><input type="file" required accept="application/pdf,image/png,image/jpeg" onChange={event => setFile(event.target.files?.[0])} /></label><p className="gm-live-muted">Hồ sơ mới ở trạng thái chờ duyệt. Số chứng nhận và mã số thuế của hồ sơ hiện có được giữ nguyên.</p></>}</>}
        {kind === 'posts' && <>{control(['title', 'Tiêu đề', 120])}{area('copy', 'Nội dung', 3000)}{control(['discountPercent', 'Giảm giá (%)', 3, 'number'])}{control(['offer', 'Ưu đãi', 200, 'text', true])}{area('offerTerms', 'Điều kiện ưu đãi', 500, true)}<p className="gm-live-muted">Bài được lưu ở trạng thái chờ duyệt. Chỉ sửa bài chờ duyệt hoặc bị từ chối. Các nhóm và lịch sự kiện hiện có được giữ lại.</p></>}
        {kind === 'reports' && <>{!editor.row && <>{control(['activityId', 'ID hoạt động', 100])}{control(['reason', 'Lý do', 150])}</>}{area('detail', 'Mô tả bổ sung', 1000, true)}</>}
        {kind === 'tickets' && <>{control(['subject', 'Tiêu đề yêu cầu', 150])}{editor.row ? select('status', 'Trạng thái', ['open', 'closed']) : area('message', 'Nội dung yêu cầu', 3000)}</>}
        <PillButton type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</PillButton>
      </fieldset></form>}
      {selected && <div className="gm-admin-detail-view">
        {kind === 'businesses' && <AdminBusinessWorkspace key={selected.id} businessId={selected.id} company={selected.company} />}
        <dl>{[
          ['Tên', title(selected)],
          ...(kind === 'posts' ? [
            ['Doanh nghiệp', selected.businessName || selected.business?.company || selected.ownerName || 'Doanh nghiệp'],
            ['Ngành nghề DN', selected.business?.category],
            ['Mã số thuế DN', selected.business?.taxId],
            ['Địa chỉ DN', selected.business?.address],
            ['Người đại diện DN', selected.business?.representativeName ? `${selected.business.representativeName}${selected.business.representativePhone ? ' · ' + selected.business.representativePhone : ''}` : null],
            ['Email đại diện DN', selected.business?.representativeEmail],
            ['Tài khoản chủ sở hữu', selected.ownerName ? `${selected.ownerName}${selected.ownerEmail ? ' (' + selected.ownerEmail + ')' : ''}` : selected.ownerEmail],
            ['Ưu đãi / Giảm giá', (selected.discountPercent > 0 || selected.offer) ? `${selected.discountPercent > 0 ? `Giảm ${selected.discountPercent}%` : ''}${selected.offer ? (selected.discountPercent > 0 ? ' · ' : '') + selected.offer : ''}` : null],
            ['Điều kiện ưu đãi', selected.offerTerms],
          ] : [
            ['Email', selected.email],
            ['Tài khoản chủ sở hữu', selected.ownerName ? `${selected.ownerName}${selected.ownerEmail ? ' (' + selected.ownerEmail + ')' : ''}` : selected.ownerEmail],
            ['Loại hình', selected.accountType === 'individual' ? 'Cá nhân' : selected.accountType === 'business' ? 'Doanh nghiệp' : null],
          ]),
          ['Trạng thái', labels[selected.status] || selected.role || 'user'],
          ['Nội dung', selected.copy || selected.detail],
          ['Địa chỉ', selected.address],
          ['Ngành', selected.category],
          ['Website', selected.website],
          ['Mã số thuế', selected.taxId],
          ['Số chứng nhận', selected.certificateNumber],
          ['Đại diện', selected.representativeName],
          ['Chức danh đại diện', selected.representativeTitle],
          ['Email đại diện', selected.representativeEmail],
          ['Điện thoại', selected.representativePhone],
          ['Tài khoản ngân hàng', selected.bankAccount ? `${selected.bankAccount.bankId} · ${selected.bankAccount.accountNo} (${selected.bankAccount.accountName})` : null],
          ['Ngày tạo', selected.createdAt ? new Date(selected.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : null],
          ['Người duyệt', selected.reviewerName ? `${selected.reviewerName}${selected.reviewedAt ? ' · ' + new Date(selected.reviewedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''}` : null],
          ['Hoạt động', selected.activityId],
          ['Người báo cáo', selected.reporterId],
          ['Ghi chú duyệt', selected.reviewNote],
        ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>
        {kind === 'businesses' && selected.license && <div style={{ marginTop: 12 }}><h4>Giấy phép kinh doanh</h4><VerificationDocumentPreview metadata={selected.license} applicationId={selected.id} revision={selected.version} /></div>}
        {kind === 'businesses' && selected.supplementalLicense && <div style={{ marginTop: 12 }}><h4>Tài liệu bổ sung</h4><VerificationDocumentPreview metadata={selected.supplementalLicense} applicationId={selected.id} revision={selected.version} kind="supplemental" /></div>}
        {selected.groups?.length > 0 && <details open className="gm-admin-group-details"><summary>{selected.groups.length} nhóm thuộc bài đăng</summary><div style={{ display: 'grid', gap: 10, marginTop: 8 }}>{selected.groups.map(group => <div key={group.activityId} style={{ padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, display: 'grid', gap: 4 }}>
          <strong>{group.name} · <StatusPill status={group.state || selected.status}>{labels[group.state || selected.status] || group.state || selected.status}</StatusPill></strong>
          <small>Thời gian: {group.event?.startsAt ? new Date(group.event.startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }) : '—'}{group.event?.endsAt ? ` – ${new Date(group.event.endsAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}</small>
          <small>Địa điểm: {group.event?.location || '—'}{group.event?.meetingPoint ? ` · Điểm hẹn: ${group.event.meetingPoint}` : ''}</small>
          <small>Sĩ số: {group.event?.minParticipants ?? 2}–{group.event?.maxParticipants ?? '—'} người · Chi phí: {(group.event?.estimatedCost ?? 0).toLocaleString('vi-VN')}đ · <strong>Tiền cọc: {(group.depositAmount ?? 0).toLocaleString('vi-VN')}đ</strong></small>
        </div>)}</div></details>}
        {kind === 'posts' && selected.pendingRevision && <div style={{ marginTop: 12, padding: 14, borderRadius: 12, border: '1px solid #F59E0B', background: '#FFFBEB', display: 'grid', gap: 8 }}>
          <strong>Yêu cầu chỉnh sửa bài đăng đang chờ duyệt</strong>
          <small>Tiêu đề mới: {selected.pendingRevision.title}</small>
          <small>Nội dung mới: {selected.pendingRevision.copy}</small>
          <small>Giảm giá: {selected.pendingRevision.discountPercent || 0}%{selected.pendingRevision.offer ? ` · ${selected.pendingRevision.offer}` : ''}</small>
          <label className="gm-field"><span>Ghi chú duyệt chỉnh sửa</span><textarea className="gm-simple-input" value={note} maxLength={1000} onChange={event => setNote(event.target.value)} /></label>
          <div className="gm-live-actions">
            <PillButton disabled={busy} onClick={() => void run(() => api(`/portal/posts/${selected.id}/revision`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', reviewNote: note, version: selected.version }) }), 'Đã duyệt chỉnh sửa bài đăng.')}>Duyệt chỉnh sửa</PillButton>
            <PillButton disabled={busy} variant="secondary" onClick={() => void run(async () => { if (!note.trim()) throw Error('Nhập lý do từ chối chỉnh sửa.'); await api(`/portal/posts/${selected.id}/revision`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', reviewNote: note, version: selected.version }) }); }, 'Đã từ chối chỉnh sửa bài đăng.')}>Từ chối chỉnh sửa</PillButton>
          </div>
        </div>}
        {['businesses', 'posts'].includes(kind) && selected.status === 'pending' && <><label className="gm-field"><span>Ghi chú duyệt / lý do từ chối</span><textarea className="gm-simple-input" value={note} maxLength={1000} onChange={event => setNote(event.target.value)} /></label><div className="gm-live-actions"><PillButton disabled={busy} onClick={() => decide(selected, 'approved')}>Duyệt</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => decide(selected, 'rejected')}>Từ chối</PillButton></div></>}
        {kind === 'posts' && selected.status === 'approved' && <div className="gm-live-actions" style={{ marginTop: 10 }}><PillButton disabled={busy} variant="secondary" onClick={() => void run(() => api(`/portal/posts/${selected.id}/lifecycle`, { method: 'POST', body: JSON.stringify({ version: selected.version, action: 'withdraw' }) }), 'Đã thu hồi bài đăng.')}>Thu hồi bài đăng</PillButton></div>}
        {kind === 'users' && <UserAccess row={selected} me={me} busy={busy} run={run} roles={roles} />}
        {kind === 'reports' && selected.type === 'member-complaint' && <AdminAttendanceComplaint key={selected.id} report={selected} onResolved={() => void run(async () => {}, 'Đã xử lý khiếu nại.')} />}
        {kind === 'reports' && selected.type !== 'member-complaint' && selected.status === 'pending' && <div className="gm-live-actions">{[['resolved', false, 'Đã xử lý'], ['resolved', true, 'Xử lý và ẩn hoạt động'], ['dismissed', false, 'Bỏ qua']].map(([decision, hideActivity, label]) => <PillButton key={label} disabled={busy} variant="secondary" onClick={() => void run(() => api('/portal/reports/' + selected.id, { method: 'PATCH', body: JSON.stringify({ status: decision, hideActivity }) }), 'Đã xử lý báo cáo.')}>{label}</PillButton>)}</div>}
        {kind === 'tickets' && <><h4>Trao đổi hỗ trợ</h4>{selected.messages?.map(message => <article className="gm-live-review" key={message.id}><small>{message.authorId} · {new Date(message.createdAt).toLocaleString('vi-VN')}</small><p>{message.text}</p></article>)}<form onSubmit={event => { event.preventDefault(); void run(() => api('/portal/tickets/' + selected.id + '/replies', { method: 'POST', body: JSON.stringify({ message: reply, status: selected.status }) }), 'Đã gửi phản hồi.'); }}><label className="gm-field"><span>Phản hồi</span><textarea required maxLength={3000} className="gm-simple-input" value={reply} onChange={event => setReply(event.target.value)} /></label><PillButton type="submit" disabled={busy}>Gửi phản hồi</PillButton></form></>}
      </div>}
    </section></div>}
    {roleManagerOpen && kind === 'users' && <AdminRoleManager roles={roles} onClose={closeRoleManager} onChanged={refreshRoles} />}
  </section>;
}

function UserAccess({ row, me, busy, run, roles }) {
  const [roleId, setRoleId] = useState(row.adminRoleId || (row.role === 'admin' ? 'admin' : 'member')), [plan, setPlan] = useState(row.subscription?.plan || 'free'), [status, setStatus] = useState(row.subscription?.status || 'active');
  useEffect(() => { setRoleId(row.adminRoleId || (row.role === 'admin' ? 'admin' : 'member')); setPlan(row.subscription?.plan || 'free'); setStatus(row.subscription?.status || 'active'); }, [row.id, row.adminRoleId, row.role, row.subscription?.plan, row.subscription?.status]);
  return <div className="gm-admin-fields"><h4>Quyền và gói sử dụng</h4><label className="gm-field"><span>Vai trò</span><select aria-label="Vai trò thành viên" className="gm-simple-input" value={roleId} disabled={busy || row.id === me.id} onChange={event => setRoleId(event.target.value)}>{roles.filter(item => item.assignable).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="gm-live-muted">Đổi vai trò sẽ hết hạn phiên đăng nhập của tài khoản. Vai trò tùy chỉnh chỉ phân loại; quyền quản trị thuộc về vai trò Quản trị viên.</p><PillButton disabled={busy || row.id === me.id} onClick={() => void run(() => api('/portal/admin/users/' + row.id, { method: 'PUT', body: JSON.stringify({ name: row.name, adminVersion: row.adminVersion, roleId }) }), 'Đã cập nhật vai trò tài khoản.')}>Lưu vai trò</PillButton><label className="gm-field"><span>Gói sử dụng</span><select aria-label="Gói sử dụng" className="gm-simple-input" value={plan} onChange={event => setPlan(event.target.value)}><option value="free">Free</option><option value="plus">Plus</option></select></label><label className="gm-field"><span>Trạng thái gói</span><select aria-label="Trạng thái gói" className="gm-simple-input" value={status} onChange={event => setStatus(event.target.value)}>{['active', 'paused', 'cancelled'].map(value => <option key={value}>{value}</option>)}</select></label><PillButton disabled={busy} onClick={() => void run(() => api('/portal/users/' + row.id + '/subscription', { method: 'PATCH', body: JSON.stringify({ plan, status }) }), 'Đã cập nhật gói sử dụng.')}>Lưu gói</PillButton></div>;
}
