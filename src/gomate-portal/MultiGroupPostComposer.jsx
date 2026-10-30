import { usePortalText } from './usePortalText';
import { useRef, useState } from 'react';
import { Icon, PillButton } from './GoMatePortal';

const fieldStyle = 'gm-simple-input';
const sharedFields = ['category','locationId','location','meetingPoint','city','startsAt','endsAt','estimatedCost','depositAmount'];

function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}

function localDateTime(daysAhead, hour) {
  const date = new Date(Date.now() + daysAhead * 86400000);
  date.setHours(hour, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function createGroup(index, locations, maxParticipants = 12, baseGroup = null) {
  const location = locations[index % Math.max(locations.length, 1)];
  const startsAt = baseGroup?.startsAt || localDateTime(2 + index, 9 + (index % 2) * 4);
  const endsAt = baseGroup?.endsAt || localDateTime(2 + index, 11 + (index % 2) * 4);
  return {
    id: `group-draft-${Date.now()}-${index}`,
    name: `Group ${String(index + 1).padStart(2, '0')}`,
    category: baseGroup?.category || 'Workshop',
    locationId: baseGroup?.locationId ?? location?.id ?? '',
    location: baseGroup?.location ?? location?.address ?? '',
    city: baseGroup?.city ?? location?.city ?? '',
    meetingPoint: baseGroup?.meetingPoint ?? location?.name ?? '',
    startsAt,
    endsAt,
    maxParticipants,
    estimatedCost: baseGroup?.estimatedCost ?? 100000,
    depositAmount: baseGroup?.depositAmount ?? 0,
  };
}

export default function MultiGroupPostComposer({ locations, onPublish, onSaveLocation, busy }) {
  const t = usePortalText();
  const [promo, setPromo] = useState({ title: '', copy: '', discountPercent: 20, offer: '', offerTerms: '' });
  const [groups, setGroups] = useState(() => { const first = createGroup(0, locations); return [first, createGroup(1, locations, 12, first)]; });
  const [totalParticipants, setTotalParticipants] = useState(300);
  const [splitCount, setSplitCount] = useState(3);
  const nextGroupNumber = useRef(2);
  const [shared, setShared] = useState(true), [splitNotice, setSplitNotice] = useState(''), [formError, setFormError] = useState('');

  const patchPromo = key => event => setPromo(value => ({ ...value, [key]: event.target.value }));
  const patchGroup = (id, key, value) => setGroups(current => current.map(group => group.id === id || shared && sharedFields.includes(key) ? { ...group, [key]: value, ...(['location','meetingPoint','city'].includes(key) ? {locationId:''} : {}) } : group));
  const selectLocation = (group, locationId) => {
    const location = locations.find(item => item.id === locationId);
    setGroups(current => current.map(item => item.id === group.id || shared ? {
      ...item,
      locationId,
      location: location?.address || '',
      meetingPoint: location?.name || '',
      city: location?.city || '',
    } : item));
  };
  const addGroup = () => {
    const number = nextGroupNumber.current++;
    setGroups(current => [...current, createGroup(number, locations, 12, current[0])]);
  };
  const splitGroupsAutomatically = () => {
    const count = Number(splitCount), total = Number(totalParticipants);
    if (!Number.isInteger(count) || count < 1 || count > 20 || !Number.isInteger(total) || total < count * 2 || total > count * 1000) { setFormError('Nhập số nguyên: 1–20 nhóm, mỗi nhóm từ 2 đến 1.000 người.'); return; }
    setFormError('');
    const base = Math.floor(total / count), remainder = total % count;
    const capacities = Array.from({length:count}, (_,index) => base + (index < remainder ? 1 : 0));
    const template = groups[0]; nextGroupNumber.current = count;
    setGroups(capacities.map((capacity,index) => createGroup(index, locations, capacity, template)));
    setSplitNotice(remainder ? `${total} người không chia đều cho ${count} nhóm. Đã chia ${capacities.join(' – ')} người, tổng đúng ${total}.` : `Đã chia ${count} nhóm, mỗi nhóm ${base} người, tổng ${total}.`);
  };
  const saveInline = async group => {
    if (!group.location.trim() || !group.meetingPoint.trim() || !group.city.trim()) { setFormError('Nhập tên địa điểm, địa chỉ và tỉnh/thành phố trước khi lưu.'); return; }
    const saved = await onSaveLocation?.({name:group.meetingPoint,address:group.location,city:group.city,phone:''});
    if (saved) { setFormError(''); setGroups(current => current.map(row => row.id === group.id || shared ? {...row,locationId:saved.id} : row)); }
  };
  const removeGroup = id => setGroups(current => current.length > 1 ? current.filter(group => group.id !== id) : current);
  const submit = event => {
    event.preventDefault();
    onPublish({
      promo: { ...promo, discountPercent: Number(promo.discountPercent) },
      groups: groups.map(group => ({
        ...group,
        maxParticipants: Number(group.maxParticipants),
        estimatedCost: Number(group.estimatedCost),
        depositAmount: Number(group.depositAmount),
      })),
    });
  };

  return (
    <form className="gm-auth-form gm-multi-post-form" onSubmit={submit}>
      <section className="gm-promo-section">
        <div className="gm-business-section-heading">
          <span className="gm-business-step">01</span>
          <div><h4>{t("Main promotional post")}</h4><p>{t("One offer and description shared across every group.")}</p></div>
        </div>
        <Field label={t("Post title")}><input className={fieldStyle} required minLength={3} maxLength={120} value={promo.title} onChange={patchPromo('title')} placeholder={t("e.g. Luma Weekend Social")} /></Field>
        <Field label={t("Post description")}><textarea className={fieldStyle + ' gm-textarea'} required maxLength={3000} value={promo.copy} onChange={patchPromo('copy')} placeholder={t("Describe the promotion for your community.")} /></Field>
        <div className="gm-field-grid">
          <Field label={t("Discount (%)")}><input type="number" className={fieldStyle} min={0} max={100} value={promo.discountPercent} onChange={patchPromo('discountPercent')} /></Field>
          <Field label={t("Offer")}><input className={fieldStyle} maxLength={200} value={promo.offer} onChange={patchPromo('offer')} placeholder={t("e.g. Welcome drink")} /></Field>
        </div>
        <Field label={t("Offer terms")}><textarea className={fieldStyle + ' gm-textarea gm-compact-textarea'} maxLength={500} value={promo.offerTerms} onChange={patchPromo('offerTerms')} placeholder={t("Optional conditions")} /></Field>
      </section>

      <section className="gm-generated-groups-section"><label className="gm-shared-toggle"><input type="checkbox" checked={shared} onChange={event => {setShared(event.target.checked); if(event.target.checked) setGroups(current=>current.map(row=>({...row,...Object.fromEntries(sharedFields.map(key=>[key,current[0][key]]))})));}} />Dùng chung lịch, địa điểm và chi phí cho các nhóm</label>
        <div className="gm-business-section-heading gm-groups-heading">
          <span className="gm-business-step">02</span>
          <div><h4>{t("Groups generated from this post")}</h4><p>{t("Tách tổng số người tham gia thành nhiều nhóm chat độc lập để phân công Staff quản lý.")}</p></div>
          <span className="gm-group-count">{t(groups.length)} {t(" groups")}</span>
        </div>
        <div className="gm-panel" style={{ padding: 14, marginBottom: 14, background: '#f7f6fd', borderRadius: 14 }}>
          <strong>Tách nhóm nhanh theo quy mô sự kiện</strong>
          <div className="gm-field-grid" style={{ marginTop: 8, alignItems: 'end' }}>
            <Field label="Tổng số người tham gia"><input type="number" className={fieldStyle} min={2} max={20000} value={totalParticipants} onChange={e => setTotalParticipants(e.target.value)} /></Field>
            <Field label="Số nhóm muốn tách (1–20)"><input type="number" className={fieldStyle} min={1} max={20} value={splitCount} onChange={e => setSplitCount(e.target.value)} /></Field>
            <PillButton type="button" variant="secondary" onClick={splitGroupsAutomatically}>Tách nhóm theo tổng số người</PillButton>
          </div>
        </div>
        {splitNotice && <p role="status" className="gm-split-notice">{splitNotice}</p>}{formError && <p role="alert" className="gm-form-error">{formError}</p>}<div className="gm-generated-groups">
          {groups.map((group, index) => <article className="gm-generated-group" key={group.id}>
            <div className="gm-generated-group-heading">
              <span className="gm-group-number">{t(String(index + 1).padStart(2, '0'))}</span>
              <div><h5>{group.name}</h5><span>{t("Separate GoMate group")}</span></div>
              {groups.length > 1 && <button type="button" className="gm-text-action gm-remove-group" onClick={() => removeGroup(group.id)} aria-label={t(`Remove ${group.name}`)} title={t("Remove group")}><Icon name="close" size={16} /></button>}
            </div>
            <div className="gm-field-grid">
              <Field label={t("Group name")}><input className={fieldStyle} required maxLength={80} value={group.name} onChange={event => patchGroup(group.id, 'name', event.target.value)} /></Field>
              <Field label={t("Category")}><select className={fieldStyle} value={group.category} onChange={event => patchGroup(group.id, 'category', event.target.value)}>{['Workshop', 'Cà phê', 'Thể thao', 'Du lịch', 'Âm nhạc', 'Nghệ thuật', 'Networking'].map(value => <option key={value}>{t(value)}</option>)}</select></Field>
            </div>
<Field label={t("Capacity")}><input className={fieldStyle} type="number" min={2} max={1000} required value={group.maxParticipants} onChange={event=>patchGroup(group.id,'maxParticipants',event.target.value)} /></Field>{(!shared || index === 0) && <><Field label={t("Quick Select Location")}>
              <select aria-label={t("Quick Select Location")} className={fieldStyle} value={group.locationId} onChange={event => selectLocation(group, event.target.value)}>
                <option value="">Nhập địa điểm thủ công</option>
                {locations.map(location => <option key={location.id} value={location.id}>{location.name} {t(" · ")}{t(location.city)}</option>)}
              </select>
            </Field>
<div className="gm-field-grid"><Field label="Tên địa điểm / Điểm hẹn"><input className={fieldStyle} required maxLength={150} value={group.meetingPoint} onChange={event=>patchGroup(group.id,'meetingPoint',event.target.value)} /></Field><Field label="Tỉnh / Thành phố"><input className={fieldStyle} required maxLength={100} value={group.city} onChange={event=>patchGroup(group.id,'city',event.target.value)} /></Field></div><Field label="Địa chỉ địa điểm"><input className={fieldStyle} required minLength={2} maxLength={200} value={group.location} onChange={event=>patchGroup(group.id,'location',event.target.value)} /></Field>{onSaveLocation && <PillButton variant="secondary" disabled={busy || Boolean(group.locationId)} onClick={()=>saveInline(group)}>{group.locationId ? 'Địa điểm đã được lưu' : 'Lưu địa điểm vào thư viện'}</PillButton>}
            <div className="gm-group-location-summary"><Icon name="grid" size={14} /><span>{t(group.location || 'No saved location selected')}</span></div>
            <div className="gm-field-grid gm-group-schedule">
              <Field label={t("Starts")}><input className={fieldStyle} type="datetime-local" required value={group.startsAt} onChange={event => patchGroup(group.id, 'startsAt', event.target.value)} /></Field>
              <Field label={t("Ends")}><input className={fieldStyle} type="datetime-local" required value={group.endsAt} onChange={event => patchGroup(group.id, 'endsAt', event.target.value)} /></Field>
            </div>
            <div className="gm-field-grid gm-group-money">

              <Field label={t("Estimated cost / person (VND)")}><input className={fieldStyle} type="number" min={0} required value={group.estimatedCost} onChange={event => patchGroup(group.id, 'estimatedCost', event.target.value)} /></Field>
              <Field label={t("Tiền cọc / person (VND)")}><input className={fieldStyle} type="number" min={0} max={group.estimatedCost || 0} required value={group.depositAmount} onChange={event => patchGroup(group.id, 'depositAmount', event.target.value)} /></Field>
            </div>
            </>}{shared && index > 0 && <p className="gm-shared-summary">Dùng chung lịch, địa điểm và chi phí với nhóm đầu tiên; sức chứa được chia riêng.</p>}
          </article>)}
        </div>
        <button type="button" disabled={groups.length >= 20} className="gm-add-group-button" onClick={addGroup}><Icon name="plus" size={16} />{t("Add another group")}</button>
      </section>

      <div className="gm-multi-post-footer">
        <div><strong>{t("One post · ")}{t(groups.length)} {t(" groups")}</strong><span>{t("Each group has its own schedule, location, capacity, and deposit.")}</span></div>
        <PillButton type="submit" disabled={busy}>{t(busy ? 'Creating groups...' : `Create post and ${groups.length} groups`)}</PillButton>
      </div>
    </form>
  );
}
