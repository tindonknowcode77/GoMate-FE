import { useEffect, useRef, useState } from 'react';
import { Icon } from './GoMatePortal';

export default function PortalHeaderActions({ busy, onRefresh, notifications }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    const close = event => { if (event.type === 'keydown' ? event.key === 'Escape' : !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);
  return <div className="gm-header-actions" ref={root}>
    <button type="button" className="gm-header-icon" aria-label="Thông báo doanh nghiệp" aria-expanded={open} aria-controls="gm-business-notifications" onClick={() => setOpen(value => !value)}><Icon name="bell" size={20} />{notifications.length > 0 && <span className="gm-notification-count">{notifications.length > 99 ? '99+' : notifications.length}</span>}</button>
    <button type="button" className="gm-header-icon" aria-label="Làm mới" title="Làm mới" disabled={busy} onClick={onRefresh}><Icon name="refresh" size={20} /></button>
    <button type="button" className="gm-header-icon" aria-label="Cài đặt" title="Cài đặt"><Icon name="settings" size={20} /></button>
    {open && <section id="gm-business-notifications" className="gm-notification-popover" role="region" aria-label="Danh sách thông báo doanh nghiệp"><header><strong>Thông báo doanh nghiệp</strong><button type="button" className="gm-icon-btn" aria-label="Đóng thông báo" onClick={()=>setOpen(false)}><Icon name="close" /></button></header>{notifications.length ? <ol>{notifications.map(notice => <li key={notice.id}><strong>{notice.title}</strong><p>{notice.text}</p>{notice.createdAt && <time>{new Date(notice.createdAt).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}</time>}</li>)}</ol> : <p className="gm-notification-empty">Bạn chưa có thông báo mới.</p>}</section>}
  </div>;
}
