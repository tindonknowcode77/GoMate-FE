import BusinessGroupChat from './BusinessGroupChat';
import { usePortalText } from './usePortalText';
import { useMemo, useState } from 'react';
import { Icon, PillButton, StatusPill } from './GoMatePortal';
import BusinessGroupBrowser from './BusinessGroupBrowser';
import GroupOverview, { GroupActionBar } from './GroupOverview';
import GroupMembers from './GroupMembers';
import GroupManagement, { GroupTabs } from './GroupManagement';
import './business-groups.css';

const fieldStyle = 'gm-simple-input';
const pending = 'pending';

function GroupSettings({ group, busy, onCommand }) {
  const [amount, setAmount] = useState(null);
  return <section className="gm-group-section gm-group-settings">
    <div className="gm-group-section-heading"><h3>Cài đặt nhóm</h3></div>
    <label className="gm-auto-approve"><span><strong>Tự động duyệt thành viên</strong><small>Chấp nhận yêu cầu mới khi nhóm còn chỗ.</small></span><input type="checkbox" role="switch" aria-label="Tự động duyệt thành viên" checked={Boolean(group.autoApproveMembers)} disabled={busy} onChange={event => void onCommand(group, 'settings', { autoApproveMembers: event.target.checked })} /></label>
    <form className="gm-deposit-setting" onSubmit={async event => { event.preventDefault(); if (await onCommand(group, 'settings', { depositAmount: Number(amount ?? group.depositAmount) })) setAmount(null); }}>
      <label className="gm-field"><span>Tiền cọc / người (VND)</span><input className="gm-simple-input" type="number" min={0} max={group.estimatedCost} step={1} required disabled={busy} value={amount ?? group.depositAmount} onChange={event => setAmount(event.target.value)} /></label>
      <PillButton type="submit" variant="secondary" disabled={busy || amount === null || Number(amount) === group.depositAmount}>Lưu mức cọc</PillButton>
    </form>
  </section>;
}

function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}

