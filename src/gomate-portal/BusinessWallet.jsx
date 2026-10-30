import { useEffect, useState } from 'react';
import { api } from '../services/api';

const money = amount => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
const escrowLabel = status => status === 'eligible-after-completion' ? 'Đã hoàn tất & điểm danh · Đủ điều kiện giải ngân (90%)' : status === 'refund-protected' ? 'Đã hủy/hết hạn · Bảo vệ hoàn cọc 100% cho người dùng' : 'Đang tạm giữ bảo đảm (Escrow) · Chờ hoàn tất sự kiện';

export default function BusinessWallet() {
  const [wallet, setWallet] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try { setWallet(await api('/portal/wallet')); } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="gm-panel gm-live-panel" aria-busy={busy}>
    <h2>Ví doanh nghiệp · Đối soát & Bảo đảm tiền cọc</h2>
    <p>Cơ chế bảo vệ người dùng (Anti-fraud Escrow): Tiền cọc của thành viên được đối soát theo từng nhóm hoạt động. Hệ thống thu phí nền tảng {wallet ? wallet.estimatedFeeBps / 100 : 10}% trên mỗi khoản cọc và chỉ giải ngân 90% còn lại về ví doanh nghiệp sau khi hoạt động đã diễn ra, điểm danh thành viên đầy đủ và kết thúc hợp lệ. Nếu sự kiện bị hủy hoặc quá hạn không tổ chức, khoản cọc được khóa giải ngân để bảo đảm hoàn lại cho người dùng.</p>
    <button type="button" className="gm-simple-input" onClick={() => void load()} disabled={busy}>{busy ? 'Đang tải…' : 'Làm mới đối soát'}</button>
    {error && <p role="alert">{error}</p>}
    {wallet && <>
      <dl>
        <dt>Tổng cọc đã ghi nhận</dt><dd>{money(wallet.recordedAmount)}</dd>
        <dt>Phí nền tảng GoMate ({wallet.estimatedFeeBps / 100}%)</dt><dd>{money(wallet.estimatedFee)}</dd>
        <dt>Thực nhận dự kiến của doanh nghiệp (90%)</dt><dd>{money(wallet.estimatedNet)}</dd>
        <dt>Đang tạm giữ bảo đảm (Chờ sự kiện hoàn tất)</dt><dd>{money(wallet.escrowHeldAmount)}</dd>
        <dt>Đủ điều kiện giải ngân (Sự kiện đã hoàn tất & điểm danh)</dt><dd>{money(wallet.eligiblePayoutAmount)}</dd>
        <dt>Khoản khóa hoàn trả người dùng (Sự kiện hủy/hết hạn)</dt><dd>{money(wallet.refundableAmount)}</dd>
      </dl>
      <div className="gm-table-wrap"><table className="gm-table"><caption>Đối soát theo nhóm — chỉ tính thành viên được duyệt có cọc đã xác nhận</caption><thead><tr><th>Nhóm</th><th>Trạng thái bảo đảm</th><th>Đã cọc / Có mặt</th><th>Tổng cọc</th><th>Phí (10%)</th><th>Doanh nghiệp nhận (90%)</th></tr></thead><tbody>{wallet.groups.map(group => <tr key={group.id}><td>{group.name}</td><td>{escrowLabel(group.escrowStatus)}</td><td>{group.recordedMembers} người ({group.attendedMembers ?? 0} có mặt)</td><td>{money(group.recordedAmount)}</td><td>{money(group.estimatedFee)}</td><td>{money(group.estimatedNet)}</td></tr>)}</tbody></table></div>
      {!wallet.groups.length && <p>Chưa có nhóm để đối soát.</p>}
    </>}
  </section>;
}
