import { usePortalText } from './usePortalText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiBaseUrl, getSession, login, logout } from '../services/api';
import { Logo, Icon, AuthShell, PillButton, StatusPill, MetricCard } from './GoMatePortal';
import BusinessVerificationForm from './BusinessVerificationForm';
import BusinessStaffManagement from './BusinessStaffManagement';
import LocationLibrary from './LocationLibrary';
import MultiGroupPostComposer from './MultiGroupPostComposer';
import ActiveCampaignDashboard from './ActiveCampaignDashboard';
import AdminBusinessReview from './AdminBusinessReview';
import BusinessWallet from './BusinessWallet';
import './connected-portal.css';

const eventPayload = value => value ? Object.fromEntries(['category','location','province','address','meetingPoint','startsAt','endsAt','registrationDeadline','estimatedCost','minParticipants','maxParticipants','itinerary','plan','planLink','coordinates'].filter(key=>value[key]!==undefined).map(key=>[key,value[key]])) : undefined;
const statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', publishing: 'Đang xuất bản', withdrawn: 'Đã rút' };
const tone = status => status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange';
const format = iso => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : '—';
const fieldStyle = 'gm-simple-input';
function Field({ label, children }) {
  const t = usePortalText(); return <label className="gm-field"><span>{t(label)}</span>{children}</label>; }
