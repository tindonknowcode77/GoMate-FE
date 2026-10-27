import { useCallback, useEffect, useState } from 'react';
import { api, apiBaseUrl, getSession, login, logout, post, setUnauthorizedHandler, verifyEmail } from '../services/api';
import { Logo, Icon, AuthShell, PillButton, StatusPill, MetricCard } from './GoMatePortal';
import { Tickets } from './ConnectedPortal';
import { usePortalText } from './usePortalText';
import BusinessVerificationForm from './BusinessVerificationForm';
import BusinessStaffManagement from './BusinessStaffManagement';
import LocationLibrary, { initialBusinessLocations } from './LocationLibrary';
import MultiGroupPostComposer from './MultiGroupPostComposer';
import ActiveCampaignDashboard, { initialBusinessGroups } from './ActiveCampaignDashboard';
import AdminBusinessReview from './AdminBusinessReview';
import './connected-portal.css';

const statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', publishing: 'Đang xuất bản' };
const tone = status => status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange';
const format = iso => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : '—';
const fieldStyle = 'gm-simple-input';
function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}

function PortalLoginPage({ onLogin }) {
  const t = usePortalText();
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', code: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const updateField = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      if (authMode === 'login') {
        await login(email, form.password);
        await onLogin();
      } else if (authMode === 'register') {
        await post('/auth/register', { email, name: form.fullName.trim(), password: form.password });
        setAuthMode('verify');
        setNotice('Nhập mã xác minh 6 chữ số đã gửi tới email của bạn.');
      } else if (authMode === 'verify') {
        await verifyEmail(email, form.code.trim());
        await onLogin();
      }
    } catch (reason) {
      setError(reason.message || 'Yêu cầu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gomate-portal gm-connected">
      <AuthShell
        asideTitle={t('Kết nối doanh nghiệp với cộng đồng.')}
        asideText={t('Tạo sự kiện, chia sẻ ưu đãi và cùng GoMate mang đến những trải nghiệm đáng nhớ.')}
      >
        <div className="gm-auth-panel">
          <div className="gm-auth-brand-mark"><Logo /></div>
          <div className="gm-auth-heading">
            <span className="gm-eyebrow">{t('GOMATE PARTNERS')}</span>
            <h2>{t(authMode === 'login' ? 'Đăng nhập portal' : authMode === 'register' ? 'Tạo tài khoản' : 'Xác minh email')}</h2>
            <p>{t('Dùng tài khoản GoMate của bạn. Vai trò được xác nhận từ hệ thống.')}</p>
          </div>
          <form className="gm-auth-form" onSubmit={handleSubmit}>
            {authMode === 'register' && (
              <label className="gm-field">
                <span>{t('Họ và tên')}</span>
                <div className="gm-input-wrap">
                  <Icon name="users" size={17} />
                  <input value={form.fullName} onChange={updateField('fullName')} autoComplete="name" required />
                </div>
              </label>
            )}
            <label className="gm-field">
              <span>{t('Email')}</span>
              <div className="gm-input-wrap">
                <Icon name="users" size={17} />
                <input type="email" autoComplete="email" required value={form.email} onChange={updateField('email')} aria-invalid={Boolean(error)} />
              </div>
            </label>
            {authMode !== 'verify' && (
              <label className="gm-field">
                <span>{t('Mật khẩu')}</span>
                <div className="gm-input-wrap">
                  <Icon name="shield" size={17} />
                  <input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={form.password} onChange={updateField('password')} aria-invalid={Boolean(error)} />
                </div>
              </label>
            )}
            {authMode === 'verify' && (
              <label className="gm-field">
                <span>{t('Mã xác minh 6 chữ số')}</span>
                <div className="gm-input-wrap">
                  <Icon name="shield" size={17} />
                  <input pattern="[0-9]{6}" inputMode="numeric" required value={form.code} onChange={updateField('code')} />
                </div>
              </label>
            )}
            {error && <div role="alert" className="gm-form-error">{t(error)}</div>}
            {notice && <div role="status" className="gm-live-success">{t(notice)}</div>}
            <PillButton type="submit" disabled={busy} className="gm-btn--wide">
              {t(busy ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : authMode === 'register' ? 'Đăng ký' : 'Xác minh')}
            </PillButton>
          </form>
          <div className="gm-live-links gm-registration-links">
            {authMode !== 'login' ? (
              <button type="button" onClick={() => { setError(''); setNotice(''); setAuthMode('login'); }}>{t('Quay lại đăng nhập')}</button>
            ) : (
              <>
                <button type="button" onClick={() => { setError(''); setNotice(''); setAuthMode('register'); }}>{t('Tạo tài khoản mới')}</button>
                <button type="button" onClick={() => { setError(''); setNotice(''); setAuthMode('verify'); }}>{t('Nhập mã xác minh')}</button>
              </>
            )}
          </div>
          <div className="gm-live-links">
            <a href="/demo">{t('Bộ demo nhiều tài khoản')}</a>
            <a href="/#/auth/signup">{t('Đăng ký tài khoản GoMate')}</a>
            <a href="/">{t('Mở app')}</a>
          </div>
        </div>
      </AuthShell>
    </div>
  );
}

