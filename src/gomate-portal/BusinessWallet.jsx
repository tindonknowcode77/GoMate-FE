import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { usePortalNotice } from './PortalNotifications';
import { StatusPill } from './GoMatePortal';
import { SUPPORTED_BANKS, findBank } from '../constants/banks';
import './finance.css';

const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const groupLabels = { 'admin-approved': 'Có thể yêu cầu giải ngân', processing: 'Đang chuyển tiền', requested: 'Đã gửi yêu cầu', settled: 'Đã quyết toán', refunded: 'Đã hoàn cọc', 'awaiting-review': 'Đang giữ / chờ xác minh' };
const labels = { processing: 'Đang chuyển tiền', pending: 'Chờ admin duyệt', approved: 'Đã duyệt, chờ chuyển khoản', completed: 'Đã đối soát chuyển tiền', rejected: 'Đã từ chối', blocked: 'Tạm khóa' };

export default function BusinessWallet({ refreshVersion = 0 }) {
  const notify = usePortalNotice();
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editBank, setEditBank] = useState(false);
  const [bank, setBank] = useState({ bankId: 'BIDV', accountNo: '', accountName: '', branch: '' });
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const generation = useRef(0), requestKey = useRef(null), lock = useRef(false);
  const accept = data => { setWallet(data); if (data.bankAccount) setBank(data.bankAccount); };
  useEffect(() => {
    const pending = generation, id = ++pending.current;
    void api('/portal/wallet', { timeoutMs: 12000 }).then(data => {
      if (generation.current === id) { accept(data); setError(''); }
    }).catch(reason => { if (generation.current === id) setError(reason.message); });
    return () => { pending.current++; };
  }, [refreshVersion]);
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const id = ++generation.current;
    try {
      const data = await api('/portal/wallet', { timeoutMs: 12000 });
      if (generation.current === id) { accept(data); notify('Đã cập nhật dữ liệu ví và đối soát tiền cọc.'); }
    } catch (reason) { setError(reason.message); notify(reason.message, 'error'); }
    finally { lock.current = false; setBusy(false); }
  };
  const act = async (path, body, message, method = 'POST') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await api(path, { method, body: JSON.stringify(body), timeoutMs: 12000 });
      notify(message); setEditBank(false); requestKey.current = null;
      const id = ++generation.current;
      const data = await api('/portal/wallet', { timeoutMs: 12000 });
      if (generation.current === id) accept(data);
    } catch (reason) { setError(reason.message); notify(reason.message, 'error'); }
    finally { lock.current = false; setBusy(false); }
  };
  const group = wallet?.groups.find(item => item.id === selected && item.eligibleAmount > 0);
  const payout = event => {
    event.preventDefault();
    if (!group || !wallet.bankAccount) return;
    if (!requestKey.current) requestKey.current = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    void act('/portal/wallet/payouts', { activityId: group.id, clientRequestId: requestKey.current, amount: group.eligibleAmount, note }, 'Đã gửi yêu cầu giải ngân. Chờ admin duyệt và đối soát chuyển khoản.');
  };
  return <section className="gm-finance gm-business-wallet">
    <div className="gm-finance-heading"><h2>Ví & giải ngân</h2><button className="gm-btn gm-btn--secondary" disabled={busy} onClick={refresh}>{busy ? 'Đang cập nhật…' : 'Làm mới đối soát'}</button></div>
    {error && <p role="alert" className="gm-form-error">{error}</p>}
    {!wallet ? <p>{error ? 'Chưa tải được dữ liệu ví.' : 'Đang tải ví…'}</p> : <>
      <div className="gm-metric-grid">{[['Đã đối soát tiền vào', wallet.recordedAmount], ['Đang giữ cọc', wallet.escrowHeldAmount], ['Có thể yêu cầu giải ngân', wallet.withdrawableAmount], ['Đã chuyển doanh nghiệp', wallet.paidOutAmount], ['Chờ hoàn người dùng', wallet.refundableAmount]].map(([label, value]) => <div className="gm-finance-target" key={label}><small>{label}</small><br /><strong>{money(value)}</strong></div>)}</div>
      <p className="gm-finance-policy">Giữ cọc ít nhất {wallet.policy.settlementHoldHours} giờ sau lịch kết thúc. Admin xác minh hoạt động, xử lý khiếu nại rồi mới duyệt giải ngân. Phí nền tảng {wallet.policy.feeBps / 100}% trên phần đã giải ngân.</p>
      <section className="gm-panel gm-live-panel"><div className="gm-finance-heading"><h3>Tài khoản nhận giải ngân</h3><button className="gm-btn gm-btn--secondary" onClick={() => setEditBank(!editBank)} disabled={busy}>{editBank ? 'Đóng' : 'Cập nhật ngân hàng'}</button></div>
        {wallet.bankAccount ? (() => {
          const bankInfo = findBank(wallet.bankAccount.bankId);
          return <div className="gm-bank-badge">
            {bankInfo && <img src={bankInfo.logoUrl} alt={bankInfo.shortName} className="gm-bank-logo" />}
            <div>
              <strong>{bankInfo ? `${bankInfo.shortName} (${wallet.bankAccount.bankId})` : wallet.bankAccount.bankId} · {wallet.bankAccount.accountNo}</strong>
              <p style={{ margin: 0 }}>{wallet.bankAccount.accountName}{wallet.bankAccount.branch ? ` · ${wallet.bankAccount.branch}` : ''}</p>
            </div>
          </div>;
        })() : <p>Chưa lưu tài khoản ngân hàng.</p>}
        {editBank && <form className="gm-auth-form" onSubmit={event => { event.preventDefault(); void act('/portal/wallet/bank-account', bank, 'Đã lưu tài khoản nhận giải ngân.', 'PUT'); }}>
          <label>Ngân hàng
            <div className="gm-bank-select-wrap">
              {findBank(bank.bankId) && <img src={findBank(bank.bankId)?.logoUrl} alt={bank.bankId} className="gm-bank-logo" />}
              <select value={bank.bankId || 'MB'} required onChange={event => setBank({ ...bank, bankId: event.target.value })}>
                {SUPPORTED_BANKS.map(item => <option key={item.code} value={item.code}>{item.shortName} ({item.code}) - {item.name}</option>)}
              </select>
            </div>
          </label>
          <label>Số tài khoản<input value={bank.accountNo || ''} required maxLength={25} placeholder="Số tài khoản ngân hàng" onChange={event => setBank({ ...bank, accountNo: event.target.value.trim() })} /></label>
          <label>Chủ tài khoản<input value={bank.accountName || ''} required maxLength={120} placeholder="Tên chủ tài khoản (viết hoa không dấu)" onChange={event => setBank({ ...bank, accountName: event.target.value.toUpperCase() })} /></label>
          <label>Chi nhánh (không bắt buộc)<input value={bank.branch || ''} maxLength={120} placeholder="VD: Chi nhánh TP.HCM" onChange={event => setBank({ ...bank, branch: event.target.value })} /></label>
          <button className="gm-btn gm-btn--secondary" disabled={busy}>Lưu ngân hàng</button>
        </form>}
      </section>
      <section className="gm-panel gm-live-panel"><h3>Tiền cọc theo hoạt động</h3>
        {wallet.groups.length === 0 && <p>Chưa có khoản cọc được đối soát.</p>}
        {wallet.groups.map(item => <article className="gm-finance-card" key={item.id}><div><b>{item.name}</b><StatusPill tone={['admin-approved', 'settled', 'refunded'].includes(item.escrowStatus) ? 'green' : 'orange'}>{groupLabels[item.escrowStatus] || item.escrowStatus}</StatusPill></div><p>Cọc còn lại {money(item.heldAmount)} · Phí dự kiến {money(item.estimatedFee)} · Được nhận {money(item.eligibleAmount)}</p><small>Giữ đến {new Date(item.holdUntil).toLocaleString('vi-VN')} · {item.blockedReason || 'Đã được admin xác minh'}</small></article>)}
      </section>
      <form className="gm-panel gm-live-panel gm-auth-form" onSubmit={payout}><h3>Yêu cầu giải ngân</h3>
        <label>Hoạt động<select aria-label="Hoạt động" value={selected} onChange={event => { setSelected(event.target.value); requestKey.current = null; }} required><option value="">Chọn hoạt động đủ điều kiện</option>{wallet.groups.filter(item => item.eligibleAmount > 0).map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.eligibleAmount)}</option>)}</select></label>
        {group && <p>Giải ngân {money(group.eligibleAmount)} về {wallet.bankAccount?.bankId} · {wallet.bankAccount?.accountNo}. Tài khoản được giữ cố định cho yêu cầu này.</p>}
        <label>Ghi chú<input value={note} maxLength={500} onChange={event => setNote(event.target.value)} /></label><button className="gm-btn gm-btn--secondary" disabled={busy || !group || !wallet.bankAccount}>Gửi admin duyệt</button>
      </form>
      <section className="gm-panel gm-live-panel"><h3>Lịch sử giải ngân</h3>{wallet.payouts.length === 0 && <p>Chưa có yêu cầu.</p>}{wallet.payouts.map(item => <article className="gm-finance-card" key={item.id}><div><b>{money(item.amount)} · {item.activityTitle}</b><StatusPill tone={item.status === 'completed' ? 'green' : ['blocked', 'rejected'].includes(item.status) ? 'red' : 'orange'}>{labels[item.status] || item.status}</StatusPill></div><p>{item.bankAccount.bankId} · {item.bankAccount.accountNo} · {item.bankAccount.accountName}</p>{item.reviewNote && <small>{item.reviewNote}</small>}{item.transferRef && <small>Mã giao dịch: {item.transferRef}</small>}<small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></article>)}</section>
      {wallet.legacyPayouts?.length > 0 && <p className="gm-finance-policy">Có {wallet.legacyPayouts.length} yêu cầu từ luồng cũ cần admin kiểm tra riêng; chưa tính là tiền đã chuyển.</p>}
    </>}
  </section>;
}