async function pages(path) {
  const items = [];
  for (let page = 1; page <= 500; page++) { const result = await api(path + '?page=' + page); items.push(...result.items); if (items.length >= result.total || !result.items.length) return { items }; }
  throw Error('Danh sách quá lớn. Vui lòng liên hệ quản trị viên.');
}
async function fileValue(file) {
  if (!file || file.size > 10 * 1024 * 1024) throw Error('Chọn hồ sơ PDF/PNG/JPEG tối đa 10 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: file.type, base64: String(reader.result).split(',')[1] }); reader.onerror = () => reject(Error('Không đọc được hồ sơ')); reader.readAsDataURL(file); });
}
export default function ConnectedPortal() {
  const t = usePortalText();
  const [me, setMe] = useState(null), [data, setData] = useState({ posts: [], applications: [], users: [], metrics: {} });
  const [section, setSection] = useState('overview'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [application, setApplication] = useState({ company: '', category: 'Workshop', website: '', taxId: '', address: '', representativeName: '', representativeTitle: '', representativeEmail: '', representativePhone: '' }), [document, setDocument] = useState(null), [applicationDetails, setApplicationDetails] = useState(null), [notes, setNotes] = useState({});
  const [locations, setLocations] = useState([]);
  const [businessGroups, setBusinessGroups] = useState([]), [businessStaff, setBusinessStaff] = useState([]);
  const [staffRequests, setStaffRequests] = useState([]), [staffInvitations, setStaffInvitations] = useState([]), [notices, setNotices] = useState([]);
  const lock = useRef(false), applicationRevision = useRef('');
  const loading = useRef(null);
  const load = useCallback(() => {
    if (loading.current) return loading.current;
    const token = getSession()?.accessToken;
    const request = (async () => {
    if (!getSession()) { setMe(null); return; }
    const profile = await api('/portal/me');
    const reviewing = ['staff', 'admin'].includes(profile.role), business = profile.role === 'business', employee = profile.role === 'business-staff';
    const results = await Promise.allSettled([
      business || reviewing ? pages('/portal/posts') : {items:[]}, business || reviewing ? api('/portal/metrics') : {}, reviewing ? pages('/portal/applications') : {items:[]}, profile.role === 'admin' ? pages('/portal/users') : {items:[]},
      business || employee ? pages('/portal/locations') : {items:[]}, business || employee ? pages('/portal/groups') : {items:[]}, business ? pages('/portal/staff') : {items:[]}, profile.role === 'admin' ? pages('/portal/staff-requests') : {items:[]}, api('/portal/staff-invitations'), pages('/portal/notifications'),
    ]);
    // Wait for every request before releasing the load lock, even on failure.
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    if (getSession()?.accessToken !== token) return;
    const [posts, metrics, applications, users, places, groups, employees, reviews, incoming, notifications] = results.map(result => result.value);
    setData({posts:posts.items,metrics,applications:applications.items,users:users.items}); setLocations(places.items); setBusinessGroups(groups.items); setBusinessStaff(employees.items); setStaffRequests(reviews.items); setStaffInvitations(incoming.items); setNotices(notifications.items);
    const revision=profile.application ? profile.application.id+':'+profile.application.version : '';
    if(profile.application && applicationRevision.current!==revision) { applicationRevision.current=revision; setApplication(current => ({...current,...Object.fromEntries(Object.keys(current).map(key=>[key,profile.application[key] || '']))})); setApplicationDetails({...profile.application,licenseName:profile.application.license?.name}); }
    setMe(profile);
    setRefreshError('');
    })();
    loading.current = request;
    const clear = () => { if (loading.current === request) loading.current = null; };
    void request.then(clear, clear);
    return request;
  }, []);
  useEffect(() => { let alive = true; void load().catch(reason => { if (alive) setError(reason.message); }); return () => { alive = false; }; }, [load]);
  useEffect(() => { if (['business','business-staff'].includes(me?.role) && section === 'overview') setSection(me.role === 'business' ? 'create-post' : 'active-groups'); }, [me?.role, section]);
  const run = async action => { if (lock.current) return false; lock.current = true; setBusy(true); setError(''); setSuccess(''); try { await loading.current?.catch(() => {}); await action(); return true; } catch (reason) { setError(reason.message); return false; } finally { lock.current = false; setBusy(false); } };
  useEffect(() => {
    if (!me?.id) return;
    let disposed = false, timer, failures = 0;
    const schedule = () => { if (!disposed) timer = setTimeout(refresh, Math.min(120000, 15000 * 2 ** failures)); };
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
  const signIn = event => { event.preventDefault(); void run(async () => { await login(email, password); await load(); }); };
  const apply = event => { event.preventDefault(); void run(async () => { const uploaded = document ? await fileValue(document) : undefined; await api('/portal/applications', {method:'POST',body:JSON.stringify({...application,...(me.application?{version:me.application.version}:{}),...(uploaded?{document:uploaded}:{})})}); setDocument(null); await load(); setSuccess('Đã gửi đầy đủ hồ sơ. Staff sẽ kiểm tra và thông báo kết quả.'); }); };
  const decide = (kind, row, status) => void run(async () => { if (status === 'rejected' && !notes[row.id]?.trim()) throw Error('Nhập lý do từ chối để doanh nghiệp có thể cập nhật.'); await api(`/portal/${kind}/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote: notes[row.id] || '', version: row.version }) }); await load(); setSuccess(status === 'approved' ? 'Đã duyệt thành công.' : 'Đã gửi lý do từ chối.'); });
  const download = row => void run(async () => { const response = await fetch(`${apiBaseUrl}/portal/applications/${row.id}/document`, { headers: { Authorization: 'Bearer ' + getSession().accessToken } }); if (!response.ok) throw Error('Không tải được hồ sơ'); const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'ho-so-doanh-nghiep'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  const saveLocation = location => run(async () => { const {name,address,city,phone,latitude,longitude,mapX,mapY,version} = location; await api('/portal/locations'+(location.id?'/'+location.id:''),{method:location.id?'PUT':'POST',body:JSON.stringify({name,address,city,phone,latitude,longitude,mapX,mapY,...(location.id?{version}:{})})}); await load(); });
  const deleteLocation = id => run(async () => { await api('/portal/locations/'+id,{method:'DELETE',body:JSON.stringify({version:locations.find(item=>item.id===id)?.version})}); await load(); });
  const publishMultiGroupPost = ({promo,groups}) => run(async () => {
    await api('/portal/posts',{method:'POST',body:JSON.stringify({...promo,badge:'Doanh nghiệp',discount:promo.discountPercent?'Giảm '+promo.discountPercent+'%':'',premium:false,border:'Solid',groups:groups.map(group=>({name:group.name,locationId:group.locationId,depositAmount:group.depositAmount,event:{category:group.category,location:group.location,meetingPoint:group.meetingPoint,startsAt:new Date(group.startsAt).toISOString(),endsAt:new Date(group.endsAt).toISOString(),maxParticipants:group.maxParticipants,estimatedCost:group.estimatedCost,coordinates:{type:'Point',coordinates:[locations.find(place=>place.id===group.locationId)?.longitude,locations.find(place=>place.id===group.locationId)?.latitude]}}}))})});
    await load(); setSuccess('Đã gửi bài và '+groups.length+' nhóm để duyệt. Các nhóm chỉ xuất hiện trên app sau khi Staff duyệt.'); setSection('posts');
  });
  const saveBusinessStaff = account => run(async () => { const previous=businessStaff.find(item=>item.id===account.id); const {name,email,phone,title,groupIds}=account; await api('/portal/staff'+(previous?'/'+previous.id:''),{method:previous?'PUT':'POST',body:JSON.stringify({name,email,phone,title,groupIds,...(previous?{version:previous.version}:{})})}); await load(); });
  const deleteBusinessStaff = id => run(async () => { await api('/portal/staff/'+id,{method:'DELETE',body:JSON.stringify({version:businessStaff.find(item=>item.id===id)?.version})}); await load(); });
  const groupCommand = (group,command,patch={}) => run(async () => { const url='/portal/groups/'+group.id+'/'; await api(url+command,{method:command.startsWith('actions/')?'POST':command.startsWith('offers/')?'PUT':'PATCH',body:JSON.stringify({version:group.version,...patch})}); await load(); });
  const groupChange = (group,patch) => run(async () => {
    let path,method='PUT',body={version:group.version};
    if(patch.itinerary) {path='plan';body.itinerary=patch.itinerary;}
    else if(patch.depositMembers) {const member=patch.depositMembers.find(item=>group.depositMembers.find(old=>old.id===item.id)?.status!==item.status);if(!member) return;path='deposits/'+member.id;method='PATCH';body.status=member.status;}
    else if(patch.notifications) {const offer=patch.notifications.find(item=>!group.notifications.some(old=>old.id===item.id));if(!offer) return;path='offers';method='POST';body={...body,clientId:offer.id,title:offer.title,body:offer.body,expiresAt:offer.expiresAt?new Date(offer.expiresAt).toISOString():''};}
    else if(patch.itineraryConfirmed) {path='actions/confirm-schedule';method='POST';}
    else throw Error('Thao tác chưa hợp lệ');
    await api('/portal/groups/'+group.id+'/'+path,{method,body:JSON.stringify(body)});await load();
  });
  const staffDecision = (row,status) => run(async()=>{await api('/portal/staff-requests/'+row.id,{method:'PATCH',body:JSON.stringify({version:row.version,status,reviewNote:notes[row.id] || ''})});await load();});
  const alerts = <>{error && <div role="alert" className="gm-form-error">{t(error)}</div>}{refreshError && <div role="status" className="gm-live-muted">{t(refreshError)}</div>}{success && <div role="status" className="gm-live-success"><Icon name="check" />{t(success)}</div>}</>;
  if (!getSession() || !me) return <div className="gomate-portal gm-connected"><AuthShell asideTitle={t("Kết nối doanh nghiệp với cộng đồng.")} asideText={t("Tạo sự kiện, chia sẻ ưu đãi và cùng GoMate mang đến những trải nghiệm đáng nhớ.")}><div className="gm-auth-panel"><Logo /><div className="gm-auth-heading"><span className="gm-eyebrow">{t("GOMATE PARTNERS")}</span><h2>{t("Đăng nhập portal")}</h2><p>{t("Dùng tài khoản GoMate của bạn. Vai trò được xác nhận từ hệ thống.")}</p></div><form className="gm-auth-form" onSubmit={signIn}><Field label={t("Email")}><input className={fieldStyle} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></Field><Field label={t("Mật khẩu")}><input className={fieldStyle} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></Field>{t(alerts)}<PillButton type="submit" disabled={busy}>{t("Đăng nhập")}</PillButton></form><div className="gm-live-links"><a href="/demo">{t("Bộ demo nhiều tài khoản")}</a><a href="/#/auth/signup">{t("Đăng ký tài khoản GoMate")}</a><a href="/">{t("Mở app")}</a></div></div></AuthShell></div>;
  const business = me.role === 'business', employee = me.role === 'business-staff', reviewing = ['staff', 'admin'].includes(me.role);
  const navigation = business ? [['wallet', 'Ví & đối soát', 'wallet'], ['create-post', 'Create Post', 'activity'], ['active-groups', 'Active Groups', 'activity'], ['locations', 'Location Library', 'grid'], ['business-staff', 'Business Staff', 'users'], ['posts', 'Bài đăng của tôi', 'activity']] : employee ? [['active-groups','Nhóm được phân công','activity']] : reviewing ? [['overview', 'Tổng quan', 'grid'], ['businesses', 'Hồ sơ doanh nghiệp', 'shield'], ['posts', 'Duyệt bài đăng', 'edit'], ...(me.role === 'admin' ? [['users', 'Tài khoản', 'users']] : [])] : [['overview', 'Xác minh doanh nghiệp', 'shield']];
  return <div className="gomate-portal gm-connected"><div className="gm-dashboard"><aside className="gm-sidebar"><div className="gm-sidebar-brand"><Logo /></div><div className="gm-sidebar-role">{t(business ? 'Doanh nghiệp' : employee ? 'Nhân sự doanh nghiệp' : reviewing ? 'Kiểm duyệt GoMate' : 'Đăng ký đối tác')}</div><nav className="gm-sidebar-nav">{navigation.map(([id, label, icon]) => <button key={id} type="button" onClick={() => setSection(id)} className={`gm-nav-item ${section === id ? 'is-active' : ''}`}><Icon name={icon} />{t(label)}</button>)}</nav><div className="gm-sidebar-bottom"><a href="/demo" className="gm-nav-item">{t("Hướng dẫn demo")}</a><a href="/" className="gm-nav-item">{t("Mở app GoMate ↗")}</a><button className="gm-nav-item" onClick={() => void run(async () => { await logout(); setMe(null); })}><Icon name="logout" />{t("Đăng xuất")}</button></div></aside><main className="gm-main"><header className="gm-topbar"><Logo compact /><div><strong>{t(me.application?.company || me.name)}</strong><p className="gm-live-muted">{t(business ? 'Doanh nghiệp đã xác minh' : employee ? 'Nhân sự doanh nghiệp' : me.role)}</p></div><PillButton variant="secondary" disabled={busy} onClick={() => void run(load)}>{t("Làm mới")}</PillButton></header><div className="gm-page-content"><div className="gm-page-intro"><div><span className="gm-eyebrow">{t("GOMATE WORKSPACE")}</span><h2>{t(navigation.find(([id]) => id === section)?.[1] || 'Tổng quan')}</h2><p>{t(business ? 'Sự kiện thật, ưu đãi rõ ràng, kết nối cộng đồng.' : reviewing ? 'Kiểm tra hồ sơ và sự kiện trước khi hiển thị trên app.' : employee ? 'Quản lý các nhóm được doanh nghiệp phân công.' : 'Xác minh để trở thành đơn vị tổ chức trên GoMate.')}</p></div></div>{t(alerts)}
    {staffInvitations.map(invite=><section className="gm-panel" key={invite.id}><h3>Lời mời làm nhân sự</h3><p>{invite.businessName} · {invite.name} · {invite.title}</p><PillButton disabled={busy} onClick={()=>void run(async()=>{await api('/portal/staff-invitations/'+invite.id,{method:'PATCH',body:JSON.stringify({version:invite.version,status:'accepted'})});await load();})}>Đồng ý làm nhân sự</PillButton><PillButton disabled={busy} variant="secondary" onClick={()=>void run(async()=>{await api('/portal/staff-invitations/'+invite.id,{method:'PATCH',body:JSON.stringify({version:invite.version,status:'declined'})});await load();})}>Từ chối</PillButton></section>)}
    {!!notices.length && <details className="gm-panel"><summary>Thông báo doanh nghiệp ({notices.length})</summary>{notices.map(notice=><p key={notice.id}><strong>{notice.title}</strong> · {notice.text}</p>)}</details>}
    {section === 'overview' && (business || reviewing) && <div className="gm-metric-grid">{(business ? [['Bài đăng', data.metrics.posts || 0, 'edit'], ['Chờ duyệt', data.metrics.pendingPosts || 0, 'shield'], ['Đã duyệt', data.metrics.approvedPosts || 0, 'check']] : [['Hồ sơ chờ duyệt', data.metrics.pendingBusinesses || 0, 'users'], ['Bài chờ duyệt', data.metrics.pendingPosts || 0, 'edit'], ['Tài khoản', data.metrics.users || 0, 'users']]).map(([label, value, icon]) => <MetricCard key={label} label={t(label)} value={value} icon={icon} tone="purple" />)}</div>}
    {!business && !reviewing && !employee && <BusinessVerificationForm application={application} setApplication={setApplication} document={document} setDocument={setDocument} applicationDetails={applicationDetails} currentApplication={me.application} busy={busy} onSubmit={apply} />}
    {business && section === 'create-post' && <div className="gm-multi-post-page"><section className="gm-panel gm-live-panel gm-multi-post-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t("BUSINESS CAMPAIGN")}</span><h3>{t("Create one post and multiple groups")}</h3></div><StatusPill tone="green">{t(locations.length)} {t(" saved locations")}</StatusPill></div><MultiGroupPostComposer locations={locations} onPublish={publishMultiGroupPost} busy={busy} /></section><section className="gm-panel gm-live-panel gm-generated-groups-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t("GROUPS")}</span><h3>{t("Generated groups")}</h3></div><span className="gm-group-count">{t(businessGroups.length)} {t(" total")}</span></div>{businessGroups.length ? businessGroups.map(group => <article className="gm-generated-group-preview-row" key={group.id}><span><strong>{group.name}</strong><small>{group.promotionalPostTitle} {t(" · ")}{t(group.meetingPoint || group.location)} {t(" · ")}{t(format(group.startsAt))}</small></span><StatusPill>{t(group.status === 'draft' ? 'Draft' : group.status)}</StatusPill></article>) : <p className="gm-live-muted">{t("Groups created from a post will appear here and can be assigned to Business Staff.")}</p>}</section></div>}
    {business && section === 'wallet' && <BusinessWallet />}
    {(business || employee) && section === 'active-groups' && <ActiveCampaignDashboard groups={businessGroups} locations={locations} onAction={groupChange} onCommand={groupCommand} busy={busy} />}
    {business && section === 'locations' && <LocationLibrary locations={locations} onSave={saveLocation} onDelete={deleteLocation} />}
    {business && section === 'business-staff' && <BusinessStaffManagement groups={businessGroups} accounts={businessStaff} onSave={saveBusinessStaff} onDelete={deleteBusinessStaff} />}
    {me.role === 'admin' && section === 'businesses' && <AdminBusinessReview applications={data.applications} staffRequests={staffRequests} onStaffDecision={staffDecision} busy={busy} notes={notes} setNotes={setNotes} onApplicationDecision={(row, status) => { decide('applications', row, status); setSuccess(''); }} onDownload={download} />}
    {reviewing && (section === 'overview' || (me.role === 'staff' && section === 'businesses')) && <section className="gm-panel gm-live-panel"><h3>{t("Hồ sơ doanh nghiệp")}</h3>{!data.applications.length && <p>{t("Chưa có hồ sơ.")}</p>}{data.applications.map(row => <article className="gm-live-review" key={row.id}><div><h4>{row.company}</h4><p>{t(row.category)} {t(" · ")}{t(row.website || 'Chưa có website')}</p><StatusPill tone={tone(row.status)}>{t(statusLabel[row.status])}</StatusPill></div><button className="gm-text-action" onClick={() => download(row)}>{t("Tải hồ sơ xác minh ↗")}</button>{row.status === 'pending' && <><input aria-label={t('Ghi chú hồ sơ ' + row.company)} className={fieldStyle} placeholder={t("Ghi chú kiểm duyệt")} value={notes[row.id] || ''} onChange={event => setNotes(value => ({ ...value, [row.id]: event.target.value }))} /><div className="gm-live-actions"><PillButton disabled={busy} onClick={() => decide('applications', row, 'approved')}>{t("Duyệt doanh nghiệp")}</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => decide('applications', row, 'rejected')}>{t("Từ chối hồ sơ")}</PillButton></div></>}</article>)}</section>}
    {(business || reviewing) && ['overview', 'posts'].includes(section) && <section className="gm-panel gm-live-panel"><h3>{t(business ? 'Bài đăng của tôi' : 'Duyệt bài đăng')}</h3>{!data.posts.length && <p>{t("Chưa có bài đăng.")}</p>}{data.posts.map(row => <article className="gm-live-review" key={row.id}><div className="gm-live-review-title"><h4>{row.title}</h4><StatusPill tone={tone(row.status)}>{t(statusLabel[row.status])}</StatusPill></div><p>{row.businessName} {t(" · ")}{row.copy}</p>{row.event && <p>{t(format(row.event.startsAt))} {t(" → ")}{t(format(row.event.endsAt))} {t(" · ")}{t(row.event.location)} {t(" · ")}{t(row.event.maxParticipants)} {t(" người")}</p>}<p>{t(row.discountPercent ? `Giảm ${row.discountPercent}% · ` : '')}{t(row.offer || row.discount)}{t(row.offerTerms ? ' · ' + row.offerTerms : '')}</p>{row.reviewNote && <p>{t("Ghi chú: ")}{row.reviewNote}</p>}{business && ['pending','rejected'].includes(row.status) && <div><PillButton disabled={busy} onClick={()=>void run(async()=>{const {title,copy,badge,discount,border,premium,event,groups,discountPercent,offer,offerTerms}=row;await api('/portal/posts/'+row.id,{method:'PUT',body:JSON.stringify({title,copy,badge,discount,border,premium,event:eventPayload(event),groups:groups?.map(({name,locationId,depositAmount,event})=>({name,locationId,depositAmount,event:eventPayload(event)})),discountPercent,offer,offerTerms,version:row.version})});await load();})}>Gửi lại duyệt</PillButton><PillButton variant="secondary" disabled={busy} onClick={()=>void run(async()=>{await api('/portal/posts/'+row.id,{method:'DELETE',body:JSON.stringify({version:row.version})});await load();})}>Rút bài</PillButton></div>}{row.groups?.map(group=><p key={group.activityId}>{group.name} · {format(group.event.startsAt)}{row.status==='approved' && <a href={'/#/app/home/activityDetail/'+group.activityId}> · Xem nhóm trong app ↗</a>}</p>)}{row.activityId && row.status === 'approved' && <a href={`/#/app/home/activityDetail/${row.activityId}`}>{t("Xem sự kiện trong app ↗")}</a>}{reviewing && row.status === 'pending' && <><input aria-label={t('Ghi chú bài ' + row.title)} className={fieldStyle} placeholder={t("Ghi chú kiểm duyệt")} value={notes[row.id] || ''} onChange={event => setNotes(value => ({ ...value, [row.id]: event.target.value }))} /><div className="gm-live-actions"><PillButton disabled={busy} onClick={() => decide('posts', row, 'approved')}>{t("Duyệt và đưa lên app")}</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => decide('posts', row, 'rejected')}>{t("Từ chối bài")}</PillButton></div></>}</article>)}</section>}
    {me.role === 'admin' && section === 'users' && <section className="gm-panel gm-live-panel"><h3>{t("Tài khoản GoMate")}</h3>{data.users.map(row => <div className="gm-live-review" key={row.id}><strong>{row.name}</strong><span>{row.email}</span><StatusPill>{t(row.effectiveRole)}</StatusPill></div>)}</section>}
  </div></main></div></div>;
}
