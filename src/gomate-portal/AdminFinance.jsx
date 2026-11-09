import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { MetricCard, PillButton, StatusPill } from './GoMatePortal';
import { usePortalNotice } from './PortalNotifications';
import './finance.css';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const date = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const names = { processing: 'Đang chuyển tiền', pending: 'Chờ duyệt', approved: 'Đã duyệt, chờ chuyển', completed: 'Đã ghi nhận chuyển tiền', rejected: 'Từ chối', blocked: 'Tạm khóa', waiting: 'Chờ xác minh' };
const tabs = [['incoming', 'Đối soát tiền vào'], ['settlements', 'Xác minh hoạt động'], ['refunds', 'Hoàn cọc'], ['payouts', 'Giải ngân'], ['disputes', 'Khiếu nại'], ['audit', 'Lịch sử']];
export default function AdminFinance({ refreshVersion = 0 }) {
  const [data, setData] = useState(null), [tab, setTab] = useState('incoming'), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editor, setEditor] = useState(null), [form, setForm] = useState({});
  const sequence = useRef(0), lock = useRef(false), notify = usePortalNotice();
  const load = useCallback(async () => {
    const current = ++sequence.current; setLoading(true);
    try { const result = await api('/portal/finance?page=' + page, { timeoutMs: 10000 }); if (current === sequence.current) { setData(result); setError(''); } }
    catch (reason) { if (current === sequence.current) setError(reason.message); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [page]);
  useEffect(() => { let active = true; const pending = sequence; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; pending.current++; }; }, [load, refreshVersion]);
  const open = value => { setEditor(value); setError(''); setForm({ amount: value.payment?.amount || '', transactionRef: '', transferRef: '', note: '', evidence: '', overrideReason: '', orderCode: '', bankTransferConfirmed: false, bankTransferNotSent: false }); };
  const close = () => { if (!busy) setEditor(null); };
  useEffect(() => {
    if (!editor) return;
    const previous = document.activeElement;
    document.querySelector('.gm-finance-dialog input, .gm-finance-dialog textarea')?.focus();
    const key = event => { if (event.key === 'Escape' && !lock.current) setEditor(null); };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [editor]);
  const save = async event => {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      let path, body;
      const { kind, group, lot, payout, payment, bankEvent, action } = editor;
      if (kind === 'verify') { path = `/payments/${payment.id}/verify`; body = { amount: Number(form.amount), transactionRef: form.transactionRef, evidence: form.evidence }; }
      if (kind === 'assign') { path = `/incoming/${bankEvent.id}/assign`; body = { orderCode: form.orderCode.trim().toUpperCase() }; }
      if (kind === 'settlement') { path = `/groups/${group.id}/review`; body = { evidence: form.evidence, note: form.note, overrideReason: form.overrideReason }; }
      if (kind === 'refund') { path = `/refunds/${lot.paymentId}/review`; body = { action, note: form.note, ...(action === 'complete' ? { transferRef: form.transferRef, bankTransferConfirmed: form.bankTransferConfirmed } : {}) }; }
      if (kind === 'payout') { path = `/groups/${group.id}/payouts/${payout.id}/review`; body = { action, note: form.note, ...(action === 'complete' ? { transferRef: form.transferRef, bankTransferConfirmed: form.bankTransferConfirmed } : {}), ...(action === 'transfer_failed' ? { bankTransferNotSent: form.bankTransferNotSent } : {}) }; }
      if (kind === 'dispute') { path = `/groups/${group.id}/disputes/${lot.paymentId}`; body = { note: form.note, ...(action ? { outcome: action } : {}) }; }
      await api('/portal/finance' + path, { method: 'POST', body: JSON.stringify(body) });
      notify('Đã cập nhật hồ sơ tài chính.'); setEditor(null); await load();
    } catch (reason) { setError(reason.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const groups = data?.groups || [], refunds = groups.flatMap(group => group.lots.filter(lot => lot.refund).map(lot => ({ group, lot }))), payouts = groups.flatMap(group => group.payouts.map(payout => ({ group, payout })));
  const disputes = groups.flatMap(group => group.lots.filter(lot => lot.state === 'disputed').map(lot => ({ group, lot })));
  const summary = data?.summary;
  const pageSize = tab === 'incoming' ? 50 : 20;
  const total = tab === 'incoming' ? Math.max(data?.incomingTotal || 0, data?.unmatchedTotal || 0) : data?.total || 0;
  const field = (key, label, { minLength = 5, maxLength = 2000, type = 'text', required = true } = {}) => <label className="gm-field"><span>{label}</span>{type === 'textarea' ? <textarea aria-label={label} className="gm-simple-input" required={required} minLength={minLength} maxLength={maxLength} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} /> : <input aria-label={label} className="gm-simple-input" type={type} required={required} min={type === 'number' ? 1 : undefined} step={type === 'number' ? 1 : undefined} minLength={minLength} maxLength={maxLength} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} />}</label>;
  const target = editor?.lot?.refund || editor?.payout;
  return <section className="gm-finance" aria-busy={loading}>
    <div className="gm-finance-heading"><h3>Tài chính & doanh thu</h3><PillButton variant="secondary" disabled={loading} onClick={() => void load()}>Làm mới tài chính</PillButton></div>
    <div className="gm-metric-grid">{[['received', 'Tiền vào đã đối soát'], ['held', 'Cọc đang giữ'], ['refunded', 'Đã hoàn cho người dùng'], ['businessPaid', 'Đã trả doanh nghiệp'], ['feeRevenue', 'Doanh thu phí đã thực hiện']].map(([key, label]) => <MetricCard key={key} label={label} value={summary ? money(summary[key]) : '—'} icon="wallet" tone="purple" />)}</div>
    {summary && <p className="gm-finance-equation">Tiền vào = cọc đang giữ + tiền hoàn + tiền trả doanh nghiệp + phí: <strong>{summary.received === summary.held + summary.refunded + summary.businessPaid + summary.feeRevenue ? 'Khớp' : 'Cần đối soát'}</strong></p>}
    <div className="gm-active-tabs" role="tablist" aria-label="Tài chính">{tabs.map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} key={id} onClick={() => { setTab(id); setPage(1); }}>{label}</button>)}</div>
    {error && <p role="alert" className="gm-form-error">{error}</p>}
    {!data && loading && <p role="status">Đang tải tài chính…</p>}
    {tab === 'incoming' && <section className="gm-panel gm-live-panel"><h4>Giao dịch cần đối soát</h4><div className="gm-table-wrap"><table className="gm-table"><thead><tr><th>Giao dịch</th><th>Người thanh toán</th><th>Số tiền dự kiến</th><th /></tr></thead><tbody>{data?.unreconciled.map(payment => <tr key={payment.id}><td><strong>{payment.orderCode}</strong><small>{payment.activityTitle}</small></td><td>{payment.userName || payment.userId}<small>{payment.reportedAt ? 'Đã báo chuyển khoản' : 'Chưa đối soát'}</small></td><td>{money(payment.amount)}</td><td><PillButton variant="secondary" onClick={() => open({ kind: 'verify', payment })}>Đối soát tiền vào</PillButton></td></tr>)}</tbody></table></div>{!data?.unreconciled.length && <p>Không có giao dịch cần đối soát.</p>}
      {data?.unmatched.length > 0 && <><h4>Tiền vào chưa khớp mã</h4>{data.unmatched.map(bankEvent => <div className="gm-finance-row" key={bankEvent.id}><span>{bankEvent.transactionRef} · {money(bankEvent.amount)}</span><PillButton variant="secondary" onClick={() => open({ kind: 'assign', bankEvent })}>Gắn mã thanh toán</PillButton></div>)}</>}
    </section>}
    {tab === 'settlements' && <section className="gm-panel gm-live-panel"><h4>Xác minh trước giải ngân</h4>{groups.map(group => <article className="gm-finance-card" key={group.id}><div><strong>{group.title}</strong><StatusPill status={group.settlement.status}>{names[group.settlement.status] || group.settlement.status}</StatusPill></div><p>{group.activityStatus || 'Không còn hoạt động'} · Hết thời gian giữ cọc: {date(group.holdUntil)}</p><p>{group.lots.filter(lot => lot.confirmation?.status === 'attended').length}/{group.lots.length} xác nhận từ thành viên</p>{group.blockedReason && <p className="gm-live-muted">{group.blockedReason}</p>}<PillButton variant="secondary" disabled={Boolean(group.blockedReason) || group.settlement.status === 'approved'} onClick={() => open({ kind: 'settlement', group })}>Xác minh hoạt động</PillButton></article>)}</section>}
    {tab === 'refunds' && <section className="gm-panel gm-live-panel"><h4>Yêu cầu hoàn tiền</h4>{refunds.map(({ group, lot }) => <article className="gm-finance-card" key={lot.refund.id}><div><strong>{group.title} · {money(lot.refund.amount)}</strong><StatusPill status={lot.refund.status}>{names[lot.refund.status]}</StatusPill></div><p>{lot.refund.reason}</p><p>{lot.refund.bankAccount.bankId} · {lot.refund.bankAccount.accountNo} · {lot.refund.bankAccount.accountName}</p><small>{lot.refund.policy === 'full_refund' ? 'Hoàn đủ theo chính sách' : 'Cần xem xét tình huống hủy sát giờ/vắng mặt'} · {date(lot.refund.requestedAt)}</small><div className="gm-live-actions">{lot.refund.status === 'pending' && <><PillButton onClick={() => open({ kind: 'refund', group, lot, action: 'approve' })}>Duyệt hoàn tiền</PillButton>{lot.refund.policy === 'manual_review' && <PillButton variant="secondary" onClick={() => open({ kind: 'refund', group, lot, action: 'reject' })}>Từ chối hoàn</PillButton>}</>}{lot.refund.status === 'approved' && <PillButton onClick={() => open({ kind: 'refund', group, lot, action: 'complete' })}>Xác nhận đã hoàn tiền</PillButton>}</div>{lot.refund.transferRef && <small>Mã chuyển tiền: {lot.refund.transferRef}</small>}</article>)}{!refunds.length && <p>Chưa có yêu cầu hoàn tiền trong trang này.</p>}</section>}
    {tab === 'payouts' && <section className="gm-panel gm-live-panel"><h4>Giải ngân doanh nghiệp</h4>{payouts.map(({ group, payout }) => <article className="gm-finance-card" key={payout.id}><div><strong>{group.title} · {payout.referenceCode}</strong><StatusPill status={payout.status}>{names[payout.status]}</StatusPill></div><p>Chuyển doanh nghiệp: <strong>{money(payout.amount)}</strong> · Phí: {money(payout.feeAmount)}</p><p>{payout.bankAccount.bankId} · {payout.bankAccount.accountNo} · {payout.bankAccount.accountName}</p><div className="gm-live-actions">{payout.status === 'pending' && <PillButton onClick={() => open({ kind: 'payout', group, payout, action: 'approve' })}>Duyệt giải ngân</PillButton>}{['pending', 'approved'].includes(payout.status) && <PillButton variant="secondary" onClick={() => open({ kind: 'payout', group, payout, action: 'reject' })}>Từ chối giải ngân</PillButton>}{payout.status === 'approved' && <PillButton onClick={() => open({ kind: 'payout', group, payout, action: 'start_transfer' })}>Khóa lệnh & chuẩn bị chuyển</PillButton>}{payout.status === 'processing' && <PillButton onClick={() => open({ kind: 'payout', group, payout, action: 'complete' })}>Xác nhận đã chuyển tiền</PillButton>}</div>{payout.status === 'processing' && <PillButton variant="secondary" onClick={() => open({ kind: 'payout', group, payout, action: 'transfer_failed' })}>Ngân hàng xác nhận chưa chuyển</PillButton>}{payout.transferRef && <small>Mã ngân hàng: {payout.transferRef}</small>}</article>)}{!payouts.length && <p>Chưa có yêu cầu giải ngân trong trang này.</p>}{data?.legacyPayouts.length > 0 && <details><summary>Lệnh cũ cần kiểm tra chứng từ ({data.legacyPayouts.length})</summary>{data.legacyPayouts.map(row => <p key={row.id}>{row.referenceCode} · {money(row.amount)} · Chưa đưa vào doanh thu đã xác minh.</p>)}</details>}</section>}
    {tab === 'disputes' && <section className="gm-panel gm-live-panel"><h4>Khiếu nại giữ tiền</h4>{disputes.map(({ group, lot }) => <article className="gm-finance-card" key={lot.paymentId}><strong>{group.title} · {money(lot.amount)}</strong><p>{lot.confirmation?.note}</p><p>Thành viên: {lot.userId}</p><div className="gm-live-actions"><PillButton variant="secondary" onClick={() => open({ kind: 'dispute', group, lot, action: 'release' })}>Ghi kết quả xử lý</PillButton><PillButton onClick={() => open({ kind: 'dispute', group, lot, action: 'refund' })}>Chấp nhận & duyệt hoàn cọc</PillButton></div></article>)}{!disputes.length && <p>Không có khiếu nại trong trang này.</p>}</section>}
    {tab === 'audit' && <section className="gm-panel gm-live-panel"><h4>Lịch sử đối soát</h4>{groups.map(group => <details key={group.id}><summary>{group.title}</summary>{[...group.audit].reverse().map(item => <p key={item.id}>{date(item.createdAt)} · {item.action} · {item.actorId}{item.note ? ` · ${item.note}` : ''}</p>)}</details>)}</section>}
    <div className="gm-live-actions"><PillButton variant="secondary" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Trang trước</PillButton><span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span><PillButton variant="secondary" disabled={loading || page * pageSize >= total} onClick={() => setPage(value => value + 1)}>Trang sau</PillButton></div>
    {editor && <div className="gm-modal-backdrop"><section className="gm-user-modal gm-finance-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title"><header className="gm-modal-head"><h3 id="finance-dialog-title">{editor.action === 'complete' ? 'Ghi nhận chuyển tiền ngân hàng' : 'Xử lý hồ sơ tài chính'}</h3><PillButton variant="secondary" disabled={busy} onClick={close}>Đóng</PillButton></header><form className="gm-auth-form" onSubmit={save}><fieldset disabled={busy} className="gm-finance-fields">
      {target && <div className="gm-finance-target"><strong>{money(target.amount)}</strong><p>{target.bankAccount.bankId} · {target.bankAccount.accountNo} · {target.bankAccount.accountName}</p></div>}
      {editor.kind === 'verify' && <>{field('amount', 'Số tiền thực nhận', { type: 'number' })}{field('transactionRef', 'Mã giao dịch tiền vào', { minLength: 6, maxLength: 120 })}{field('evidence', 'Bằng chứng đối soát ngân hàng', { type: 'textarea', minLength: 10 })}</>}
      {editor.kind === 'assign' && field('orderCode', 'Mã thanh toán GM', { minLength: 8, maxLength: 14 })}
      {editor.kind === 'settlement' && <>{field('evidence', 'Bằng chứng hoạt động thực tế', { type: 'textarea', minLength: 10 })}{editor.group.lots.some(lot => lot.state === 'held' && !lot.refundOnly && lot.confirmation?.status !== 'attended') && field('overrideReason', 'Lý do xác minh thay xác nhận thành viên', { type: 'textarea', minLength: 15, maxLength: 1000 })}</>}
      {!['verify', 'assign'].includes(editor.kind) && field('note', 'Kết quả / ghi chú xử lý', { type: 'textarea', minLength: editor.kind === 'dispute' || editor.action === 'transfer_failed' ? 15 : 5, maxLength: 1000 })}
      {editor.action === 'start_transfer' && <p>Khóa khoản tiền trước khi mở ngân hàng chuyển. Khi kết quả chưa rõ, giữ lệnh để đối soát, không chuyển lại.</p>}
      {editor.action === 'transfer_failed' && <label className="gm-finance-ack"><input type="checkbox" required checked={form.bankTransferNotSent} onChange={event => setForm(value => ({ ...value, bankTransferNotSent: event.target.checked }))} />Tôi đã kiểm tra với ngân hàng: tiền chưa bị trừ/chuyển, có thể mở khóa an toàn.</label>}
      {editor.action === 'complete' && <>{field('transferRef', 'Mã giao dịch chuyển tiền', { minLength: 6, maxLength: 120 })}<label className="gm-finance-ack"><input type="checkbox" required checked={form.bankTransferConfirmed} onChange={event => setForm(value => ({ ...value, bankTransferConfirmed: event.target.checked }))} />Tôi đã chuyển đúng số tiền tới tài khoản trên và kiểm tra giao dịch thành công.</label></>}
      {error && <p role="alert" className="gm-form-error">{error}</p>}<PillButton type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận xử lý'}</PillButton>
    </fieldset></form></section></div>}
  </section>;
}
