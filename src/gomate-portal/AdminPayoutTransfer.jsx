import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { PillButton } from './GoMatePortal';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const encoded = value => encodeURIComponent(value);
const readFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, mime: file.type, base64: String(reader.result).split(',')[1] });
  reader.onerror = () => reject(new Error('Không đọc được ảnh bill. Vui lòng chọn lại ảnh.'));
  reader.readAsDataURL(file);
});

export default function AdminPayoutTransfer({ group, payout, refundPaymentId, onClose, onChanged, onCompleted }) {
  const refundMode = Boolean(refundPaymentId);
  const viewing = payout.status === 'completed';
  const [phase, setPhase] = useState(payout.status === 'processing' ? 'transfer' : viewing ? 'receipt' : 'confirm');
  const [transfer, setTransfer] = useState(null), [receipt, setReceipt] = useState(null);
  const [file, setFile] = useState(null), [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(phase !== 'confirm'), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [qrAttempt, setQrAttempt] = useState(0), [qrError, setQrError] = useState(false);
  const lock = useRef(false), dialog = useRef(null);
  const path = refundMode ? `/portal/finance/refunds/${encoded(refundPaymentId)}` : `/portal/finance/groups/${encoded(group.id)}/payouts/${encoded(payout.id)}`;
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const key = event => {
      if (event.key === 'Escape' && !lock.current) onClose();
      if (event.key !== 'Tab') return;
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (payout.status !== 'processing' && !viewing) return;
    const controller = new AbortController(); setLoading(true); setError('');
    api(`${path}/${viewing ? 'receipt' : 'transfer'}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) { if (viewing) setReceipt(result); else setTransfer(result.transfer); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, payout.status, viewing, retry]);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const prepare = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const result = await api(`${path}/prepare-transfer`, { method: 'POST', body: '{}' });
      setTransfer(result.transfer); setPhase('transfer'); await onChanged();
    } catch (reason) { setError(reason.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const complete = async event => {
    event.preventDefault(); if (lock.current || !file) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await api(`${path}/receipt`, { method: 'POST', body: JSON.stringify({ receipt: await readFile(file) }), timeoutMs: 60000 });
      onCompleted();
    } catch (reason) { setError(reason.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const bank = transfer?.bankAccount || payout.bankAccount;
  return <div className="gm-modal-backdrop gm-payout-backdrop"><section ref={dialog} tabIndex={-1} className="gm-user-modal gm-finance-dialog gm-payout-dialog" role="dialog" aria-modal="true" aria-labelledby="payout-dialog-title" aria-busy={busy || loading}>
    <header className="gm-modal-head"><h3 id="payout-dialog-title">{viewing ? 'Bill chuyển khoản' : phase === 'confirm' ? refundMode ? 'Xác nhận hoàn cọc' : 'Xác nhận giải ngân' : refundMode ? 'Chuyển khoản hoàn cọc' : 'Chuyển khoản doanh nghiệp'}</h3><PillButton variant="secondary" disabled={busy} onClick={onClose}>Đóng</PillButton></header>
    <div className="gm-payout-content">
      <div className="gm-finance-target"><strong>{money(transfer?.amount ?? payout.amount)}</strong><p>{group.title}</p><small>Mã yêu cầu: {payout.referenceCode || payout.id}</small></div>
      <dl className="gm-payout-bank"><div><dt>Ngân hàng</dt><dd>{bank.bankId}</dd></div><div><dt>Số tài khoản</dt><dd>{bank.accountNo}</dd></div><div><dt>Chủ tài khoản</dt><dd>{bank.accountName}</dd></div>{transfer && <div><dt>Nội dung chuyển khoản</dt><dd>{transfer.description}</dd></div>}</dl>
      {loading && <p role="status">Đang tải {viewing ? 'bill' : 'thông tin chuyển khoản'}…</p>}
      {error && (phase !== 'transfer' || !transfer) && <p role="alert" className="gm-form-error">{error}</p>}
      {error && !transfer && phase !== 'confirm' && <PillButton variant="secondary" disabled={loading} onClick={() => setRetry(value => value + 1)}>Thử lại</PillButton>}
      {phase === 'confirm' && <><p>Xác nhận để tạo QR đúng số tiền và tài khoản {refundMode ? 'nhận hoàn cọc' : 'doanh nghiệp'} ở trên. Sau khi chuyển khoản, tải ảnh bill để hoàn tất.</p><PillButton disabled={busy} onClick={() => void prepare()}>{busy ? 'Đang tạo QR…' : refundMode ? 'Xác nhận hoàn cọc' : 'Xác nhận giải ngân'}</PillButton></>}
      {phase === 'transfer' && transfer && <>
        <div className="gm-payout-qr">{qrError ? <><p>Không tải được ảnh QR.</p><PillButton variant="secondary" onClick={() => { setQrError(false); setQrAttempt(value => value + 1); }}>Tải lại QR</PillButton></> : <img src={`${transfer.qrImageUrl}&retry=${qrAttempt}`} alt={refundMode ? 'QR chuyển khoản hoàn cọc cho thành viên' : 'QR chuyển khoản giải ngân cho doanh nghiệp'} referrerPolicy="no-referrer" onError={() => setQrError(true)} />}<p>Quét QR bằng ứng dụng ngân hàng và chuyển đúng số tiền. Nếu đã chuyển, tiếp tục tải bill bên dưới.</p></div>
        <form className="gm-auth-form gm-payout-receipt-form" onSubmit={complete}><label className="gm-field"><span>Ảnh bill chuyển khoản</span><input aria-label="Ảnh bill chuyển khoản" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" required disabled={busy} onChange={event => {
          const selected = event.target.files?.[0]; setFile(null); setError('');
          if (!selected) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || !selected.size || selected.size > 5 * 1024 * 1024) { event.target.value = ''; setError('Chọn ảnh PNG, JPG hoặc WEBP, tối đa 5 MB.'); return; }
          setFile(selected);
        }} /><small>PNG, JPG hoặc WEBP, tối đa 5 MB.</small></label>
          {preview && <img className="gm-payout-receipt-image" src={preview} alt="Ảnh bill chuyển khoản đã chọn" />}
          {error && <p role="alert" className="gm-form-error">{error}</p>}
          <PillButton type="submit" disabled={busy || !file}>{busy ? 'Đang lưu bill…' : 'Lưu bill & hoàn tất'}</PillButton>
        </form>
      </>}
      {phase === 'receipt' && receipt && <><img className="gm-payout-receipt-image" src={`data:${receipt.mime};base64,${receipt.base64}`} alt="Bill chuyển khoản đã lưu" /><a className="gm-btn gm-btn--secondary" href={`data:${receipt.mime};base64,${receipt.base64}`} download={receipt.name}>Tải bill</a></>}
    </div>
  </section></div>;
}
