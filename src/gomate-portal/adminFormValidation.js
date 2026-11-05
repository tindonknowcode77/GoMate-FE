export function validateAdminForm(kind, form, editing) {
  const check = (key, label, max, min = 1) => {
    const value = form[key] ?? (min === 0 ? '' : undefined);
    if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || value.trim().length < min || value.trim().length > max) throw Error(`${label} cần ${min}–${max} ký tự hợp lệ.`);
  };
  if (!editing && ['businesses', 'posts', 'tickets'].includes(kind)) {
    check('ownerId', 'ID tài khoản', 100);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(form.ownerId.trim())) throw Error('ID tài khoản không hợp lệ.');
  }
  if (kind === 'users') {
    check('name', 'Họ tên', 100, 2);
    if (!editing) {
      check('email', 'Email', 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw Error('Email không hợp lệ.');
      if (typeof form.password !== 'string' || !form.password.trim() || form.password.length < 6 || form.password.length > 128) throw Error('Mật khẩu cần 6–128 ký tự và không được chỉ chứa khoảng trắng.');
    }
  }
  if (kind === 'businesses') {
    for (const [key, label, max] of [['company', 'Tên doanh nghiệp', 150], ['address', 'Địa chỉ', 500], ['representativeName', 'Người đại diện', 120], ['representativeTitle', 'Chức danh', 80], ['representativeEmail', 'Email đại diện', 254], ['representativePhone', 'Điện thoại', 40]]) check(key, label, max);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.representativeEmail.trim())) throw Error('Email đại diện không hợp lệ.');
    if (!/^\+?\d{9,15}$/.test(form.representativePhone.replace(/[\s().-]/g, ''))) throw Error('Điện thoại cần 9–15 chữ số, có thể bắt đầu bằng dấu +.');
    check('website', 'Website', 500, 0);
    if (form.website?.trim()) { let url; try { url = new URL(form.website.trim()); } catch { throw Error('Website cần URL http hoặc https hợp lệ.'); } if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Website cần URL http hoặc https, không chứa thông tin đăng nhập.'); }
    if (!editing) { check('category', 'Ngành nghề', 100); if (!/^\d{10}(?:\d{3})?$/.test(form.taxId.trim())) throw Error('Mã số thuế cần 10 hoặc 13 chữ số.'); }
  }
  if (kind === 'posts') {
    check('title', 'Tiêu đề', 120); check('copy', 'Nội dung', 3000); check('offer', 'Ưu đãi', 200, 0); check('offerTerms', 'Điều kiện ưu đãi', 500, 0);
    if (String(form.discountPercent).trim() === '' || !Number.isInteger(Number(form.discountPercent)) || Number(form.discountPercent) < 0 || Number(form.discountPercent) > 100) throw Error('Giảm giá phải là số nguyên từ 0 đến 100.');
  }
  if (kind === 'reports') {
    check('detail', 'Mô tả bổ sung', 1000, 0);
    if (!editing) { check('activityId', 'ID hoạt động', 100); if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(form.activityId.trim())) throw Error('ID hoạt động không hợp lệ.'); check('reason', 'Lý do', 150); }
  }
  if (kind === 'tickets') {
    check('subject', 'Tiêu đề yêu cầu', 150);
    if (editing) { if (!['open', 'closed'].includes(form.status)) throw Error('Trạng thái yêu cầu không hợp lệ.'); }
    else check('message', 'Nội dung yêu cầu', 3000);
  }
}
