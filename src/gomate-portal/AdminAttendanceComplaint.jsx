import { useRef, useState } from 'react';
import { api } from '../services/api';
import { PillButton } from './GoMatePortal';

const labels = { present: 'Có mặt', late: 'Đến muộn', absent: 'Vắng', unmarked: 'Chưa điểm danh' };
export default function AdminAttendanceComplaint({ report, onResolved }) {
  const [status, setStatus] = useState(report.resolution?.status || report.requestedStatus || 'present'), [note, setNote] = useState(report.resolution?.note || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false), lock = useRef(false);
  const save = async decision => {
    if (lock.current) return;
    if (note.trim().length < 10 || note.length > 1000) { setError('Nhập lý do từ 10 đến 1000 ký tự.'); return; }
    lock.current = true; setBusy(true); setError('');
    try { await api(`/community/moderation/attendance-complaints/${encodeURIComponent(report.id)}`, { method: 'PATCH', body: JSON.stringify({ decision, note, ...(decision === 'approve' && report.kind === 'attendance' ? { status } : {}) }) }); onResolved(); }
    catch (reason) { setError(reason.message); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="gm-auth-form"><h4>Xử lý khiếu nại thành viên</h4><p>{report.activityTitle}</p>
    {report.kind === 'attendance' && <p>Điểm danh khi gửi: {labels[report.attendanceSnapshot?.status] || 'Chưa điểm danh'} · Người dùng đề nghị: {labels[report.requestedStatus]}</p>}
    {report.reviewNote && <p>Phản hồi: {report.reviewNote}</p>}
    {report.status === 'pending' && <>
      {report.kind === 'attendance' && <label className="gm-field"><span>Kết quả điểm danh sau xác minh</span><select aria-label="Kết quả điểm danh sau xác minh" className="gm-simple-input" disabled={busy} value={status} onChange={event => setStatus(event.target.value)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      <label className="gm-field"><span>Lý do xử lý khiếu nại</span><textarea aria-label="Lý do xử lý khiếu nại" className="gm-simple-input" minLength={10} maxLength={1000} disabled={busy} value={note} onChange={event => setNote(event.target.value)} /></label>
      {error && <p role="alert" className="gm-form-error">{error}</p>}
      <div className="gm-live-actions"><PillButton disabled={busy} onClick={() => void save('approve')}>{report.kind === 'attendance' ? 'Chấp nhận & sửa điểm danh' : 'Chấp nhận xử lý'}</PillButton><PillButton variant="secondary" disabled={busy} onClick={() => void save('reject')}>Không chấp nhận</PillButton></div>
    </>}
  </section>;
}