function isoDate(daysAhead, hour, minute = 0) {
  const value = new Date(Date.now() + daysAhead * 86400000);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

const defaultItinerary = (location, idPrefix) => [
  { id: `${idPrefix}-welcome`, time: '09:00', title: 'Welcome & check-in', locationId: location?.id || '', location: location?.name || '', notes: 'Confirm attendance and collect questions.' },
  { id: `${idPrefix}-experience`, time: '09:30', title: 'Community experience', locationId: location?.id || '', location: location?.name || '', notes: 'Main activity led by the assigned staff host.' },
];

const sampleMembers = [
  { id: 'member-anh', name: 'Nguyen Minh Anh', email: 'anh.nguyen@example.com', amount: 50000, status: 'paid', paidAt: isoDate(-1, 10, 20) },
  { id: 'member-khoa', name: 'Tran Duc Khoa', email: 'khoa.tran@example.com', amount: 50000, status: 'paid', paidAt: isoDate(-1, 14, 5) },
  { id: 'member-linh', name: 'Le Bao Linh', email: 'linh.le@example.com', amount: 50000, status: pending, paidAt: '' },
  { id: 'member-thao', name: 'Pham Thu Thao', email: 'thao.pham@example.com', amount: 50000, status: pending, paidAt: '' },
];

export const initialBusinessGroups = [
  {
    id: 'active-group-district-1',
    name: 'Saturday Social · District 1',
    campaignTitle: 'Luma Weekend Social',
    status: 'active',
    startsAt: isoDate(3, 9),
    endsAt: isoDate(3, 12),
    locationId: 'loc-luma-d1',
    location: '15 Nguyen Hue, Ben Nghe Ward',
    meetingPoint: 'Luma Social Club - District 1',
    maxParticipants: 12,
    estimatedCost: 120000,
    depositAmount: 50000,
    depositMembers: sampleMembers,
    itinerary: defaultItinerary({ id: 'loc-luma-d1', name: 'Luma Social Club - District 1' }, 'district-1'),
    notifications: [],
  },
  {
    id: 'active-group-thao-dien',
    name: 'Sunday Social · Thao Dien',
    campaignTitle: 'Luma Weekend Social',
    status: 'active',
    startsAt: isoDate(4, 14),
    endsAt: isoDate(4, 17),
    locationId: 'loc-luma-thao-dien',
    location: '12 Thao Dien Street, Thao Dien Ward',
    meetingPoint: 'Luma Social Club - Thao Dien',
    maxParticipants: 10,
    estimatedCost: 150000,
    depositAmount: 75000,
    depositMembers: [
      { id: 'member-minh', name: 'Vo Hoang Minh', email: 'minh.vo@example.com', amount: 75000, status: 'paid', paidAt: isoDate(-2, 9, 40) },
      { id: 'member-yen', name: 'Do Ngoc Yen', email: 'yen.do@example.com', amount: 75000, status: pending, paidAt: '' },
    ],
    itinerary: defaultItinerary({ id: 'loc-luma-thao-dien', name: 'Luma Social Club - Thao Dien' }, 'thao-dien'),
    notifications: [],
  },
];

function normalizeGroup(group, locations) {
  const location = locations.find(item => item.id === group.locationId) || locations[0];
  return {
    ...group,
    status: group.status || 'active',
    depositMembers: group.depositMembers || [],
    itinerary: group.itinerary || defaultItinerary(location, group.id),
    notifications: group.notifications || [],
    depositAmount: Number(group.depositAmount || 0),
    maxParticipants: Number(group.maxParticipants || 0),
  };
}

export default function ActiveCampaignDashboard(props) {
  const groups = useMemo(() => props.groups.map(group => normalizeGroup(group, props.locations)), [props.groups, props.locations]);
  return <BusinessGroupBrowser groups={groups}>{selected => <GroupDetails key={selected.id} {...props} selected={selected} />}</BusinessGroupBrowser>;
}

function GroupDetails({ groups, locations, selected, posts = [], onLifecycle, onGroupsChange, onAction, onCommand, onNavigateStaff, onOpenWallet, canConfigure = false, busy = false }) {
  const t = usePortalText();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingItemId, setEditingItemId] = useState('');
  const [itemForm, setItemForm] = useState({ time: '', title: '', locationId: '', notes: '' });
  const [offerForm, setOfferForm] = useState({ title: '', body: '', expiresAt: '' });
  const [offerMessage, setOfferMessage] = useState('');
  const [editingOfferId,setEditingOfferId]=useState('');
  const editable = selectedStatus => ['published','in-progress'].includes(selectedStatus);

  const lifecyclePost=posts.find(post=>post.id===selected?.promotionalPostId);
  const groupLocations=locations.filter(location=>!selected?.ownerId || location.ownerId===selected.ownerId);
  const updateGroup = patch => {
    if (!selected) return;
    if (onAction) return onAction(selected,patch);
    onGroupsChange(groups.map(group => group.id === selected.id ? { ...normalizeGroup(group, locations), ...patch } : group));
  };
  const markPaid = memberId => updateGroup({ depositMembers: selected.depositMembers.map(member => member.id === memberId ? { ...member, status: 'paid', paidAt: new Date().toISOString() } : member) });
  const totalCollected = selected?.depositMembers.filter(member => member.status === 'paid').reduce((sum, member) => sum + Number(member.amount || selected.depositAmount || 0), 0) || 0;
  const paidCount = selected?.depositMembers.filter(member => member.status === 'paid').length || 0;
  const allDepositsPaid = !selected?.depositAmount || Boolean(selected.depositMembers.length) && paidCount === selected.depositMembers.length;
  const canFinalize = selected?.status === 'published' && Boolean(selected.readiness?.ready) && allDepositsPaid;

  const openAddItem = () => {
    setEditingItemId('__new__');
    setItemForm({ date: new Date(new Date(selected.startsAt).getTime()+7*3600000).toISOString().slice(0,10), time: '', title: '', locationId: selected?.locationId || groupLocations[0]?.id || '', notes: '' });
  };
  const editItem = item => {
    setEditingItemId(item.id);
    setItemForm({ date: item.date, time: item.time, title: item.title, locationId: item.locationId || '', notes: item.notes || '' });
    setActiveTab('itinerary');
  };
  const saveItem = async event => {
    event.preventDefault();
    const location = locations.find(item => item.id === itemForm.locationId);
    const item = { ...itemForm, id: editingItemId && editingItemId !== '__new__' ? editingItemId : `itinerary-${Date.now()}`, location: location?.name || '' };
    if (await updateGroup({ itinerary: editingItemId && editingItemId !== '__new__' ? selected.itinerary.map(row => row.id === editingItemId ? item : row) : [...selected.itinerary, item] }) === false) return;
    setEditingItemId('');
    setItemForm({ time: '', title: '', locationId: selected.locationId || '', notes: '' });
  };
  const moveItem = (index, direction) => {
    const nextIndex = index + direction;
    if (!selected || nextIndex < 0 || nextIndex >= selected.itinerary.length) return;
    const next = [...selected.itinerary];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateGroup({ itinerary: next });
  };
  const removeItem = id => updateGroup({ itinerary: selected.itinerary.filter(item => item.id !== id) });

  const sendOffer = async event => {
    event.preventDefault();
    const recipients = selected?.depositMembers.length || 0;
    if(editingOfferId && onCommand) { if(await onCommand(selected,'offers/'+editingOfferId,{title:offerForm.title,body:offerForm.body,expiresAt:offerForm.expiresAt?new Date(offerForm.expiresAt).toISOString():''})===false)return;setEditingOfferId('');setOfferForm({title:'',body:'',expiresAt:''});setOfferMessage('Đã cập nhật thông báo ưu đãi.');return; }
    const notification = { id: `offer-${Date.now()}`, ...offerForm, sentAt: new Date().toISOString(), recipients };
    if (await updateGroup({ notifications: [notification, ...(selected.notifications || [])], lastOffer: notification }) === false) return;
    setOfferMessage(`Special offer sent to ${recipients} group members.`);
    setOfferForm({ title: '', body: '', expiresAt: '' });
  };

  if (!selected) return <section className="gm-panel gm-live-panel gm-active-empty"><Icon name="activity" size={26} /><h3>{t("No active groups yet")}</h3><p>{t("Create a promotional post with groups first. Active campaign controls will appear here.")}</p></section>;

  return (
    <div className="gm-group-detail">
      <GroupActionBar group={selected} busy={busy} onCommand={onCommand} onTab={setActiveTab} />
      <GroupTabs group={selected} activeTab={activeTab} onTab={setActiveTab} />
      <div className="gm-group-tab-content" role="tabpanel" id={'group-panel-' + selected.id} aria-labelledby={'group-tab-' + activeTab} tabIndex={0}>
      {activeTab === 'overview' && <GroupOverview group={selected} onTab={setActiveTab} onOpenWallet={onOpenWallet} />}
      {activeTab === 'chat' && <BusinessGroupChat key={selected.id} group={selected} />}
      {activeTab === 'participation' && <GroupMembers group={selected} onCommand={onCommand} busy={busy} />}
      {activeTab === 'manage' && <GroupManagement group={selected} busy={busy} onNavigateStaff={onNavigateStaff} lifecyclePost={lifecyclePost} onLifecycle={onLifecycle} settings={canConfigure && onCommand && selected.status === 'published' ? <GroupSettings key={selected.id} group={selected} busy={busy} onCommand={onCommand} /> : null} />}
      {activeTab === 'deposits' && <section className="gm-panel gm-live-panel gm-active-panel">
        <div className="gm-active-panel-heading"><div><span className="gm-eyebrow">{t("PAYMENT GATE")}</span><h3>{t("Deposit tracking")}</h3></div><span className={`gm-readiness-chip ${allDepositsPaid ? 'is-ready' : ''}`}><i />{t(allDepositsPaid ? 'Ready to finalize' : 'Schedule locked until paid')}</span></div>
        <div className="gm-deposit-progress"><div><span>{t("Payment progress")}</span><strong>{t(paidCount)} {t(" of ")}{t(selected.depositMembers.length)} {t(" paid")}</strong></div><div className="gm-progress-track"><span style={{ width: `${selected.depositMembers.length ? (paidCount / selected.depositMembers.length) * 100 : 0}%` }} /></div></div>
        <div className="gm-table-wrap gm-deposit-table-wrap"><table className="gm-table gm-deposit-table"><thead><tr><th>{t("Member")}</th><th>{t("Deposit required")}</th><th>{t("Payment status")}</th><th>{t("Paid at")}</th><th /></tr></thead><tbody>{selected.depositMembers.map(member => <tr key={member.id}><td><div className="gm-deposit-member"><span>{t(member.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase())}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div></td><td>{t(Number(member.amount || selected.depositAmount).toLocaleString('vi-VN'))} {t(" VND")}</td><td><StatusPill tone={member.status === 'paid' ? 'green' : 'orange'}>{t(member.status === 'paid' ? 'Paid' : member.status === 'not-required' ? 'Không yêu cầu cọc' : 'Pending')}</StatusPill></td><td>{t(member.paidAt ? formatPaymentDate(member.paidAt) : 'Awaiting payment')}</td><td>{member.status === 'pending' && <button type="button" className="gm-text-action" disabled={busy || !editable(selected.status)} onClick={() => markPaid(member.id)}>{t("Mark as paid")}</button>}{member.status==='paid' && <button type="button" className="gm-text-action" disabled={busy || !editable(selected.status)} onClick={()=>updateGroup({depositMembers:selected.depositMembers.map(row=>row.id===member.id?{...row,status:'pending'}:row)})}>Hủy xác nhận cọc</button>}</td></tr>)}</tbody></table></div>
        <div className="gm-deposit-footer"><span>{t("Total deposits collected")}</span><strong>{t(totalCollected.toLocaleString('vi-VN'))} {t(" VND")}</strong>{allDepositsPaid ? <PillButton icon="check" disabled={busy || !canFinalize} onClick={()=>updateGroup({itineraryConfirmed:true})}>{t("Finalize schedule")}</PillButton> : null}</div>
      </section>}

      {activeTab === 'itinerary' && <section className="gm-panel gm-live-panel gm-active-panel">
        <div className="gm-active-panel-heading"><div><span className="gm-eyebrow">{t("TIMELINE BUILDER")}</span><h3>{t("Lịch trình")}</h3></div><PillButton icon="plus" disabled={busy || !editable(selected.status)} onClick={openAddItem}>{t("Add timeline item")}</PillButton></div>
        {editingItemId === '__new__' && <form className="gm-itinerary-editor gm-itinerary-editor--new" onSubmit={saveItem}><ItineraryFields form={itemForm} setForm={setItemForm} locations={groupLocations} /><div className="gm-itinerary-editor-actions"><PillButton type="submit" disabled={busy || !editable(selected.status)}>{t("Add to timeline")}</PillButton><button type="button" className="gm-text-action" onClick={() => setEditingItemId('')}>{t("Cancel")}</button></div></form>}
        <div className="gm-timeline">{selected.itinerary.map((item, index) => <article className="gm-timeline-item" key={item.id}><div className="gm-timeline-rail"><span>{t(item.time)}</span><i /></div><div className="gm-timeline-card">{editingItemId === item.id ? <form className="gm-itinerary-editor" onSubmit={saveItem}><ItineraryFields form={itemForm} setForm={setItemForm} locations={locations} /><div className="gm-itinerary-editor-actions"><PillButton type="submit" disabled={busy || !editable(selected.status)}>{t("Save item")}</PillButton><button type="button" className="gm-text-action" onClick={() => setEditingItemId('')}>{t("Cancel")}</button></div></form> : <><div className="gm-timeline-card-top"><div><h4>{item.title}</h4><span><Icon name="grid" size={12} />{t(item.location || 'Location not pinned')}</span></div><div className="gm-timeline-actions"><button type="button" className="gm-icon-btn" onClick={() => moveItem(index, -1)} disabled={busy || !editable(selected.status) || index === 0} aria-label={t("Move timeline item up")}>{t("↑")}</button><button type="button" className="gm-icon-btn" onClick={() => moveItem(index, 1)} disabled={busy || !editable(selected.status) || index === selected.itinerary.length - 1} aria-label={t("Move timeline item down")}>{t("↓")}</button><button type="button" className="gm-text-action" disabled={busy || !editable(selected.status)} onClick={() => editItem(item)}>{t("Edit")}</button><button type="button" className="gm-text-action gm-delete-action" disabled={busy || !editable(selected.status)} onClick={() => removeItem(item.id)} aria-label={t(`Remove ${item.title}`)}><Icon name="close" size={14} /></button></div></div><p>{t(item.notes || 'No notes added.')}</p></>}</div></article>)}</div>
        {!selected.itinerary.length && <p className="gm-location-empty">{t("No timeline items yet. Add the first step for this group.")}</p>}
      </section>}

      {activeTab === 'offers' && <section className="gm-panel gm-live-panel gm-active-panel">
        <div className="gm-active-panel-heading"><div><span className="gm-eyebrow">{t("MEMBER COMMUNICATION")}</span><h3>{t("Special Offer notifications")}</h3></div><span className="gm-recipient-count"><Icon name="users" size={13} />{t(selected.depositMembers.length)} {t(" recipients")}</span></div>
        <div className="gm-offer-layout"><form className="gm-auth-form gm-offer-form" onSubmit={sendOffer}><Field label={t("Offer title")}><input className={fieldStyle} required maxLength={100} value={offerForm.title} onChange={event => setOfferForm(value => ({ ...value, title: event.target.value }))} placeholder={t("e.g. Free welcome drink")} /></Field><Field label={t("Message")}><textarea aria-label={t("Message")} className={fieldStyle + ' gm-textarea'} required maxLength={500} value={offerForm.body} onChange={event => setOfferForm(value => ({ ...value, body: event.target.value }))} placeholder={t("Tell group members about the special offer.")} /></Field><Field label={t("Expires on (optional)")}><input className={fieldStyle} type="datetime-local" value={offerForm.expiresAt} onChange={event => setOfferForm(value => ({ ...value, expiresAt: event.target.value }))} /></Field><PillButton type="submit" icon="bell" disabled={busy || !editable(selected.status)}>{t(editingOfferId ? 'Lưu thông báo ưu đãi' : 'Push special offer')}</PillButton>{offerMessage && <p className="gm-location-message" role="status">{t(offerMessage)}</p>}</form><div className="gm-offer-preview"><span className="gm-eyebrow">{t("NOTIFICATION PREVIEW")}</span><div className="gm-offer-preview-card"><span className="gm-offer-preview-icon"><Icon name="bell" size={16} /></span><div><strong>{t(offerForm.title || 'Your special offer')}</strong><p>{t(offerForm.body || 'Your offer message will appear here.')}</p>{offerForm.expiresAt && <small>{t("Expires ")}{t(new Date(offerForm.expiresAt).toLocaleString('vi-VN'))}</small>}</div></div><div className="gm-offer-history"><h4>{t("Recently sent")}</h4>{selected.notifications?.length ? [...selected.notifications].sort((a,b)=>new Date(b.sentAt)-new Date(a.sentAt)).slice(0, 10).map(notification => <div key={notification.id}><span><strong>{t(notification.title)}</strong><small>{t(notification.recipients)} {t(" recipients · ")}{t(formatPaymentDate(notification.sentAt))}</small></span><StatusPill tone="green">{t("Sent")}</StatusPill><button type="button" className="gm-text-action" disabled={busy || !editable(selected.status)} onClick={()=>{setEditingOfferId(notification.id);setOfferForm({title:notification.title,body:notification.body,expiresAt:notification.expiresAt?new Date(new Date(notification.expiresAt).getTime()-new Date(notification.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''});setOfferMessage('');}}>Sửa ưu đãi</button></div>) : <p>{t("No special offers sent for this group.")}</p>}</div></div></div>
      </section>}
      </div>
    </div>
  );
}

function ItineraryFields({ form, setForm, locations }) {
  const t = usePortalText();
  const patch = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  return <div className="gm-itinerary-fields"><div className="gm-field-grid"><Field label="Ngày lịch trình"><input className={fieldStyle} type="date" required value={form.date || ''} onChange={patch('date')} /></Field><Field label={t("Time")}><input className={fieldStyle} type="time" required value={form.time} onChange={patch('time')} /></Field><Field label={t("Timeline title")}><input className={fieldStyle} required maxLength={120} value={form.title} onChange={patch('title')} placeholder={t("e.g. Welcome briefing")} /></Field></div><Field label={t("Quick-select location")}><select className={fieldStyle} value={form.locationId} onChange={patch('locationId')}><option value="">{t("No pinned location")}</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name} {t(" · ")}{t(location.city)}</option>)}</select></Field><Field label={t("Notes")}><textarea className={fieldStyle + ' gm-textarea gm-compact-textarea'} maxLength={300} value={form.notes} onChange={patch('notes')} placeholder={t("Instructions for the staff host")} /></Field></div>;
}

function formatPaymentDate(value) {
  return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}
