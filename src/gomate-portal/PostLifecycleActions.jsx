import { useEffect, useRef, useState } from 'react';
import { Icon } from './GoMatePortal';
import './post-lifecycle.css';

export default function PostLifecycleActions({ post, group, busy, onAction, layout = 'inline' }) {
  const [action, setAction] = useState(null);
  const [processing, setProcessing] = useState(false), [error, setError] = useState('');
  const dialog = useRef(null), lock = useRef(false);
  const state = group?.state || post.status;
  const disabled = busy || processing;
  useEffect(() => {
    if (!action) return;
    const previous = document.activeElement, panel = dialog.current;
    panel?.querySelector('button')?.focus();
    const key = event => {
      if (event.key === 'Escape' && !lock.current && !busy) { event.preventDefault(); setAction(null); }
      if (event.key !== 'Tab') return;
      const buttons = [...panel.querySelectorAll('button:not([disabled])')];
      if (!buttons.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [action, busy]);
  if (!onAction || state === 'deleted' || !['approved', 'withdrawn'].includes(post.status)) return null;
  const target = group ? 'nhóm' : 'bài đăng';
  const options = [{ id: 'withdraw', title: 'Thu hồi ' + target, icon: 'archive', description: group ? 'Ngừng hiển thị và nhận thành viên mới.' : 'Ngừng hiển thị bài đăng và các nhóm thuộc bài.' }, { id: 'delete', title: 'Xóa ' + target, icon: 'trash', description: group ? 'Gỡ nhóm khỏi danh sách quản lý.' : 'Gỡ bài đăng và các nhóm thuộc bài khỏi danh sách quản lý.' }];
  const open = value => { setError(''); setAction(value); };
  const submit = async () => {
    if (disabled || lock.current) return;
    lock.current = true; setProcessing(true); setError('');
    try { if (await onAction(post, action, group?.activityId) !== false) setAction(null); else setError('Chưa thực hiện được. Kiểm tra thông báo và thử lại.'); }
    catch (reason) { setError(reason.message || 'Chưa thực hiện được. Vui lòng thử lại.'); }
    finally { lock.current = false; setProcessing(false); }
  };
  return <div className={'gm-lifecycle-actions gm-lifecycle-controls gm-lifecycle-controls--' + layout}>
    {options.filter(item => item.id !== 'withdraw' || state !== 'withdrawn').map(item => <div className={'gm-lifecycle-item gm-lifecycle-item--' + item.id} key={item.id}>
      {layout === 'panel' && <><span className="gm-lifecycle-item-icon"><Icon name={item.icon} size={21} /></span><div className="gm-lifecycle-item-copy"><strong>{item.title}</strong><p>{item.description}</p></div></>}
      <button type="button" className={'gm-lifecycle-button gm-lifecycle-button--' + item.id} disabled={disabled} onClick={() => open(item.id)}><Icon name={item.icon} size={17} />{item.title}</button>
    </div>)}
    {action && <div className="gm-confirm-backdrop"><section ref={dialog} className={'gm-confirm-dialog gm-lifecycle-dialog gm-lifecycle-dialog--' + action} role="alertdialog" aria-modal="true" aria-label={(action === 'delete' ? 'Xóa ' : 'Thu hồi ') + target} aria-describedby="gm-lifecycle-description">
      <div className="gm-lifecycle-dialog-heading"><span className="gm-lifecycle-dialog-icon"><Icon name={action === 'delete' ? 'trash' : 'archive'} size={25} /></span><button type="button" className="gm-lifecycle-dialog-close" aria-label="Đóng xác nhận" disabled={disabled} onClick={() => setAction(null)}><Icon name="close" size={20} /></button></div>
      <div><h3>{action === 'delete' ? 'Xóa' : 'Thu hồi'} {target}?</h3><p id="gm-lifecycle-description">{action === 'delete' ? 'Kiểm tra đúng ' + target + ' trước khi xóa khỏi danh sách quản lý.' : 'Dừng hoạt động của ' + target + ' và ngừng hiển thị trên app.'}</p></div>
      <div className="gm-lifecycle-selected"><Icon name={group ? 'users' : 'edit'} size={21} /><div><small>{group ? 'NHÓM ĐƯỢC CHỌN' : 'BÀI ĐĂNG ĐƯỢC CHỌN'}</small><strong>{group?.name || post.title}</strong></div></div>
      <div className="gm-lifecycle-impact"><p><Icon name="bell" size={16} />Thành viên đã đăng ký sẽ được thông báo.</p>{!group && <p><Icon name="users" size={16} />Áp dụng cho tất cả nhóm thuộc bài đăng.</p>}<p><Icon name="wallet" size={16} />Không tự hoàn cọc hoặc giải ngân.</p></div>
      {error && <p className="gm-form-error" role="alert">{error}</p>}
      <div className="gm-lifecycle-dialog-footer"><button type="button" className="gm-lifecycle-button gm-lifecycle-button--cancel" disabled={disabled} onClick={() => setAction(null)}>Giữ lại</button><button type="button" className={'gm-lifecycle-button gm-lifecycle-button--confirm-' + action} disabled={disabled} onClick={submit}><Icon name={action === 'delete' ? 'trash' : 'archive'} size={17} />{disabled ? 'Đang xử lý…' : action === 'delete' ? 'Xác nhận xóa' : 'Xác nhận thu hồi'}</button></div>
    </section></div>}
  </div>;
}
