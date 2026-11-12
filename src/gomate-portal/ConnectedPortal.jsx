import AdminFinance from './AdminFinance';
import AdminManagement from './AdminManagement';
import AdminOverview from './AdminOverview';
import { portalActionError, groupCommandOperation } from './portalActionError';
import { PortalNotifications, usePortalNotice } from './PortalNotifications';
import PortalHeaderActions from './PortalHeaderActions';
import PostReviewPanel from './PostReviewPanel';
import { usePortalText } from './usePortalText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiBaseUrl, getSession, logout } from '../services/api';
import { Logo, Icon, PillButton, StatusPill, MetricCard } from './GoMatePortal';
import PortalAuth from './PortalAuth';
import BusinessVerificationForm from './BusinessVerificationForm';
import BusinessStaffManagement from './BusinessStaffManagement';
import LocationLibrary from './LocationLibrary';
import MultiGroupPostComposer from './MultiGroupPostComposer';
import ActiveCampaignDashboard from './ActiveCampaignDashboard';
import AdminBusinessReview from './AdminBusinessReview';
import BusinessWallet from './BusinessWallet';
import './connected-portal.css';

const eventPayload = value => value ? Object.fromEntries(['category','location','province','address','meetingPoint','startsAt','endsAt','registrationDeadline','estimatedCost','minParticipants','maxParticipants','itinerary','plan','planLink','coordinates'].filter(key=>value[key]!==undefined).map(key=>[key,value[key]])) : undefined;
const statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', deleted:'Đã xóa', publishing: 'Đang xuất bản', withdrawn: 'Đã rút' };
const tone = status => status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange';
const format = iso => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : '—';
async function pages(path, signal) {
  const items = [];
  for (let page = 1; page <= 500; page++) { const result = await api(path + '?page=' + page, { signal, timeoutMs: 8000 }); items.push(...result.items); if (items.length >= result.total || !result.items.length) return { items }; }
  throw Error('Danh sách quá lớn. Vui lòng liên hệ quản trị viên.');
}
async function fileValue(file) {
  if (!file || file.size > 10 * 1024 * 1024) throw Error('Chọn hồ sơ PDF/PNG/JPEG tối đa 10 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: file.type, base64: String(reader.result).split(',')[1] }); reader.onerror = () => reject(Error('Không đọc được hồ sơ')); reader.readAsDataURL(file); });
}
export default function ConnectedPortal() {
  return <PortalNotifications><PortalWorkspace /></PortalNotifications>;
}
function PortalWorkspace() {
  const notify = usePortalNotice();
  const setSuccess = message => notify(message);
  const t = usePortalText();
  const [me, setMe] = useState(null), [data, setData] = useState({ posts: [], applications: [], users: [], metrics: {} });
  const [selectedSection, setSection] = useState('overview'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const section = selectedSection === 'overview' && ['business', 'business-staff'].includes(me?.role) ? (me.role === 'business' ? 'create-post' : 'active-groups') : selectedSection;
  const [refreshError, setRefreshError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [application, setApplication] = useState({ company: '', category: '', accountType: 'business', country: 'VN', certificateNumber: '', website: '', taxId: '', address: '', representativeName: '', representativeTitle: '', representativeEmail: '', representativePhone: '' }), [document, setDocument] = useState(null), [applicationDetails, setApplicationDetails] = useState(null), [notes, setNotes] = useState({});
  const [supplementalDocument, setSupplementalDocument] = useState(null);
  const [locations, setLocations] = useState([]);
  const [businessGroups, setBusinessGroups] = useState([]), [businessStaff, setBusinessStaff] = useState([]);
  const [notices, setNotices] = useState([]);
  const lock = useRef(false), applicationRevision = useRef('');
  const loading = useRef(null);
  const loadAbort = useRef(null);
  const loadedToken = useRef(null);
  const load = useCallback((force = false) => {
    if (loading.current && !force) return loading.current;
    if (force) loadAbort.current?.abort();
    const controller = new AbortController(); loadAbort.current = controller;
    let deadlineExceeded = false;
    const deadline = setTimeout(() => { deadlineExceeded = true; controller.abort(); }, 12000);
    const options = { signal: controller.signal, timeoutMs: 8000 };
    const token = getSession()?.accessToken;
    const request = (async () => {
    if (!getSession()) { setMe(null); return; }
    if (window.navigator.onLine === false) throw Error('Mất kết nối mạng. Vui lòng kết nối lại rồi thử lại.');
    const profile = await api('/portal/me', options);
    if (controller.signal.aborted || getSession()?.accessToken !== token) { if (deadlineExceeded) throw Error('Workspace refresh timeout'); return; }
    if (loadedToken.current !== token) {
      loadedToken.current = token; applicationRevision.current = '';
      setData({ posts: [], applications: [], users: [], metrics: {} }); setLocations([]); setBusinessGroups([]); setBusinessStaff([]); setNotices([]); setSection('overview'); setNotes({});
      setDocument(null); setSupplementalDocument(null); setApplicationDetails(null);
      setApplication(current => Object.fromEntries(Object.keys(current).map(key => [key, key === 'country' ? 'VN' : key === 'accountType' ? 'business' : ''])));
    }
    setMe(profile); setError('');
    const reviewing = profile.role === 'admin', business = profile.role === 'business', employee = profile.role === 'business-staff';
    const revision=profile.application ? profile.application.id+':'+profile.application.version : '';
    if(profile.application && applicationRevision.current!==revision) { applicationRevision.current=revision; setApplication(current => ({...current,...Object.fromEntries(Object.keys(current).map(key=>[key,profile.application[key] || (key === 'country' ? 'VN' : key === 'accountType' ? 'business' : '')]))})); setApplicationDetails({...profile.application,licenseName:profile.application.license?.name}); }
    const resources = [
      [business || reviewing ? pages('/portal/posts', controller.signal) : { items: [] }, value => setData(current => ({ ...current, posts: value.items }))],
      [business || reviewing ? api('/portal/metrics', options) : {}, value => setData(current => ({ ...current, metrics: value }))],
      [reviewing ? pages('/portal/applications', controller.signal) : { items: [] }, value => setData(current => ({ ...current, applications: value.items }))],
      [business || employee ? pages('/portal/locations', controller.signal) : { items: [] }, value => setLocations(value.items)],
      [business || employee ? pages('/portal/groups', controller.signal) : { items: [] }, value => setBusinessGroups(value.items)],
      [business ? pages('/portal/staff', controller.signal) : { items: [] }, value => setBusinessStaff(value.items)],
      [pages('/portal/notifications', controller.signal), value => setNotices(value.items)],
    ];
    const results = await Promise.allSettled(resources.map(async ([pending, apply]) => { const value = await pending; if (!controller.signal.aborted && getSession()?.accessToken === token) apply(value); }));
    if (controller.signal.aborted || getSession()?.accessToken !== token) { if (deadlineExceeded) throw Error('Workspace refresh timeout'); return; }
    const failed = results.find(result => result.status === 'rejected');
    if (failed) { setRefreshError('Một số dữ liệu chưa tải được. Nhấn làm mới để thử lại.'); throw failed.reason; }
    setRefreshError('');
    })().catch(reason => { if (deadlineExceeded) { setRefreshError('Kết nối chậm. Nhấn làm mới để thử lại.'); throw Error('Kết nối quá thời gian. Vui lòng thử lại.'); } if (!controller.signal.aborted) throw reason; }).finally(() => clearTimeout(deadline));
    loading.current = request;
    const clear = () => { if (loading.current === request) loading.current = null; };
    void request.then(clear, clear);
    return request;
  }, []);
  useEffect(() => { let alive = true; void load().catch(reason => { if (alive) setError(portalActionError('tải dữ liệu không gian làm việc', reason)); }); return () => { alive = false; loadAbort.current?.abort(); loading.current = null; }; }, [load]);
  const run = async (operation, action) => { if (lock.current) return false; lock.current = true; setBusy(true); setError(''); try { loadAbort.current?.abort(); await loading.current?.catch(() => {}); await action(); return true; } catch (reason) { const message = portalActionError(operation, reason); setError(message); if (getSession()) notify(message, 'error'); return false; } finally { lock.current = false; setBusy(false); } };
  useEffect(() => {
    const reconnect = () => { if (getSession() && !lock.current) { setRefreshVersion(value => value + 1); void load(true).catch(reason => { setError(reason.message); setRefreshError('Chưa kết nối được máy chủ.'); }); } };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [load]);
  useEffect(() => {
    if (!me?.id) return;
    let disposed = false, timer, failures = 0;
    const schedule = () => { if (!disposed) timer = setTimeout(refresh, Math.min(120000, 30000 * 2 ** failures)); };
    const refresh = async () => {
      if (disposed) return;
      if (!lock.current && window.document.visibilityState !== 'hidden' && window.navigator.onLine !== false) {
        try { await load(); failures = 0; }
        catch { failures = Math.min(failures + 1, 3); if (!disposed) setRefreshError('Chưa cập nhật được dữ liệu mới. Đang hiển thị dữ liệu lần tải thành công gần nhất; hệ thống sẽ tự thử lại.'); }
      }
      schedule();
    };
    schedule();
    return () => { disposed = true; clearTimeout(timer); };
  }, [me?.id, load]);
  const apply = event => { event.preventDefault(); void run('gửi hồ sơ doanh nghiệp', async () => { const uploaded = document ? await fileValue(document) : undefined; const supplement = supplementalDocument ? await fileValue(supplementalDocument) : undefined; await api('/portal/applications', {method:'POST',body:JSON.stringify({...application,...(me.application?{version:me.application.version}:{}),...(uploaded?{document:uploaded}:{}),...(supplement?{supplementalDocument:supplement}:{})})}); setDocument(null); setSupplementalDocument(null); await load(); setSuccess('Đã gửi đầy đủ hồ sơ. Admin sẽ kiểm tra và thông báo kết quả.'); }); };
  const decide = (kind, row, status) => void run(`${status === 'approved' ? 'duyệt' : 'từ chối'} ${kind === 'applications' ? `hồ sơ doanh nghiệp “${row.company}”` : `bài đăng “${row.title}”`}`, async () => { if (status === 'rejected' && !notes[row.id]?.trim()) throw Error('Nhập lý do từ chối để doanh nghiệp có thể cập nhật.'); await api(`/portal/${kind}/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote: notes[row.id] || '', version: row.version }) }); await load(); const target = kind === 'applications' ? `hồ sơ doanh nghiệp “${row.company}”` : `bài đăng “${row.title}”`; setSuccess(status === 'approved' ? `Đã duyệt ${target}.` : `Đã từ chối ${target} và gửi lý do cho doanh nghiệp.`); });
  const download = (row, kind) => void run(`tải ${kind === 'supplemental' ? 'tài liệu bổ sung' : 'hồ sơ xác minh'} của “${row.company}”`, async () => { const response = await fetch(`${apiBaseUrl}/portal/applications/${row.id}/document${kind === 'supplemental' ? '?kind=supplemental' : ''}`, { headers: { Authorization: 'Bearer ' + getSession().accessToken } }); if (!response.ok) throw Error('Không tải được hồ sơ'); const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'ho-so-doanh-nghiep'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setSuccess(`Đã gửi yêu cầu tải ${kind === 'supplemental' ? 'tài liệu bổ sung' : 'hồ sơ xác minh'} của “${row.company}” đến trình duyệt.`); });
  const saveLocation = location => run(`${location.id ? 'cập nhật' : 'thêm'} địa điểm “${location.name}”`, async () => { const {name,address,city,phone,latitude,longitude,mapX,mapY,version} = location; await api('/portal/locations'+(location.id?'/'+location.id:''),{method:location.id?'PUT':'POST',body:JSON.stringify({name,address,city,phone,latitude,longitude,mapX,mapY,...(location.id?{version}:{})})}); await load(); setSuccess(`Đã ${location.id ? 'cập nhật' : 'thêm'} địa điểm “${name}”.`); });
  const deleteLocation = id => run(`xóa địa điểm “${locations.find(item => item.id === id)?.name || 'đã chọn'}”`, async () => { const location = locations.find(item=>item.id===id); await api('/portal/locations/'+id,{method:'DELETE',body:JSON.stringify({version:location?.version})}); await load(); setSuccess(`Đã xóa địa điểm “${location?.name || id}” khỏi thư viện.`); });
  const createLocationInline = async value => { let saved; const ok = await run(`lưu địa điểm “${value.name}” vào thư viện`, async()=>{saved=await api('/portal/locations',{method:'POST',body:JSON.stringify(value)});await load();setSuccess(`Đã lưu địa điểm “${value.name}” vào thư viện.`);}); return ok ? saved : null; };
  const postLifecycle = (post,action,groupId) => run(`${action === 'delete' ? 'xóa' : 'thu hồi'} ${groupId ? `nhóm “${post.groups?.find(item => item.activityId === groupId)?.name || 'đã chọn'}”` : `bài đăng “${post.title}”`}`, async()=>{const group = post.groups?.find(item => item.activityId === groupId); await api('/portal/posts/'+post.id+'/lifecycle',{method:'POST',body:JSON.stringify({version:post.version,action,...(groupId?{groupId}:{})})});await load();setSuccess(`Đã ${action === 'delete' ? 'xóa' : 'thu hồi'} ${groupId ? `nhóm “${group?.name || groupId}”` : `bài đăng “${post.title}”`}.`);});
  const publishMultiGroupPost = ({promo,groups}) => run(`gửi bài đăng “${promo.title}” và các nhóm để duyệt`, async () => {
    await api('/portal/posts',{method:'POST',body:JSON.stringify({...promo,badge:'Doanh nghiệp',discount:promo.discountPercent?'Giảm '+promo.discountPercent+'%':'',premium:false,border:'Solid',groups:groups.map(group=>({name:group.name,locationId:group.locationId,depositAmount:group.depositAmount,event:{category:group.category,location:group.location,address:group.location,province:group.city,meetingPoint:group.meetingPoint,startsAt:new Date(group.startsAt).toISOString(),endsAt:new Date(group.endsAt).toISOString(),maxParticipants:group.maxParticipants,estimatedCost:group.estimatedCost,...(Number.isFinite(locations.find(place=>place.id===group.locationId)?.longitude) && Number.isFinite(locations.find(place=>place.id===group.locationId)?.latitude) ? {coordinates:{type:'Point',coordinates:[locations.find(place=>place.id===group.locationId).longitude,locations.find(place=>place.id===group.locationId).latitude]}} : {})}}))})});
    await load(); setSuccess('Đã gửi bài và '+groups.length+' nhóm để duyệt. Các nhóm chỉ xuất hiện trên app sau khi Admin duyệt.'); setSection('posts');
  });
  const saveBusinessStaff = account => run(`${account.id ? 'cập nhật' : 'tạo tài khoản'} nhân viên “${account.name}”`, async () => { const previous=businessStaff.find(item=>item.id===account.id); const {name,email,phone,title,groupIds,password}=account; await api('/portal/staff'+(previous?'/'+previous.id:''),{method:previous?'PUT':'POST',body:JSON.stringify({name,email,phone,title,groupIds,...(previous?{version:previous.version}:{password})})}); await load(); setSuccess(previous ? `Đã cập nhật thông tin và phân công của nhân viên “${name}”.` : `Đã tạo tài khoản nhân viên “${name}”. Nhân viên có thể đăng nhập ngay.`); });
  const deleteBusinessStaff = id => run(`thu hồi quyền quản lý nhóm của nhân viên “${businessStaff.find(item => item.id === id)?.name || 'đã chọn'}”`, async () => { const account = businessStaff.find(item=>item.id===id); await api('/portal/staff/'+id,{method:'DELETE',body:JSON.stringify({version:account?.version})}); await load(); setSuccess(`Đã thu hồi quyền quản lý nhóm của nhân viên “${account?.name || id}”.`); });
  const groupCommand = (group,command,patch={}) => run(groupCommandOperation(group, command, patch), async () => {
    const url='/portal/groups/'+group.id+'/';
    await api(url+command,{method:command.startsWith('actions/')?'POST':command.startsWith('offers/')?'PUT':'PATCH',body:JSON.stringify({version:group.version,...patch})});
    await load();
    const target = `nhóm “${group.name}”`;
    if (command === 'actions/confirm-schedule') setSuccess(`Đã chốt lịch cho ${target}.`);
    else if (command === 'actions/start') setSuccess(`Đã bắt đầu hoạt động của ${target}.`);
    else if (command === 'actions/complete') setSuccess(`Đã kết thúc hoạt động của ${target}.`);
    else if (command.startsWith('requests/')) setSuccess(`Đã ${patch.status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu tham gia ${target}.`);
    else if (command.startsWith('offers/')) setSuccess(`Đã cập nhật ưu đãi của ${target}.`);
    else if (command === 'settings') setSuccess(`Đã cập nhật cài đặt ${target}.`);
    else if (command.startsWith('attendance/')) {
      const member = group.attendance?.find(item => item.userId === command.slice('attendance/'.length));
      const status = { present: 'có mặt', late: 'đến muộn', absent: 'vắng mặt', unmarked: 'chưa điểm danh' }[patch.status];
      setSuccess(`Đã cập nhật điểm danh${member ? ` của “${member.name}”` : ''}: ${status}.`);
    }
  });
  const groupChange = (group,patch) => run(`${patch.itinerary ? 'lưu lịch trình' : patch.depositMembers ? 'cập nhật tiền cọc' : patch.notifications ? 'gửi ưu đãi' : 'chốt lịch'} cho nhóm “${group.name}”`, async () => {
    let path,method='PUT',body={version:group.version},message;
    if(patch.itinerary) {path='plan';body.itinerary=patch.itinerary;message=`Đã lưu lịch trình của nhóm “${group.name}”.`;}
    else if(patch.depositMembers) {const member=patch.depositMembers.find(item=>group.depositMembers.find(old=>old.id===item.id)?.status!==item.status);if(!member) return;path='deposits/'+member.id;method='PATCH';body.status=member.status;message=member.status==='paid'?`Đã ghi nhận tiền cọc của “${member.name}”.`:`Đã chuyển tiền cọc của “${member.name}” về chưa thanh toán.`;}
    else if(patch.notifications) {const offer=patch.notifications.find(item=>!group.notifications.some(old=>old.id===item.id));if(!offer) return;path='offers';method='POST';body={...body,clientId:offer.id,title:offer.title,body:offer.body,expiresAt:offer.expiresAt?new Date(offer.expiresAt).toISOString():''};message=`Đã gửi ưu đãi “${offer.title}” đến thành viên nhóm “${group.name}”.`;}
    else if(patch.itineraryConfirmed) {path='actions/confirm-schedule';method='POST';message=`Đã chốt lịch cho nhóm “${group.name}”.`;}
    else throw Error('Thao tác chưa hợp lệ');
    await api('/portal/groups/'+group.id+'/'+path,{method,body:JSON.stringify(body)});await load();setSuccess(message);
  });
  const alerts = refreshError && <div role="status" className="gm-live-muted">{t(refreshError)}</div>;
  if (getSession() && !me) return <div className="gomate-portal gm-connected"><main className="gm-session-loading"><Logo />
    {error ? <><p role="alert" className="gm-form-error">{t(error)}</p><PillButton disabled={busy} onClick={() => void run('làm mới dữ liệu không gian làm việc', async () => { setRefreshVersion(value => value + 1); await load(true); setSuccess('Đã làm mới dữ liệu không gian làm việc.'); })}>{t(busy ? 'Đang tải...' : 'Thử lại')}</PillButton><PillButton variant="secondary" disabled={busy} onClick={() => void run('đăng xuất tài khoản', async () => { await logout(); setMe(null); setSuccess('Đã đăng xuất tài khoản.'); })}>{t('Đăng xuất')}</PillButton></> : <p role="status">{t('Đang tải không gian làm việc…')}</p>}
  </main></div>;
  if (!getSession() || !me || getSession()?.user.emailVerified === false) return <PortalAuth onAuthenticated={load} initialError={error} />;
  const business = me.role === 'business', employee = me.role === 'business-staff', reviewing = me.role === 'admin';
  const navigation = business ? [['wallet', 'Ví & đối soát', 'wallet'], ['create-post', 'Create Post', 'activity'], ['active-groups', 'Quản lý nhóm', 'users'], ['locations', 'Location Library', 'grid'], ['business-staff', 'Business Staff', 'users'], ['posts', 'Bài đăng của tôi', 'activity']] : employee ? [['active-groups','Nhóm được phân công','activity']] : reviewing ? [['overview', 'Tổng quan', 'grid'], ['businesses', 'Hồ sơ doanh nghiệp', 'shield'], ['posts', 'Duyệt bài đăng', 'edit'], ...(me.role === 'admin' ? [['finance', 'Tài chính & doanh thu', 'wallet'], ['users', 'Tài khoản', 'users'], ['reports', 'Báo cáo', 'shield'], ['tickets', 'Hỗ trợ', 'edit']] : [])] : [['overview', 'Xác minh doanh nghiệp', 'shield']];
  return <div className="gomate-portal gm-connected"><div className="gm-dashboard"><aside className="gm-sidebar"><div className="gm-sidebar-brand"><Logo /></div><div className="gm-sidebar-role">{t(business ? 'Doanh nghiệp' : employee ? 'Nhân sự doanh nghiệp' : reviewing ? 'Quản trị GoMate' : 'Đăng ký đối tác')}</div><nav className="gm-sidebar-nav">{navigation.map(([id, label, icon]) => <button key={id} type="button" onClick={() => setSection(id)} className={`gm-nav-item ${section === id ? 'is-active' : ''}`}><Icon name={icon} />{t(label)}</button>)}</nav><div className="gm-sidebar-bottom"><a href="/" className="gm-nav-item">{t("Mở app GoMate ↗")}</a><button className="gm-nav-item" onClick={() => void run('đăng xuất tài khoản', async () => { await logout(); setMe(null); setSuccess('Đã đăng xuất tài khoản.'); })}><Icon name="logout" />{t("Đăng xuất")}</button></div></aside><main className="gm-main"><header className="gm-topbar"><Logo compact /><div><strong>{t(me.application?.company || me.name)}</strong><p className="gm-live-muted">{t(business ? 'Doanh nghiệp đã xác minh' : employee ? 'Nhân sự doanh nghiệp' : me.role)}</p></div><PortalHeaderActions busy={busy} onRefresh={()=>void run('làm mới dữ liệu không gian làm việc', async () => { setRefreshVersion(value => value + 1); await load(true); setSuccess('Đã làm mới dữ liệu không gian làm việc.'); })} notifications={notices} /></header><div className={"gm-page-content " + (section === 'active-groups' ? 'gm-groups-page' : '')}><div className="gm-page-intro"><div><span className="gm-eyebrow">{t("GOMATE WORKSPACE")}</span><h2>{t(navigation.find(([id]) => id === section)?.[1] || 'Tổng quan')}</h2></div></div>{t(alerts)}
    {section === 'overview' && business && <div className="gm-metric-grid">{[['Bài đăng', data.metrics.posts || 0, 'edit'], ['Chờ duyệt', data.metrics.pendingPosts || 0, 'shield'], ['Đã duyệt', data.metrics.approvedPosts || 0, 'check']].map(([label, value, icon]) => <MetricCard key={label} label={t(label)} value={value} icon={icon} tone="purple" />)}</div>}
    {!business && !reviewing && !employee && <BusinessVerificationForm application={application} setApplication={setApplication} document={document} setDocument={setDocument} supplementalDocument={supplementalDocument} setSupplementalDocument={setSupplementalDocument} applicationDetails={applicationDetails} currentApplication={me.application} busy={busy} onSubmit={apply} />}
    {business && section === 'create-post' && <div className="gm-multi-post-page"><section className="gm-panel gm-live-panel gm-multi-post-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t("BUSINESS CAMPAIGN")}</span><h3>{t("Create one post and multiple groups")}</h3></div><StatusPill tone="green">{t(locations.length)} {t(" saved locations")}</StatusPill></div><MultiGroupPostComposer locations={locations} onSaveLocation={createLocationInline} onPublish={publishMultiGroupPost} busy={busy} /></section><section className="gm-panel gm-live-panel gm-generated-groups-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t("GROUPS")}</span><h3>{t("Generated groups")}</h3></div><span className="gm-group-count">{t(businessGroups.length)} {t(" total")}</span></div>{businessGroups.length ? businessGroups.map(group => <article className="gm-generated-group-preview-row" key={group.id}><span><strong>{group.name}</strong><small>{group.promotionalPostTitle} {t(" · ")}{t(group.meetingPoint || group.location)} {t(" · ")}{t(format(group.startsAt))}</small></span><StatusPill>{t(group.status === 'draft' ? 'Draft' : group.status)}</StatusPill></article>) : <p className="gm-live-muted">{t("Groups created from a post will appear here and can be assigned to Business Staff.")}</p>}</section></div>}
    {business && section === 'wallet' && <BusinessWallet refreshVersion={refreshVersion} />}
    {(business || employee) && section === 'active-groups' && <ActiveCampaignDashboard onNavigateStaff={business ? () => setSection('business-staff') : undefined} onOpenWallet={business ? () => setSection('wallet') : undefined} canConfigure={business} posts={data.posts} onLifecycle={business ? postLifecycle : undefined} groups={businessGroups} locations={locations} onAction={groupChange} onCommand={groupCommand} busy={busy} />}
    {business && section === 'locations' && <LocationLibrary locations={locations} onSave={saveLocation} onDelete={deleteLocation} />}
    {business && section === 'business-staff' && <BusinessStaffManagement busy={busy} groups={businessGroups} accounts={businessStaff} onSave={saveBusinessStaff} onDelete={deleteBusinessStaff} />}
    {reviewing && section === 'finance' && <AdminFinance refreshVersion={refreshVersion} />}
    {reviewing && ['users', 'businesses', 'posts', 'reports', 'tickets'].includes(section) && <AdminManagement refreshVersion={refreshVersion} key={section} kind={section} me={me} onChanged={load} />}
    {reviewing && section === 'overview' && <AdminOverview metrics={data.metrics} applications={data.applications} posts={data.posts} onNavigate={setSection} t={t} formatDate={format} />}
    {me.role === 'admin' && section === 'businesses' && <AdminBusinessReview applications={data.applications} busy={busy} notes={notes} setNotes={setNotes} onApplicationDecision={(row, status) => decide('applications', row, status)} onDownload={download} />}
    {business && ['overview', 'posts'].includes(section) && <PostReviewPanel
      posts={data.posts}
      business={business}
      reviewing={reviewing}
      busy={busy}
      notes={notes}
      onNoteChange={(id, note) => setNotes(value => ({ ...value, [id]: note }))}
      onResubmit={row => void run(`gửi lại bài đăng “${row.title}” để duyệt`, async () => {
        const { title, copy, badge, discount, border, premium, event, groups, discountPercent, offer, offerTerms } = row;
        await api('/portal/posts/' + row.id, { method: 'PUT', body: JSON.stringify({ title, copy, badge, discount, border, premium, event: eventPayload(event), groups: groups?.map(({ name, locationId, depositAmount, event }) => ({ name, locationId, depositAmount, event: eventPayload(event) })), discountPercent, offer, offerTerms, version: row.version }) });
        await load(); setSuccess(`Đã gửi lại bài đăng “${row.title}” để admin duyệt.`);
      })}
      onWithdraw={row => void run(`rút bài đăng “${row.title}” khỏi hàng đợi duyệt`, async () => {
        await api('/portal/posts/' + row.id, { method: 'DELETE', body: JSON.stringify({ version: row.version }) });
        await load(); setSuccess(`Đã rút bài đăng “${row.title}” khỏi hàng đợi duyệt.`);
      })}
      onSave={(post, value) => run('cập nhật bài đăng', async () => {
        await api('/portal/posts/' + post.id + '/details', { method: 'PATCH', body: JSON.stringify(value) });
        await load(); setSuccess('Đã lưu bài đăng.');
      })}
      onDecision={(row, status) => decide('posts', row, status)}
      onPostLifecycle={postLifecycle}
      t={t}
      formatDate={format}
      tone={tone}
      statusLabel={statusLabel}
/>}
  </div></main></div></div>;
}
