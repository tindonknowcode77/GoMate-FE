import { useState } from 'react';
import { PillButton } from './GoMatePortal';

export default function BusinessPostEditor({ post, busy, onSave }) {
  const [form, setForm] = useState(null);
  if (!['pending', 'approved', 'rejected'].includes(post.status)) return null;
  if (!form) return <PillButton variant="secondary" disabled={busy} onClick={() => setForm({ version: post.version, title: post.title, copy: post.copy, discountPercent: post.discountPercent || 0, offer: post.offer || '', offerTerms: post.offerTerms || '' })}>Chỉnh sửa bài đăng</PillButton>;
  return <form className="gm-auth-form gm-post-edit-form" onSubmit={async event => {
    event.preventDefault();
    if (await onSave(post, { ...form, discountPercent: Number(form.discountPercent) })) setForm(null);
  }}>
    {[['title', 'Tiêu đề', 120], ['copy', 'Nội dung', 3000], ['discountPercent', 'Giảm giá (%)', 100], ['offer', 'Ưu đãi', 200], ['offerTerms', 'Điều kiện ưu đãi', 500]].map(([key, label, limit]) => <label className="gm-field" key={key}><span>{label}</span>{['copy', 'offerTerms'].includes(key) ? <textarea aria-label={label} className="gm-simple-input" required={key === 'copy'} maxLength={limit} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} /> : <input aria-label={label} className="gm-simple-input" type={key === 'discountPercent' ? 'number' : 'text'} required={key !== 'offer'} min={0} max={key === 'discountPercent' ? 100 : undefined} maxLength={limit} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} />}</label>)}
    <div className="gm-live-actions"><PillButton type="submit" disabled={busy}>Lưu thay đổi</PillButton><PillButton variant="secondary" disabled={busy} onClick={() => setForm(null)}>Hủy</PillButton></div>
  </form>;
}
