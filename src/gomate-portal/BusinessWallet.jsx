import { useEffect, useState } from 'react';
import { api } from '../services/api';

const money = amount => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export default function BusinessWallet() {
  const [wallet, setWallet] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try { setWallet(await api('/portal/wallet')); } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="gm-panel gm-live-panel" aria-busy={busy}>
    <h2>Ví doanh nghiệp · Đối soát cọc</h2>
    <p>Cọc hiện được xác nhận thủ công. GoMate chưa xác minh đã nhận tiền và chưa hỗ trợ thu, hoàn hoặc rút tiền qua cổng thanh toán.</p>
    <button type="button" className="gm-simple-input" onClick={() => void load()} disabled={busy}>{busy ? 'Đang tải…' : 'Làm mới đối soát'}</button>
    {error && <p role="alert">{error}</p>}
    {wallet && <>
      <dl><dt>Số dư có thể rút</dt><dd>{money(wallet.availableBalance)}</dd><dt>Tiền GoMate đã xác minh đang giữ</dt><dd>{money(wallet.verifiedHeldBalance)}</dd><dt>Cọc ghi nhận thủ công</dt><dd>{money(wallet.recordedAmount)}</dd><dt>Phí dự kiến ({wallet.estimatedFeeBps / 100}%)</dt><dd>{money(wallet.estimatedFee)}</dd><dt>Doanh nghiệp dự kiến nhận sau phí</dt><dd>{money(wallet.estimatedNet)}</dd></dl>
      <p>Phí 10% chỉ là dự kiến trên từng khoản cọc, chưa khấu trừ tiền thật. Hoàn tất hoạt động không tự tạo số dư có thể rút.</p>
      <div className="gm-table-wrap"><table className="gm-table"><caption>Đối soát theo nhóm — chỉ tính thành viên được duyệt có cọc đã ghi nhận</caption><thead><tr><th>Nhóm</th><th>Người đã ghi nhận cọc</th><th>Cọc ghi nhận</th><th>Phí dự kiến</th><th>Sau phí dự kiến</th></tr></thead><tbody>{wallet.groups.map(group => <tr key={group.id}><td>{group.name}</td><td>{group.recordedMembers}</td><td>{money(group.recordedAmount)}</td><td>{money(group.estimatedFee)}</td><td>{money(group.estimatedNet)}</td></tr>)}</tbody></table></div>
      {!wallet.groups.length && <p>Chưa có nhóm để đối soát.</p>}
    </>}
  </section>;
}