async function pages(path) {
  const items = [];
  for (let page = 1; page <= 500; page++) { const result = await api(path + '?page=' + page); items.push(...result.items); if (items.length >= result.total || !result.items.length) return { items }; }
  throw Error('Danh sách quá lớn. Vui lòng liên hệ quản trị viên.');
}
async function fileValue(file) {
  if (!file || file.size > 10 * 1024 * 1024) throw Error('Chọn hồ sơ PDF/PNG/JPEG tối đa 10 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: file.type, base64: String(reader.result).split(',')[1] }); reader.onerror = () => reject(Error('Không đọc được hồ sơ')); reader.readAsDataURL(file); });
}
const emptyDraft = () => ({
  title: '',
  copy: '',
  category: '',
  location: '',
  meetingPoint: '',
  startsAt: '',
  endsAt: '',
  maxParticipants: '',
  estimatedCost: '',
  discountPercent: '',
  offer: '',
  offerTerms: '',
  plan: '',
});

export default function PartnerPortal() {
  const t = usePortalText();
  const [me, setMe] = useState(null), [data, setData] = useState({ posts: [], applications: [], users: [], metrics: {}, categories: [] });
  const [section, setSection] = useState('default'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [application, setApplication] = useState({ company: '', category: 'Workshop', website: '', taxId: '', address: '', representativeName: '', representativeTitle: '', representativeEmail: '', representativePhone: '' }), [document, setDocument] = useState(null), [applicationDetails, setApplicationDetails] = useState(null), [notes, setNotes] = useState({});
  const [locations, setLocations] = useState(initialBusinessLocations);
  const [businessGroups, setBusinessGroups] = useState(initialBusinessGroups), [businessStaff, setBusinessStaff] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  useEffect(() => {
    setUnauthorizedHandler(() => { setMe(null); setError(''); });
    return () => setUnauthorizedHandler();
  }, []);
  const load = useCallback(async () => {
    if (!getSession()) { setMe(null); return; }
    const [profile, options] = await Promise.all([api('/portal/me'), api('/portal/options').catch(() => ({ activityCategories: [] }))]);
    setMe(profile);
    const categories = Array.isArray(options?.activityCategories) ? options.activityCategories : [];
    if (['business', 'staff', 'admin'].includes(profile.role)) {
      const [posts, metrics, applications, users] = await Promise.all([
        pages('/portal/posts'),
        api('/portal/metrics'),
        ['staff', 'admin'].includes(profile.role) ? pages('/portal/applications') : { items: [] },
        profile.role === 'admin' ? pages('/portal/users') : { items: [] },
      ]);
      setData({ posts: posts.items, applications: applications.items, users: users.items, metrics, categories });
    } else {
      setData(current => ({ ...current, categories }));
    }
  }, []);
  useEffect(() => {
    if (!getSession()) return;
    let alive = true;
    Promise.resolve().then(() => load()).catch(reason => { if (alive) setError(reason.message); });
    return () => { alive = false; };
  }, [load]);
  const run = async action => { if (busy) return; setBusy(true); setError(''); setSuccess(''); try { await action(); } catch (reason) { setError(reason.message); } finally { setBusy(false); } };
  const apply = event => {
    event.preventDefault();
    void run(async () => {
      const uploaded = await fileValue(document);
      const contact = [application.representativeName, application.representativeTitle, application.representativeEmail, application.representativePhone].filter(Boolean).join(' · ').slice(0, 120);
      await api('/portal/applications', {
        method: 'POST',
        body: JSON.stringify({
          company: application.company,
          category: application.category,
          website: application.website,
          ...(application.taxId ? { taxId: application.taxId } : {}),
          ...(application.address ? { address: application.address } : {}),
          ...(contact ? { contact } : {}),
          document: uploaded,
        }),
      });
      setApplicationDetails({ ...application, licenseName: document.name });
      await load();
      setSuccess('Đã gửi hồ sơ. Staff sẽ kiểm tra trước khi bạn có thể đăng sự kiện.');
    });
  };
  const publish = event => {
    event.preventDefault();
    void run(async () => {
      const plan = draft.plan.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const discountPercent = draft.discountPercent === '' ? 0 : Number(draft.discountPercent);
      await api('/portal/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title,
          copy: draft.copy,
          badge: 'Doanh nghiệp',
          discount: discountPercent ? `Giảm ${discountPercent}%` : '',
          premium: false,
          border: 'Solid',
          discountPercent,
          offer: draft.offer,
          offerTerms: draft.offerTerms,
          event: {
            category: draft.category,
            location: draft.location,
            meetingPoint: draft.meetingPoint,
            startsAt: new Date(draft.startsAt + ':00+07:00').toISOString(),
            endsAt: new Date(draft.endsAt + ':00+07:00').toISOString(),
            maxParticipants: Number(draft.maxParticipants),
            estimatedCost: Number(draft.estimatedCost),
            plan,
          },
        }),
      });
      await load(); setDraft(emptyDraft()); setSuccess('Đã gửi sự kiện cho staff. Sau khi được duyệt, bài sẽ xuất hiện trong app.');
    });
  };
  const decide = (kind, row, status) => {
    const reviewNote = notes[row.id] || '';
    if (status === 'rejected' && !reviewNote.trim()) { setError('Nhập lý do từ chối để doanh nghiệp có thể cập nhật.'); return; }
    void run(async () => { await api(`/portal/${kind}/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote }) }); await load(); setSuccess(status === 'approved' ? 'Đã duyệt thành công.' : 'Đã gửi lý do từ chối.'); });
  };
  const changeRole = (userId, role) => {
    void run(async () => { await api(`/portal/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); await load(); setSuccess('Đã cập nhật vai trò tài khoản.'); });
  };
  const download = row => {
    void run(async () => { const response = await fetch(`${apiBaseUrl}/portal/applications/${row.id}/document`, { headers: { Authorization: 'Bearer ' + getSession().accessToken } }); if (!response.ok) throw Error('Không tải được hồ sơ'); const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'ho-so-doanh-nghiep'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  };
  const saveLocation = location => setLocations(current => location.id ? current.map(item => item.id === location.id ? location : item) : [...current, { ...location, id: `location-${Date.now()}` }]);
  const deleteLocation = id => setLocations(current => current.filter(location => location.id !== id));
  const publishMultiGroupPost = ({ promo, groups }) => void run(async () => {
    const offerCopy = [promo.offer && `Offer: ${promo.offer}`, promo.offerTerms && `Terms: ${promo.offerTerms}`].filter(Boolean).join('\n');
    const postCopy = [promo.copy.slice(0, Math.max(0, 3000 - offerCopy.length - 2)), offerCopy].filter(Boolean).join('\n\n');
    const createdPost = await api('/portal/posts', { method: 'POST', body: JSON.stringify({ title: promo.title, copy: postCopy, badge: 'Doanh nghiệp', discount: promo.discountPercent ? `Giảm ${promo.discountPercent}%` : '', premium: false, border: 'Solid' }) });
    const savedGroups = groups.map((group, index) => ({ ...group, id: `business-group-${Date.now()}-${index}`, promotionalPostId: createdPost.id, promotionalPostTitle: promo.title, promotion: promo, status: 'active', depositMembers: [], itinerary: [], notifications: [] }));
    setBusinessGroups(current => [...savedGroups, ...current]);
    await load();
    setSuccess(`Đã gửi bài quảng bá và tạo ${savedGroups.length} nhóm riêng trong bản xem trước. Bài chờ staff duyệt.`);
  });
  const saveBusinessStaff = account => setBusinessStaff(current => account.id && current.some(item => item.id === account.id) ? current.map(item => item.id === account.id ? account : item) : [account, ...current]);
  const deleteBusinessStaff = id => setBusinessStaff(current => current.filter(account => account.id !== id));
  const patch = key => event => setDraft(value => ({ ...value, [key]: event.target.value }));
  const alerts = <>{error && <div role="alert" className="gm-form-error">{t(error)}</div>}{success && <div role="status" className="gm-live-success"><Icon name="check" />{t(success)}</div>}</>;
  if (!getSession() || !me) {
    return <PortalLoginPage onLogin={load} />;
  }
  const business = me.role === 'business', reviewing = ['staff', 'admin'].includes(me.role);
  const isBusinessPath = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/business';
  const activeSection = section === 'default' ? (business && !isBusinessPath ? 'create-post' : 'overview') : section;
  const navigation = business
    ? [
        ['overview', 'Tổng quan', 'grid'],
        ['studio', 'Tạo sự kiện', 'edit'],
        ['create-post', 'Create Post', 'activity'],
        ['active-groups', 'Active Groups', 'activity'],
        ['locations', 'Location Library', 'grid'],
        ['business-staff', 'Business Staff', 'users'],
        ['posts', 'Bài đăng của tôi', 'activity'],
        ['billing', 'Gói dịch vụ', 'shield'],
        ['support', 'Hỗ trợ', 'chat'],
      ]
    : reviewing
    ? [['overview', 'Tổng quan', 'grid'], ['businesses', 'Hồ sơ doanh nghiệp', 'shield'], ['posts', 'Duyệt bài đăng', 'edit'], ['support', 'Hỗ trợ', 'chat'], ...(me.role === 'admin' ? [['users', 'Tài khoản', 'users']] : [])]
    : [['overview', 'Xác minh doanh nghiệp', 'shield'], ['support', 'Hỗ trợ', 'chat']];
  return <div className="gomate-portal gm-connected"><div className="gm-dashboard"><aside className="gm-sidebar"><div className="gm-sidebar-brand"><Logo /></div><div className="gm-sidebar-role">{t(business ? 'Doanh nghiệp' : reviewing ? 'Kiểm duyệt GoMate' : 'Đăng ký đối tác')}</div><nav className="gm-sidebar-nav">{navigation.map(([id, label, icon]) => <button key={id} type="button" onClick={() => setSection(id)} className={`gm-nav-item ${activeSection === id ? 'is-active' : ''}`}><Icon name={icon} />{t(label)}</button>)}</nav><div className="gm-sidebar-bottom"><a href="/demo" className="gm-nav-item">{t('Hướng dẫn demo')}</a><a href="/" className="gm-nav-item">{t('Mở app GoMate ↗')}</a><button className="gm-nav-item" onClick={() => void run(async () => { await logout(); setMe(null); })}><Icon name="logout" />{t('Đăng xuất')}</button></div></aside><main className="gm-main"><header className="gm-topbar"><Logo compact /><div><strong>{t(me.application?.company || me.name)}</strong><p className="gm-live-muted">{t(business ? 'Doanh nghiệp đã xác minh' : me.role)}</p></div><PillButton variant="secondary" disabled={busy} onClick={() => void run(load)}>{t('Làm mới')}</PillButton></header><div className="gm-page-content"><div className="gm-page-intro"><div><span className="gm-eyebrow">{t('GOMATE WORKSPACE')}</span><h2>{t(navigation.find(([id]) => id === activeSection)?.[1] || 'Tổng quan')}</h2><p>{t(business ? 'Sự kiện thật, ưu đãi rõ ràng, kết nối cộng đồng.' : reviewing ? 'Kiểm tra hồ sơ và sự kiện trước khi hiển thị trên app.' : 'Xác minh để trở thành đơn vị tổ chức trên GoMate.')}</p></div></div>{alerts}
    {activeSection === 'overview' && (business || reviewing) && <div className="gm-metric-grid">{(business ? [['Bài đăng', data.metrics.posts || 0, 'edit'], ['Chờ duyệt', data.metrics.pendingPosts || 0, 'shield'], ['Đã duyệt', data.metrics.approvedPosts || 0, 'check']] : [['Hồ sơ chờ duyệt', data.metrics.pendingBusinesses || 0, 'users'], ['Bài chờ duyệt', data.metrics.pendingPosts || 0, 'edit'], ['Tài khoản', data.metrics.users || 0, 'users']]).map(([label, value, icon]) => <MetricCard key={label} label={t(label)} value={value} icon={icon} tone="purple" />)}</div>}
    {!business && !reviewing && activeSection === 'overview' && <BusinessVerificationForm application={application} setApplication={setApplication} document={document} setDocument={setDocument} applicationDetails={applicationDetails} currentApplication={me.application} busy={busy} onSubmit={apply} />}
    {business && ['studio', 'overview'].includes(activeSection) && <div className="gm-business-grid"><section className="gm-panel gm-live-panel gm-composer-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t('SỰ KIỆN DOANH NGHIỆP')}</span><h3>{t('Tạo sự kiện')}</h3></div><StatusPill tone="green">{t('Đã xác minh')}</StatusPill></div><form className="gm-auth-form" onSubmit={publish}><Field label="Tên sự kiện"><input className={fieldStyle} required minLength={3} maxLength={120} value={draft.title} onChange={patch('title')} /></Field><Field label="Mô tả sự kiện"><textarea className={fieldStyle + ' gm-textarea'} required maxLength={3000} value={draft.copy} onChange={patch('copy')} /></Field><div className="gm-field-grid"><Field label="Danh mục"><select className={fieldStyle} required value={draft.category} onChange={patch('category')}><option value="">{t('Chọn danh mục')}</option>{data.categories.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></Field><Field label="Sức chứa (gồm người tổ chức)"><input type="number" className={fieldStyle} min={2} max={1000} required value={draft.maxParticipants} onChange={patch('maxParticipants')} /></Field></div><Field label="Địa điểm"><input className={fieldStyle} required value={draft.location} onChange={patch('location')} /></Field><Field label="Điểm đón / hướng dẫn đến"><input className={fieldStyle} value={draft.meetingPoint} onChange={patch('meetingPoint')} /></Field><div className="gm-field-grid"><Field label="Bắt đầu (giờ Việt Nam)"><input className={fieldStyle} type="datetime-local" required value={draft.startsAt} onChange={patch('startsAt')} /></Field><Field label="Kết thúc (giờ Việt Nam)"><input className={fieldStyle} type="datetime-local" required value={draft.endsAt} onChange={patch('endsAt')} /></Field></div><div className="gm-field-grid"><Field label="Giá sau ưu đãi / người (VND)"><input className={fieldStyle} type="number" min={0} required value={draft.estimatedCost} onChange={patch('estimatedCost')} /></Field><Field label="Giảm giá (%)"><input className={fieldStyle} type="number" min={0} max={100} value={draft.discountPercent} onChange={patch('discountPercent')} /></Field></div><Field label="Lịch trình (mỗi dòng một hoạt động)"><textarea className={fieldStyle + ' gm-textarea'} required value={draft.plan} onChange={patch('plan')} /></Field><Field label="Nội dung ưu đãi"><input className={fieldStyle} maxLength={200} placeholder={t('Ví dụ: Tặng đồ uống cho thành viên GoMate')} value={draft.offer} onChange={patch('offer')} /></Field><Field label="Điều kiện áp dụng"><textarea className={fieldStyle} maxLength={500} value={draft.offerTerms} onChange={patch('offerTerms')} /></Field><PillButton type="submit" disabled={busy}>{t(busy ? 'Đang gửi...' : 'Gửi sự kiện cho staff duyệt')}</PillButton></form></section><section className="gm-panel gm-live-panel"><span className="gm-eyebrow">{t('XEM TRƯỚC TRONG APP')}</span><div className="gm-live-business-preview"><StatusPill tone="green">{t('Doanh nghiệp đã xác minh')}</StatusPill><div className="gm-live-offer">{draft.discountPercent ? `−${draft.discountPercent}%` : 'GOMATE PARTNER'}</div><h3>{draft.title || t('Tên sự kiện của bạn')}</h3><p>{me.application?.company}</p><p>{draft.offer || t('Ưu đãi riêng dành cho cộng đồng GoMate')}</p><small>{draft.location || t('Địa điểm')} · {draft.maxParticipants || 0} {t('people')}</small></div><p className="gm-live-muted">{t('Staff duyệt nội dung và ưu đãi. Lịch đã duyệt được chốt chính thức; thành viên tự đăng ký và chờ doanh nghiệp xác nhận.')}</p></section></div>}
    {business && activeSection === 'create-post' && <div className="gm-multi-post-page"><section className="gm-panel gm-live-panel gm-multi-post-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t('BUSINESS CAMPAIGN')}</span><h3>{t('Create one post and multiple groups')}</h3></div><StatusPill tone="green">{t(`${locations.length} saved locations`)}</StatusPill></div><MultiGroupPostComposer locations={locations} onPublish={publishMultiGroupPost} busy={busy} /></section><section className="gm-panel gm-live-panel gm-generated-groups-panel"><div className="gm-panel-heading"><div><span className="gm-eyebrow">{t('GROUPS')}</span><h3>{t('Generated groups')}</h3></div><span className="gm-group-count">{t(`${businessGroups.length} total`)}</span></div>{businessGroups.length ? businessGroups.map(group => <article className="gm-generated-group-preview-row" key={group.id}><span><strong>{group.name}</strong><small>{group.promotionalPostTitle} · {t(group.meetingPoint || group.location)} · {format(group.startsAt)}</small></span><StatusPill>{t(group.status === 'draft' ? 'Draft' : group.status)}</StatusPill></article>) : <p className="gm-live-muted">{t('Groups created from a post will appear here and can be assigned to Business Staff.')}</p>}</section></div>}
    {business && activeSection === 'active-groups' && <ActiveCampaignDashboard groups={businessGroups} locations={locations} onGroupsChange={setBusinessGroups} />}
    {business && activeSection === 'locations' && <LocationLibrary locations={locations} onSave={saveLocation} onDelete={deleteLocation} />}
    {business && activeSection === 'business-staff' && <BusinessStaffManagement groups={businessGroups} accounts={businessStaff} onSave={saveBusinessStaff} onDelete={deleteBusinessStaff} />}
    {business && activeSection === 'billing' && <section className="gm-panel gm-live-panel"><h3>Gói {me.subscription?.plan === 'plus' ? 'GoMate Plus' : 'Free'}</h3><StatusPill tone={me.subscription?.status === 'active' ? 'green' : 'orange'}>{me.subscription?.status || 'active'}</StatusPill><p>{t('Liên hệ hỗ trợ để yêu cầu nâng cấp hoặc thay đổi gói dịch vụ doanh nghiệp.')}</p><PillButton type="button" onClick={() => setSection('support')}>{t('Liên hệ hỗ trợ')}</PillButton></section>}
    {activeSection === 'support' && <Tickets me={me} />}
    {me.role === 'admin' && activeSection === 'businesses' && <AdminBusinessReview applications={data.applications} busy={busy} notes={notes} setNotes={setNotes} onApplicationDecision={(row, status) => { decide('applications', row, status); setSuccess(''); }} onDownload={download} />}
    {reviewing && (activeSection === 'overview' || (me.role === 'staff' && activeSection === 'businesses')) && <section className="gm-panel gm-live-panel"><h3>{t('Hồ sơ doanh nghiệp')}</h3>{!data.applications.length && <p>{t('Chưa có hồ sơ.')}</p>}{data.applications.map(row => <article className="gm-live-review" key={row.id}><div><h4>{row.company}</h4><p>{t(row.category)} · {t(row.website || 'Chưa có website')}</p><StatusPill tone={tone(row.status)}>{t(statusLabel[row.status])}</StatusPill></div><button className="gm-text-action" onClick={() => download(row)}>{t('Tải hồ sơ xác minh ↗')}</button>{row.status === 'pending' && <><input aria-label={t('Ghi chú hồ sơ ' + row.company)} className={fieldStyle} placeholder={t('Ghi chú kiểm duyệt')} value={notes[row.id] || ''} onChange={event => setNotes(value => ({ ...value, [row.id]: event.target.value }))} /><div className="gm-live-actions"><PillButton disabled={busy} onClick={() => decide('applications', row, 'approved')}>{t('Duyệt doanh nghiệp')}</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => decide('applications', row, 'rejected')}>{t('Từ chối hồ sơ')}</PillButton></div></>}</article>)}</section>}
    {(business || reviewing) && ['overview', 'posts'].includes(activeSection) && <section className="gm-panel gm-live-panel"><h3>{t(business ? 'Bài đăng của tôi' : 'Duyệt bài đăng')}</h3>{!data.posts.length && <p>{t('Chưa có bài đăng.')}</p>}{data.posts.map(row => <article className="gm-live-review" key={row.id}><div className="gm-live-review-title"><h4>{row.title}</h4><StatusPill tone={tone(row.status)}>{t(statusLabel[row.status])}</StatusPill></div><p>{row.businessName} · {row.copy}</p>{row.event && <p>{format(row.event.startsAt)} → {format(row.event.endsAt)} · {t(row.event.location)} · {row.event.maxParticipants} {t('people')}</p>}<p>{row.discountPercent ? `Giảm ${row.discountPercent}% · ` : ''}{row.offer || row.discount}{row.offerTerms ? ' · ' + row.offerTerms : ''}</p>{row.reviewNote && <p>{t('Note:')} {row.reviewNote}</p>}{row.activityId && row.status === 'approved' && <a href={`/#/app/home/activityDetail/${row.activityId}`}>{t('Xem sự kiện trong app ↗')}</a>}{reviewing && row.status === 'pending' && <><input aria-label={t('Ghi chú bài ' + row.title)} className={fieldStyle} placeholder={t('Ghi chú kiểm duyệt')} value={notes[row.id] || ''} onChange={event => setNotes(value => ({ ...value, [row.id]: event.target.value }))} /><div className="gm-live-actions"><PillButton disabled={busy} onClick={() => decide('posts', row, 'approved')}>{t('Duyệt và đưa lên app')}</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => decide('posts', row, 'rejected')}>{t('Từ chối bài')}</PillButton></div></>}</article>)}</section>}
    {me.role === 'admin' && activeSection === 'users' && <section className="gm-panel gm-live-panel"><h3>{t('Tài khoản GoMate')}</h3>{data.users.map(row => <div className="gm-live-review" key={row.id}><div><strong>{row.name}</strong><p>{row.email}</p></div><div className="gm-live-actions"><StatusPill>{t(row.effectiveRole)}</StatusPill><select aria-label={t('Vai trò ' + row.email)} className={fieldStyle} value={row.role || 'user'} disabled={busy || row.id === me.id} onChange={event => changeRole(row.id, event.target.value)}><option value="user">User</option><option value="staff">Staff</option><option value="admin">Admin</option></select></div></div>)}</section>}
  </div></main></div></div>;
}
