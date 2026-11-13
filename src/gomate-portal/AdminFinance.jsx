import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Icon, PillButton, StatusPill } from './GoMatePortal';
import { usePortalNotice } from './PortalNotifications';
import './finance.css';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const date = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const names = { processing: 'Đang chuyển tiền', pending: 'Chờ duyệt', approved: 'Đã duyệt, chờ chuyển', completed: 'Đã ghi nhận chuyển tiền', rejected: 'Từ chối', blocked: 'Tạm khóa', waiting: 'Chờ xác minh' };
const tabs = [['incoming', 'Đối soát tiền vào', 'arrow'], ['deposit_changes', 'Đổi mức cọc', 'wallet'], ['settlements', 'Xác minh hoạt động', 'activity'], ['refunds', 'Hoàn cọc', 'refresh'], ['payouts', 'Giải ngân', 'business'], ['disputes', 'Khiếu nại', 'shield'], ['audit', 'Lịch sử', 'grid']];
export default function AdminFinance({ refreshVersion = 0 }) {
  const [data, setData] = useState(null), [depositChanges, setDepositChanges] = useState([]), [tab, setTab] = useState('incoming'), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editor, setEditor] = useState(null), [form, setForm] = useState({});
  const sequence = useRef(0), lock = useRef(false), notify = usePortalNotice();
  const load = useCallback(async () => {
    const current = ++sequence.current; setLoading(true);
    try {
      const [result, changes] = await Promise.all([
        api('/portal/finance?page=' + page, { timeoutMs: 10000 }),
        api('/portal/deposit-changes', { timeoutMs: 10000 }).catch(() => ({ items: [] })),
      ]);
      if (current === sequence.current) { setData(result); setDepositChanges(changes?.items || []); setError(''); }
    }
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
  const balanced = summary && summary.received === summary.held + summary.refunded + summary.businessPaid + summary.feeRevenue;
  const financeStats = [
    ['received', 'Tiền vào đã đối soát', 'arrow', 'emerald'],
    ['held', 'Tiền cọc đang giữ', 'lock', 'blue'],
    ['refunded', 'Đã hoàn cho người dùng', 'refresh', 'amber'],
    ['businessPaid', 'Đã trả doanh nghiệp', 'business', 'teal'],
    ['feeRevenue', 'Doanh thu phí đã thực hiện', 'activity', 'slate'],
  ];
  const tabCounts = {
    incoming: (data?.incomingTotal || 0) + (data?.unmatchedTotal || 0),
    deposit_changes: depositChanges.length,
    settlements: groups.filter(group => group.settlement.status !== 'approved' && !group.blockedReason).length,
    refunds: summary?.pendingRefunds || 0,
    payouts: summary?.pendingPayouts || 0,
    disputes: disputes.length,
    audit: groups.reduce((count, group) => count + group.audit.length, 0),
  };
  const panelHeading = (eyebrow, title, description, count) => <header className="gm-finance-panel-heading"><div><span>{eyebrow}</span><h4>{title}</h4><p>{description}</p></div>{count !== undefined && <span className="gm-finance-result-count">{count}</span>}</header>;
  const field = (key, label, { minLength = 5, maxLength = 2000, type = 'text', required = true } = {}) => <label className="gm-field"><span>{label}</span>{type === 'textarea' ? <textarea aria-label={label} className="gm-simple-input" required={required} minLength={minLength} maxLength={maxLength} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} /> : <input aria-label={label} className="gm-simple-input" type={type} required={required} min={type === 'number' ? 1 : undefined} step={type === 'number' ? 1 : undefined} minLength={minLength} maxLength={maxLength} value={form[key]} onChange={event => setForm(value => ({ ...value, [key]: event.target.value }))} />}</label>;
  const target = editor?.lot?.refund || editor?.payout;
  return <section className="gm-finance" aria-busy={loading}>
    <header className="gm-finance-heading">
      <div><span className="gm-finance-eyebrow">TỔNG QUAN SỐ DƯ</span><p>Theo dõi tiền vào, tiền đang giữ và các khoản chi trả đã xác minh.</p></div>
      <PillButton variant="secondary" icon="refresh" disabled={loading} onClick={() => void load()}>{loading ? 'Đang cập nhật…' : 'Làm mới tài chính'}</PillButton>
    </header>
    <div className="gm-finance-metrics">{financeStats.map(([key, label, icon, tone]) => <article className={`gm-finance-metric gm-finance-metric--${tone}`} key={key}>
      <span className="gm-finance-metric-icon"><Icon name={icon} size={18} /></span><span className="gm-finance-metric-label">{label}</span><strong>{summary ? money(summary[key]) : '—'}</strong>
    </article>)}</div>
    {summary && <section className={`gm-finance-reconciliation ${balanced ? 'is-balanced' : 'needs-review'}`}>
      <div className="gm-finance-reconciliation-heading"><span className="gm-finance-reconciliation-icon"><Icon name={balanced ? 'check' : 'shield'} size={17} /></span><div><strong>Đối soát tổng</strong><span>Tiền vào được phân bổ vào các khoản hiện có</span></div><StatusPill tone={balanced ? 'green' : 'orange'}>{balanced ? 'Khớp sổ' : 'Cần đối soát'}</StatusPill></div>
      <div className="gm-finance-equation" aria-label="Phân bổ tổng tiền vào">
        {[['Tiền vào', summary.received], ['Đang giữ', summary.held], ['Đã hoàn', summary.refunded], ['Đã trả', summary.businessPaid], ['Phí', summary.feeRevenue]].map(([label, value], index) => <div className="gm-finance-equation-item" key={label}><span>{label}</span><strong>{money(value)}</strong>{index === 0 ? <i aria-hidden="true">=</i> : index < 4 ? <i aria-hidden="true">+</i> : null}</div>)}
      </div>
    </section>}
    <div className="gm-finance-tabs-wrap"><span className="gm-finance-tabs-label">NGHIỆP VỤ</span><div className="gm-active-tabs gm-finance-tabs" role="tablist" aria-label="Tài chính">{tabs.map(([id, label, icon]) => <button type="button" role="tab" aria-label={label} aria-selected={tab === id} className={tab === id ? 'is-active' : ''} key={id} onClick={() => { setTab(id); setPage(1); }}><Icon name={icon} size={16} /><span>{label}</span>{Boolean(tabCounts[id]) && <small>{tabCounts[id]}</small>}</button>)}</div></div>
    {error && <p role="alert" className="gm-form-error">{error}</p>}
    {!data && loading && <p role="status">Đang tải tài chính…</p>}
    {tab === 'incoming' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('ĐỐI SOÁT NGÂN HÀNG', 'Giao dịch cần đối soát', 'Xác nhận tiền thực nhận từ sao kê ngân hàng.', data?.incomingTotal || 0)}
      {data?.unreconciled.length ? <div className="gm-table-wrap gm-finance-table-wrap"><table className="gm-table gm-finance-table"><thead><tr><th>Mã thanh toán</th><th>Người thanh toán</th><th>Số tiền dự kiến</th><th>Trạng thái</th><th /></tr></thead><tbody>{data.unreconciled.map(payment => <tr key={payment.id}><td data-label="Mã thanh toán"><strong>{payment.orderCode}</strong><small>{payment.activityTitle}</small></td><td data-label="Người thanh toán">{payment.userName || payment.userId}<small>{payment.reportedAt ? 'Đã báo chuyển khoản' : 'Chưa đối soát'}</small></td><td data-label="Số tiền dự kiến"><strong className="gm-finance-table-amount">{money(payment.amount)}</strong></td><td data-label="Trạng thái"><StatusPill tone={payment.reportedAt ? 'orange' : 'neutral'}>{payment.reportedAt ? 'Chờ xác minh' : 'Chưa báo chuyển'}</StatusPill></td><td data-label="Thao tác"><PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'verify', payment })}>Đối soát tiền vào</PillButton></td></tr>)}</tbody></table></div> : <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Không có giao dịch cần đối soát.</span></div>}
      {data?.unmatched.length > 0 && <div className="gm-finance-unmatched"><div className="gm-finance-subheading"><div><span className="gm-finance-subheading-icon"><Icon name="warning" size={16} /></span><div><h5>Tiền vào chưa khớp mã</h5><p>Khoản tiền đã nhận nhưng chưa liên kết được với lệnh thanh toán.</p></div></div><span>{data.unmatchedTotal}</span></div>{data.unmatched.map(bankEvent => <article className="gm-finance-unmatched-row" key={bankEvent.id}><div><strong>{money(bankEvent.amount)}</strong><span>Mã giao dịch {bankEvent.transactionRef}</span><small>{date(bankEvent.createdAt)}</small></div><PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'assign', bankEvent })}>Gắn mã thanh toán</PillButton></article>)}</div>}
    </section>}
    {tab === 'deposit_changes' && <section className="gm-panel gm-live-panel">
      <h4>Yêu cầu thay đổi mức tiền cọc từ Doanh nghiệp</h4>
      {depositChanges.map(item => <article className="gm-finance-card" key={item.activityId}>
        <div><strong>{item.groupName}</strong><StatusPill status="pending">Chờ Admin duyệt</StatusPill></div>
        <p>Đề xuất đổi cọc: <strong>{money(item.request.previousAmount)}</strong> &rarr; <strong>{money(item.request.requestedAmount)}</strong></p>
        <p>Đã có <strong>{item.paidCount}</strong> thành viên đóng cọc mức cũ · Lý do: {item.request.reason}</p>
        <div className="gm-live-actions">
          <PillButton variant="secondary" disabled={busy} onClick={() => void (async () => {
            setBusy(true);
            try { await api(`/portal/groups/${item.activityId}/deposit-change`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', note: 'Admin từ chối thay đổi mức cọc' }) }); notify('Đã từ chối yêu cầu đổi mức cọc.'); await load(); }
            catch (reason) { setError(reason.message); } finally { setBusy(false); }
          })()}>Từ chối</PillButton>
          <PillButton disabled={busy} onClick={() => void (async () => {
            setBusy(true);
            try { await api(`/portal/groups/${item.activityId}/deposit-change`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', note: 'Admin đã duyệt mức cọc mới' }) }); notify('Đã duyệt thay đổi mức cọc mới.'); await load(); }
            catch (reason) { setError(reason.message); } finally { setBusy(false); }
          })()}>Duyệt mức cọc mới</PillButton>
        </div>
      </article>)}
      {!depositChanges.length && <p>Không có yêu cầu thay đổi mức cọc nào đang chờ duyệt.</p>}
    </section>}
    {tab === 'settlements' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('ĐIỀU KIỆN GIẢI NGÂN', 'Xác minh hoạt động', 'Kiểm tra hoạt động và điều kiện giữ cọc trước khi giải ngân.', groups.length)}
      {groups.map(group => <article className="gm-finance-card" key={group.id}>
        <div className="gm-finance-card-heading"><div><strong>{group.title}</strong><small>Mã nhóm {group.id}</small></div><StatusPill status={group.settlement.status}>{names[group.settlement.status] || group.settlement.status}</StatusPill></div>
        <div className="gm-finance-facts"><div><span>Trạng thái hoạt động</span><strong>{group.activityStatus || 'Không còn hoạt động'}</strong></div><div><span>Hết thời gian giữ cọc</span><strong>{date(group.holdUntil)}</strong></div><div><span>Xác nhận tham dự</span><strong>{group.lots.filter(lot => lot.confirmation?.status === 'attended').length} / {group.lots.length}</strong></div></div>
        {group.blockedReason && <p className="gm-finance-blocked"><Icon name="shield" size={15} />{group.blockedReason}</p>}
        <div className="gm-finance-card-actions"><PillButton variant="secondary" disabled={Boolean(group.blockedReason) || group.settlement.status === 'approved' || busy} onClick={() => open({ kind: 'settlement', group })}>Xác minh hoạt động</PillButton></div>
      </article>)}
      {!groups.length && <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Không có hoạt động cần xác minh trong trang này.</span></div>}
    </section>}
    {tab === 'refunds' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('YÊU CẦU THÀNH VIÊN', 'Hoàn cọc', 'Duyệt yêu cầu và ghi nhận giao dịch hoàn tiền đã thực hiện.', refunds.length)}
      {refunds.map(({ group, lot }) => <article className="gm-finance-card" key={lot.refund.id}>
        <div className="gm-finance-card-heading"><div><strong>{group.title}</strong><small>{lot.refund.policy === 'full_refund' ? 'Hoàn đủ theo chính sách' : 'Cần xem xét tình huống hủy sát giờ hoặc vắng mặt'}</small></div><StatusPill status={lot.refund.status}>{names[lot.refund.status]}</StatusPill></div>
        <div className="gm-finance-amount-row"><span>Số tiền hoàn</span><strong>{money(lot.refund.amount)}</strong></div>
        <p className="gm-finance-reason">{lot.refund.reason}</p>
        <div className="gm-finance-facts"><div><span>Ngân hàng</span><strong>{lot.refund.bankAccount.bankId}</strong></div><div><span>Số tài khoản</span><strong>{lot.refund.bankAccount.accountNo}</strong></div><div><span>Chủ tài khoản</span><strong>{lot.refund.bankAccount.accountName}</strong></div><div><span>Ngày yêu cầu</span><strong>{date(lot.refund.requestedAt)}</strong></div></div>
        {lot.refund.transferRef && <p className="gm-finance-transfer-ref"><Icon name="check" size={14} />Mã chuyển tiền: {lot.refund.transferRef}</p>}
        {(lot.refund.status === 'pending' || lot.refund.status === 'approved') && <div className="gm-finance-card-actions">{lot.refund.status === 'pending' && <><PillButton disabled={busy} onClick={() => open({ kind: 'refund', group, lot, action: 'approve' })}>Duyệt hoàn tiền</PillButton>{lot.refund.policy === 'manual_review' && <PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'refund', group, lot, action: 'reject' })}>Từ chối hoàn</PillButton>}</>}{lot.refund.status === 'approved' && <PillButton disabled={busy} onClick={() => open({ kind: 'refund', group, lot, action: 'complete' })}>Xác nhận đã hoàn tiền</PillButton>}</div>}
      </article>)}
      {!refunds.length && <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Chưa có yêu cầu hoàn cọc trong trang này.</span></div>}
    </section>}
    {tab === 'payouts' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('CHI TRẢ DOANH NGHIỆP', 'Giải ngân', 'Theo dõi phê duyệt, lệnh chuyển và chứng từ ngân hàng.', payouts.length)}
      {payouts.map(({ group, payout }) => <article className="gm-finance-card" key={payout.id}>
        <div className="gm-finance-card-heading"><div><strong>{group.title}</strong><small>Mã yêu cầu {payout.referenceCode}</small></div><StatusPill status={payout.status}>{names[payout.status]}</StatusPill></div>
        <div className="gm-finance-money-breakdown"><div><span>Chuyển doanh nghiệp</span><strong>{money(payout.amount)}</strong></div><div><span>Phí GoMate</span><strong>{money(payout.feeAmount)}</strong></div></div>
        <div className="gm-finance-facts"><div><span>Ngân hàng</span><strong>{payout.bankAccount.bankId}</strong></div><div><span>Số tài khoản</span><strong>{payout.bankAccount.accountNo}</strong></div><div><span>Chủ tài khoản</span><strong>{payout.bankAccount.accountName}</strong></div></div>
        {payout.transferRef && <p className="gm-finance-transfer-ref"><Icon name="check" size={14} /><span>Mã ngân hàng: {payout.transferRef}</span></p>}
        <div className="gm-finance-card-actions">{payout.status === 'pending' && <PillButton disabled={busy} onClick={() => open({ kind: 'payout', group, payout, action: 'approve' })}>Duyệt giải ngân</PillButton>}{['pending', 'approved'].includes(payout.status) && <PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'payout', group, payout, action: 'reject' })}>Từ chối giải ngân</PillButton>}{payout.status === 'approved' && <PillButton disabled={busy} onClick={() => open({ kind: 'payout', group, payout, action: 'start_transfer' })}>Khóa lệnh & chuẩn bị chuyển</PillButton>}{payout.status === 'processing' && <PillButton disabled={busy} onClick={() => open({ kind: 'payout', group, payout, action: 'complete' })}>Xác nhận đã chuyển tiền</PillButton>}{payout.status === 'processing' && <PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'payout', group, payout, action: 'transfer_failed' })}>Ngân hàng xác nhận chưa chuyển</PillButton>}</div>
      </article>)}
      {!payouts.length && <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Chưa có yêu cầu giải ngân trong trang này.</span></div>}
      {data?.legacyPayouts.length > 0 && <details className="gm-finance-legacy"><summary>Lệnh cũ cần kiểm tra chứng từ <span>{data.legacyPayouts.length}</span></summary><div>{data.legacyPayouts.map(row => <p key={row.id}>{row.referenceCode} · {money(row.amount)} · Chưa đưa vào doanh thu đã xác minh.</p>)}</div></details>}
    </section>}
    {tab === 'disputes' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('YÊU CẦU ĐANG TRANH CHẤP', 'Khiếu nại giữ tiền', 'Giữ nguyên khoản tiền cho đến khi có kết quả xử lý.', disputes.length)}
      {disputes.map(({ group, lot }) => <article className="gm-finance-card" key={lot.paymentId}>
        <div className="gm-finance-card-heading"><div><strong>{group.title}</strong><small>Mã hoạt động {group.id}</small></div><StatusPill tone="orange">Đang giữ tiền</StatusPill></div>
        <div className="gm-finance-amount-row"><span>Tiền đang tranh chấp</span><strong>{money(lot.amount)}</strong></div>
        <div className="gm-finance-facts"><div><span>Thành viên</span><strong>{lot.userId}</strong></div><div><span>Ghi chú xác nhận</span><strong>{lot.confirmation?.note || 'Chưa có ghi chú'}</strong></div></div>
        <div className="gm-finance-card-actions"><PillButton variant="secondary" disabled={busy} onClick={() => open({ kind: 'dispute', group, lot, action: 'release' })}>Ghi kết quả xử lý</PillButton><PillButton disabled={busy} onClick={() => open({ kind: 'dispute', group, lot, action: 'refund' })}>Chấp nhận & duyệt hoàn cọc</PillButton></div>
      </article>)}
      {!disputes.length && <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Không có khiếu nại trong trang này.</span></div>}
    </section>}
    {tab === 'audit' && <section className="gm-panel gm-live-panel gm-finance-panel">
      {panelHeading('THEO DÕI THAY ĐỔI', 'Lịch sử đối soát', 'Các thao tác tài chính được ghi nhận theo từng hoạt động.', tabCounts.audit)}
      {groups.map(group => <details className="gm-finance-audit-group" key={group.id}><summary><span><strong>{group.title}</strong><small>{group.audit.length} bản ghi · Mã hoạt động {group.id}</small></span><Icon name="arrow" size={15} /></summary><div>{[...group.audit].reverse().map(item => <article className="gm-finance-audit-entry" key={item.id}><time>{date(item.createdAt)}</time><strong>{item.action}</strong><span>{item.actorId}</span>{item.note && <p>{item.note}</p>}</article>)}</div></details>)}
      {!groups.some(group => group.audit.length) && <div className="gm-finance-empty"><Icon name="check" size={18} /><span>Chưa có lịch sử đối soát trong trang này.</span></div>}
    </section>}
    <div className="gm-live-actions gm-finance-pagination"><PillButton variant="secondary" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Trang trước</PillButton><span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span><PillButton variant="secondary" disabled={loading || page * pageSize >= total} onClick={() => setPage(value => value + 1)}>Trang sau</PillButton></div>
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
