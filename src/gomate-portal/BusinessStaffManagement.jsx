import { usePortalText } from './usePortalText';
import { useState } from 'react';
import { Icon, PillButton } from './GoMatePortal';

const fieldStyle = 'gm-simple-input';
const emptyStaff = () => ({ name: '', email: '', password: '', phone: '', title: '', groupIds: [] });

function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}

export default function BusinessStaffManagement({ groups, accounts, onSave, onDelete, busy }) {
  const t = usePortalText();
  const [form, setForm] = useState(emptyStaff);
  const [editingId, setEditingId] = useState('');

  const patch = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  const toggleGroup = groupId => setForm(value => ({
    ...value,
    groupIds: value.groupIds.includes(groupId) ? value.groupIds.filter(id => id !== groupId) : [...value.groupIds, groupId],
  }));
  const edit = account => {
    setEditingId(account.id);
    setForm({ name: account.name, email: account.email, password: '', phone: account.phone, title: account.title, groupIds: [...account.groupIds] });
  };
  const reset = () => {
    setEditingId('');
    setForm(emptyStaff());
  };
  const submit = async event => {
    event.preventDefault();
    if (await onSave({ ...form, id: editingId }) === false) return;
    reset();
  };
  const groupName = id => groups.find(group => group.id === id)?.name || 'Group removed';

  return (
    <div className="gm-business-staff-page">
      <div className="gm-business-section-heading gm-staff-page-heading">
        <div className="gm-staff-heading-icon"><Icon name="users" size={18} /></div>
        <div><span className="gm-eyebrow">{t("BUSINESS ACCESS")}</span><h3>{t("Business Staff")}</h3><p>{t('Tạo tài khoản nhân viên và phân công nhóm thuộc doanh nghiệp của bạn.')}</p></div>
      </div>

      <div className="gm-staff-layout">
        <section className="gm-panel gm-live-panel gm-staff-form-panel">
          <div className="gm-panel-heading"><div><h3>{t(editingId ? 'Edit staff access' : 'Create staff account')}</h3><p className="gm-live-muted">{t('')}</p></div></div>
          <form className="gm-auth-form" onSubmit={submit}>
            <Field label={t("Full name")}><input className={fieldStyle} autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={patch('name')} placeholder={t("Staff member name")} /></Field>
            <Field label={t("Work email")}><input className={fieldStyle} type="email" autoComplete="off" required readOnly={Boolean(editingId)} value={form.email} onChange={patch('email')} placeholder={t("name@business.com")} /></Field>
            {!editingId && <Field label="Mật khẩu nhân viên"><input className={fieldStyle} type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={form.password} onChange={patch('password')} /></Field>}
            <div className="gm-field-grid">
              <Field label={t("Phone")}><input className={fieldStyle} type="tel" autoComplete="tel" required value={form.phone} onChange={patch('phone')} /></Field>
              <Field label={t("Job title")}><input className={fieldStyle} required maxLength={80} value={form.title} onChange={patch('title')} placeholder={t("e.g. Group host")} /></Field>
            </div>
            <fieldset className="gm-staff-groups-fieldset">
              <legend>{t("Assign groups to manage")}</legend>
              {!groups.length && <p className="gm-live-muted">{t("Create groups from a promotional post before assigning staff.")}</p>}
              {groups.map(group => <label className="gm-staff-group-option" key={group.id}>
                <input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                <span><strong>{group.name}</strong><small>{t(group.location || group.address || 'Location not set')}</small></span>
              </label>)}
              {!form.groupIds.length && <small className="gm-staff-form-note">{t('Có thể tạo tài khoản trước và phân công nhóm sau.')}</small>}
            </fieldset>
            <div className="gm-location-form-actions"><PillButton type="submit" disabled={busy}>{t(editingId ? 'Save staff details' : 'Tạo tài khoản nhân viên')}</PillButton>{editingId && <button type="button" className="gm-text-action" disabled={busy} onClick={reset}>{t("Cancel edit")}</button>}</div>
          </form>
        </section>

        <section className="gm-panel gm-live-panel gm-staff-list-panel">
          <div className="gm-panel-heading"><div><span className="gm-eyebrow">{t('NHÂN VIÊN DOANH NGHIỆP')}</span><h3>{t("Staff accounts")}</h3></div><span className="gm-group-count">{t(accounts.length)} {t(" accounts")}</span></div>
          {!accounts.length && <div className="gm-staff-empty"><Icon name="users" size={24} /><strong>{t("No staff accounts yet")}</strong><span>{t('Tạo tài khoản nhân viên để phân công quản lý nhóm.')}</span></div>}
          <div className="gm-staff-list">{accounts.map(account => <article className="gm-staff-row" key={account.id}>
            <div className="gm-staff-avatar">{t(account.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase())}</div>
            <div className="gm-staff-main"><div className="gm-staff-name-line"><strong>{account.name}</strong><span className="gm-staff-approval-status" data-status={account.status}><i />{t(({ approved: 'Hoạt động', pending: 'Chưa kích hoạt', rejected: 'Đã từ chối', revoked: 'Đã thu hồi', declined: 'Đã từ chối' })[account.status] || account.status)}</span></div><span>{account.title} {t(" · ")}{account.email} {t(" · ")}{t(account.phone)}</span>
              <div className="gm-staff-assigned-groups">{account.groupIds.map(id => <span key={id}>{t(groupName(id))}</span>)}</div>
            </div>
            <div className="gm-staff-actions"><button type="button" className="gm-text-action" disabled={busy} onClick={() => edit(account)}>{t("Edit")}</button><button type="button" className="gm-text-action gm-delete-action" disabled={busy} onClick={() => onDelete(account.id)} aria-label={t(`Remove ${account.name}`)} title={t("Remove staff account")}><Icon name="close" size={15} /></button></div>
          </article>)}</div>
          <div className="gm-staff-approval-note"><Icon name="shield" size={15} /><span>{t('Nhân viên đăng nhập bằng tài khoản doanh nghiệp tạo và chỉ quản lý các nhóm được phân công. Một nhóm có thể có nhiều nhân viên. Chỉ admin duyệt hồ sơ và bài đăng.')}</span></div>
        </section>
      </div>
    </div>
  );
}
