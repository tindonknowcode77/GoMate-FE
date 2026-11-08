export function statusTone(value) {
  const key = String(value || '').trim().toLocaleLowerCase();
  if (['pending', 'publishing', 'open', 'paused', 'chờ duyệt', 'đang duyệt', 'đang mở', 'đang xuất bản', 'chờ xử lý'].includes(key)) return 'orange';
  if (['approved', 'resolved', 'active', 'published', 'completed', 'paid', 'business', 'đã duyệt', 'đã xử lý', 'đã thanh toán', 'doanh nghiệp'].includes(key)) return 'green';
  if (['rejected', 'cancelled', 'withdrawn', 'deleted', 'expired', 'từ chối', 'đã thu hồi', 'đã xóa', 'đã hủy'].includes(key)) return 'red';
  if (['admin', 'quản trị viên', 'quản trị'].includes(key)) return 'purple';
  if (['staff', 'business-staff', 'user', 'người dùng', 'nhân sự', 'in-progress'].includes(key)) return 'blue';
  return 'neutral';
}
