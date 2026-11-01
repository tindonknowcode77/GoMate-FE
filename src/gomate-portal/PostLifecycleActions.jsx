import { useState } from 'react';
import { Icon, PillButton } from './GoMatePortal';

export default function PostLifecycleActions({ post, group, busy, onAction }) {
  const [action, setAction] = useState(null);
  const state = group?.state || post.status;
  if (!onAction || state === 'deleted' || !['approved', 'withdrawn'].includes(post.status)) return null;
  const target = group ? 'nhóm' : 'bài đăng';
  return <div className="gm-lifecycle-actions">
    {state !== 'withdrawn' && <button type="button" className="gm-text-action" disabled={busy} onClick={()=>setAction('withdraw')}>Thu hồi {target}</button>}
    <button type="button" className="gm-text-action gm-danger-action" disabled={busy} onClick={()=>setAction('delete')}><Icon name="trash" size={15} />Xóa {target}</button>
    {action && <div className="gm-confirm-backdrop"><section className="gm-confirm-dialog" role="alertdialog" aria-modal="true" aria-label={(action==='delete'?'Xóa ':'Thu hồi ')+target}><h3>{action==='delete'?'Xóa':'Thu hồi'} {target}?</h3><strong>{group?.name || post.title}</strong><p>{group ? 'Nhóm này sẽ ngừng hiển thị trên app.' : 'Bài đăng và tất cả nhóm thuộc bài sẽ ngừng hiển thị trên app.'} Thành viên đã đăng ký sẽ được thông báo.</p><div className="gm-live-actions"><PillButton variant="secondary" disabled={busy} onClick={()=>setAction(null)}>Giữ lại</PillButton><PillButton disabled={busy} onClick={async()=>{if(await onAction(post,action,group?.activityId)!==false)setAction(null);}}>{busy?'Đang xử lý…':action==='delete'?'Xác nhận xóa':'Xác nhận thu hồi'}</PillButton></div></section></div>}
  </div>;
}
