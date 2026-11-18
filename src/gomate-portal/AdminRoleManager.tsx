import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  system: boolean;
  assignable: boolean;
  adminVersion?: number;
};

type Props = {
  roles: AdminRole[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export default function AdminRoleManager({ roles, onClose, onChanged }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirm, setConfirm] = useState<AdminRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button, input, textarea')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onCloseRef.current();
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);

  const startEdit = (role: AdminRole) => {
    setError(''); setConfirm(null); setEditing(role); setName(role.name); setDescription(role.description || '');
  };
  const startCreate = () => {
    setError(''); setConfirm(null); setEditing(null); setName(''); setDescription('');
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const body = { name: name.trim(), description: description.trim(), ...(editing ? { adminVersion: editing.adminVersion } : {}) };
      await api(editing ? `/portal/admin/roles/${encodeURIComponent(editing.id)}` : '/portal/admin/roles', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      setEditing(null); await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được vai trò.');
    } finally { busyRef.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (!confirm || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      await api(`/portal/admin/roles/${encodeURIComponent(confirm.id)}`, { method: 'DELETE', body: JSON.stringify({ adminVersion: confirm.adminVersion }) });
      setConfirm(null); await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được vai trò.');
    } finally { busyRef.current = false; setBusy(false); }
  };

  return <div className="gm-modal-backdrop gm-admin-role-backdrop">
    <section ref={dialogRef} className="gm-user-modal gm-admin-modal gm-admin-role-modal" role="dialog" aria-modal="true" aria-labelledby="admin-role-title">
      <header className="gm-modal-head"><div><h3 id="admin-role-title">Quản lý vai trò</h3><p className="gm-live-muted">Vai trò hệ thống được quản lý theo hoạt động và hồ sơ đã duyệt.</p></div><button type="button" className="gm-btn gm-btn--secondary" disabled={busy} onClick={onClose}>Đóng</button></header>
      {error && <p role="alert" className="gm-form-error">{error}</p>}
      {confirm ? <div className="gm-admin-role-confirm"><p>Xóa vai trò “{confirm.name}”?</p><p className="gm-live-muted">Nếu đang có thành viên được gán, hệ thống sẽ từ chối xóa.</p><div className="gm-live-actions"><button type="button" className="gm-btn gm-btn--secondary" disabled={busy} onClick={() => setConfirm(null)}>Hủy</button><button type="button" className="gm-btn gm-btn--danger" disabled={busy} onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xóa vai trò'}</button></div></div> : <>
        <div className="gm-admin-role-list">{roles.map(role => <article className="gm-admin-role-row" key={role.id}>
          <div><strong>{role.name}</strong><p>{role.description || (role.system ? 'Vai trò hệ thống' : 'Vai trò tùy chỉnh')}</p></div>
          <span className={`gm-admin-role-kind ${role.system ? 'is-system' : 'is-custom'}`}>{role.system ? 'Hệ thống' : 'Tùy chỉnh'}</span>
          {!role.system && <div className="gm-live-actions"><button type="button" className="gm-btn gm-btn--secondary" disabled={busy} onClick={() => startEdit(role)}>Sửa</button><button type="button" className="gm-btn gm-btn--secondary" disabled={busy} onClick={() => setConfirm(role)}>Xóa</button></div>}
        </article>)}</div>
        <form className="gm-admin-role-form" onSubmit={save}>
          <h4>{editing ? `Sửa ${editing.name}` : 'Tạo vai trò'}</h4>
          <label className="gm-field"><span>Tên vai trò</span><input className="gm-simple-input" required minLength={2} maxLength={40} value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="gm-field"><span>Mô tả</span><textarea className="gm-simple-input" rows={2} maxLength={200} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <div className="gm-live-actions"><button type="submit" className="gm-btn gm-btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : editing ? 'Lưu vai trò' : 'Tạo vai trò'}</button>{editing && <button type="button" className="gm-btn gm-btn--secondary" disabled={busy} onClick={startCreate}>Hủy sửa</button>}</div>
        </form>
      </>}
    </section>
  </div>;
}
