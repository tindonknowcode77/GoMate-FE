import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MetricCard, StatusPill, PillButton, Icon } from './GoMatePortal';

const money = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const escrowTone = (status) =>
  status === 'eligible-after-completion'
    ? 'green'
    : status === 'refund-protected'
      ? 'red'
      : 'orange';

const escrowText = (status) =>
  status === 'eligible-after-completion'
    ? 'Đủ điều kiện giải ngân (90%)'
    : status === 'refund-protected'
      ? 'Bảo vệ hoàn cọc (100%)'
      : 'Đang tạm giữ Escrow';

const POPULAR_BANKS = [
  { id: 'BIDV', name: 'BIDV - Đầu tư & Phát triển VN' },
  { id: 'VCB', name: 'Vietcombank - Ngoại thương VN' },
  { id: 'MB', name: 'MBBank - Quân Đội' },
  { id: 'TCB', name: 'Techcombank - Kỹ Thương' },
  { id: 'CTG', name: 'VietinBank - Công Thương' },
  { id: 'ACB', name: 'ACB - Á Châu' },
  { id: 'VPB', name: 'VPBank - Việt Nam Thịnh Vượng' },
  { id: 'TPB', name: 'TPBank - Tiên Phong' },
];

export default function BusinessWallet() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Bank Account Settings form
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankId, setBankId] = useState('BIDV');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Payout Request form
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('Giải ngân 90% doanh thu cọc sự kiện hoàn tất');
  const [requestingPayout, setRequestingPayout] = useState(false);

  const syncBankFields = (data) => {
    if (data?.bankAccount) {
      setBankId(data.bankAccount.bankId || 'BIDV');
      setAccountNo(data.bankAccount.accountNo || '');
      setAccountName(data.bankAccount.accountName || '');
      setBranch(data.bankAccount.branch || '');
    }
    const withdrawable = data?.withdrawableAmount ?? data?.eligiblePayoutAmount ?? 0;
    setPayoutAmount(withdrawable > 0 ? String(withdrawable) : '');
  };

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/portal/wallet');
      setWallet(data);
      syncBankFields(data);
    } catch (reason) {
      setError(reason.message || 'Không thể tải thông tin ví doanh nghiệp.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    void api('/portal/wallet')
      .then((data) => {
        if (alive) {
          setWallet(data);
          syncBankFields(data);
        }
      })
      .catch((reason) => {
        if (alive) setError(reason.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveBankAccount = async (e) => {
    e.preventDefault();
    setSavingBank(true);
    setError('');
    setNotice('');
    try {
      const res = await api('/portal/wallet/bank-account', {
        method: 'PUT',
        body: JSON.stringify({
          bankId,
          accountNo: accountNo.trim(),
          accountName: accountName.trim().toUpperCase(),
          branch: branch.trim(),
        }),
      });
      setWallet((prev) => (prev ? { ...prev, bankAccount: res.bankAccount } : prev));
      setShowBankForm(false);
      setNotice('Đã lưu thông tin tài khoản ngân hàng thụ hưởng của doanh nghiệp.');
    } catch (reason) {
      setError(reason.message || 'Không thể lưu tài khoản ngân hàng.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setRequestingPayout(true);
    setError('');
    setNotice('');
    try {
      const res = await api('/portal/wallet/payouts', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payoutAmount),
          bankId,
          accountNo: accountNo.trim(),
          accountName: accountName.trim().toUpperCase(),
          note: payoutNote.trim(),
        }),
      });
      if (res.wallet) {
        setWallet(res.wallet);
        syncBankFields(res.wallet);
      }
      setShowPayoutForm(false);
      setNotice(
        `Yêu cầu giải ngân thành công (${res.payout?.referenceCode || 'PO'}): Đã chuyển ${money(res.payout?.amount)} về ${res.payout?.bankAccount?.bankId} · ${res.payout?.bankAccount?.accountNo}.`
      );
    } catch (reason) {
      setError(reason.message || 'Không thể thực hiện yêu cầu giải ngân.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleExportCsv = () => {
    if (!wallet || typeof document === 'undefined') return;
    const headers = [
      'Mã nhóm',
      'Tên nhóm sự kiện',
      'Trạng thái bảo đảm',
      'Số người đã cọc',
      'Số người có mặt',
      'Tổng cọc thu được (VND)',
      'Phí sàn 10% (VND)',
      'Thực nhận 90% (VND)',
    ];
    const rows = (wallet.groups || []).map((g) => [
      g.id,
      `"${String(g.name || '').replace(/"/g, '""')}"`,
      escrowText(g.escrowStatus),
      g.recordedMembers,
      g.attendedMembers ?? 0,
      g.recordedAmount,
      g.estimatedFee,
      g.estimatedNet,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `doi-soat-vi-doanh-nghiep-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalMembers = wallet ? wallet.groups.reduce((sum, g) => sum + g.recordedMembers, 0) : 0;
  const withdrawableAmount = wallet
    ? (wallet.withdrawableAmount ?? wallet.eligiblePayoutAmount ?? 0)
    : 0;
  const paidOutAmount = wallet?.paidOutAmount || 0;

  return (
    <section className="gm-panel gm-live-panel" aria-busy={busy}>
      <div
        className="gm-panel-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <span className="gm-eyebrow">TÀI CHÍNH & KÝ QUỸ</span>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>
            Ví doanh nghiệp · Đối soát & Giải ngân VietQR
          </h2>
          <p className="gm-live-muted" style={{ maxWidth: 760 }}>
            Cơ chế bảo vệ người dùng và đối tác (Anti-fraud Escrow): Toàn bộ tiền cọc thành viên quét mã VietQR được hệ thống tạm giữ an toàn.
            Doanh nghiệp được giải ngân 90% khoản cọc về tài khoản ngân hàng sau khi hoạt động hoàn tất.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <PillButton
            type="button"
            onClick={() => {
              setShowBankForm((v) => !v);
              setShowPayoutForm(false);
            }}
          >
            <Icon name="wallet" size={14} />{' '}
            {wallet?.bankAccount ? 'Đổi TK nhận tiền' : 'Cài đặt TK nhận tiền'}
          </PillButton>

          <PillButton
            type="button"
            onClick={() => {
              setShowPayoutForm((v) => !v);
              setShowBankForm(false);
            }}
          >
            <Icon name="check" size={14} /> Yêu cầu giải ngân ({money(withdrawableAmount)})
          </PillButton>

          <PillButton type="button" onClick={handleExportCsv}>
            Xuất sao kê CSV
          </PillButton>

          <PillButton type="button" disabled={busy} onClick={() => void load()}>
            <Icon name="activity" size={14} /> {busy ? 'Đang cập nhật…' : 'Làm mới'}
          </PillButton>
        </div>
      </div>

      {error && (
        <p role="alert" className="gm-form-error">
          {error}
        </p>
      )}
      {notice && (
        <div
          role="status"
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      {wallet && (
        <>
          {/* 4 Key Metric Cards */}
          <div
            className="gm-metric-grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              margin: '14px 0',
            }}
          >
            <MetricCard
              label="Tổng cọc đã ghi nhận"
              value={money(wallet.recordedAmount)}
              helper={`${totalMembers} lượt cọc thành công`}
              icon="wallet"
              tone="blue"
            />
            <MetricCard
              label="Đang tạm giữ Escrow"
              value={money(wallet.escrowHeldAmount)}
              helper="Chờ sự kiện hoàn tất & điểm danh"
              icon="shield"
              tone="orange"
            />
            <MetricCard
              label="Khả dụng giải ngân (90%)"
              value={money(withdrawableAmount)}
              helper={
                paidOutAmount > 0
                  ? `Đã rút: ${money(paidOutAmount)} · Tổng đủ ĐK: ${money(wallet.eligiblePayoutAmount)}`
                  : 'Sau khi trừ 10% phí sàn GoMate'
              }
              icon="check"
              tone="mint"
            />
            <MetricCard
              label="Khóa bảo vệ hoàn trả khách"
              value={money(wallet.refundableAmount)}
              helper="Sự kiện bị hủy hoặc quá hạn"
              icon="activity"
              tone="purple"
            />
          </div>

          {/* Bank Account Settings Drawer */}
          {showBankForm && (
            <form
              onSubmit={handleSaveBankAccount}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 16, color: '#0F172A' }}>
                  Cài đặt Tài khoản Ngân hàng Thụ hưởng của Doanh nghiệp
                </strong>
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  Đóng ✕
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <span>Ngân hàng thụ hưởng</span>
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1' }}
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <span>Số tài khoản</span>
                  <input
                    type="text"
                    required
                    placeholder="VD: 8876191441"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <span>Tên chủ tài khoản (in hoa)</span>
                  <input
                    type="text"
                    required
                    placeholder="VD: CONG TY TNHH GOMATE"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <span>Chi nhánh (tùy chọn)</span>
                  <input
                    type="text"
                    placeholder="VD: CN TP.HCM"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <PillButton type="submit" disabled={savingBank}>
                  {savingBank ? 'Đang lưu…' : 'Lưu tài khoản thụ hưởng'}
                </PillButton>
              </div>
            </form>
          )}

          {/* Payout Request Drawer */}
          {showPayoutForm && (
            <form
              onSubmit={handleRequestPayout}
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 16, color: '#065F46' }}>
                  Tạo lệnh Yêu cầu Giải ngân Doanh thu (90% sau sự kiện hoàn tất)
                </strong>
                <button
                  type="button"
                  onClick={() => setShowPayoutForm(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#065F46' }}
                >
                  Đóng ✕
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#064E3B' }}>
                  <span>Số tiền rút (Tối đa: {money(withdrawableAmount)})</span>
                  <input
                    type="number"
                    min="1000"
                    max={withdrawableAmount || undefined}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #86EFAC' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#064E3B' }}>
                  <span>Ngân hàng nhận</span>
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #86EFAC' }}
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#064E3B' }}>
                  <span>Số tài khoản nhận</span>
                  <input
                    type="text"
                    required
                    placeholder="Nhập STK doanh nghiệp"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #86EFAC' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#064E3B' }}>
                  <span>Chủ tài khoản</span>
                  <input
                    type="text"
                    required
                    placeholder="Tên chủ tài khoản"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #86EFAC' }}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#064E3B' }}>
                <span>Nội dung đối soát giải ngân</span>
                <input
                  type="text"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #86EFAC' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#047857' }}>
                  {withdrawableAmount <= 0
                    ? 'Lưu ý: Cần ít nhất 1 sự kiện có cọc ở trạng thái "Đã hoàn thành (completed)" để rút tiền.'
                    : `Khoản giải ngân ${money(Number(payoutAmount) || 0)} sẽ được chuyển 24/7 qua NAPAS.`}
                </span>
                <PillButton type="submit" disabled={requestingPayout || withdrawableAmount <= 0}>
                  {requestingPayout ? 'Đang giải ngân…' : 'Xác nhận rút tiền về ngân hàng'}
                </PillButton>
              </div>
            </form>
          )}

          {/* Bank Gateway & Business Payout Account Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4F46E5',
                  fontWeight: 800,
                }}
              >
                QR
              </div>
              <div>
                <strong style={{ fontSize: 14, color: '#0F172A', display: 'block' }}>
                  Cổng thu hộ tự động: Ngân hàng BIDV (VietQR NAPAS 247) · STK: 8876191441 (NGUYEN NGOC TIN)
                </strong>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  {wallet.bankAccount ? (
                    <>
                      TK nhận giải ngân của Doanh nghiệp:{' '}
                      <strong>
                        {wallet.bankAccount.bankId} · {wallet.bankAccount.accountNo} ({wallet.bankAccount.accountName})
                      </strong>
                    </>
                  ) : (
                    <>Chưa cài đặt tài khoản nhận giải ngân riêng của doanh nghiệp (Bấm &quot;Cài đặt TK nhận tiền&quot; ở trên)</>
                  )}
                </span>
              </div>
            </div>
            <StatusPill tone="green">Đang kết nối tự động</StatusPill>
          </div>

          {/* Breakdown Table */}
          <div className="gm-table-wrap" style={{ marginTop: 20 }}>
            <table className="gm-table">
              <caption>Bảng đối soát chi tiết từng nhóm hoạt động</caption>
              <thead>
                <tr>
                  <th>Nhóm sự kiện</th>
                  <th>Trạng thái bảo đảm</th>
                  <th>Đã cọc / Có mặt</th>
                  <th>Tổng cọc thu được</th>
                  <th>Phí sàn ({wallet.estimatedFeeBps / 100}%)</th>
                  <th>Thực nhận dự kiến (90%)</th>
                </tr>
              </thead>
              <tbody>
                {wallet.groups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <strong>{group.name}</strong>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Mã nhóm: {group.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td>
                      <StatusPill tone={escrowTone(group.escrowStatus)}>
                        {escrowText(group.escrowStatus)}
                      </StatusPill>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{group.recordedMembers} người</span>
                      <span style={{ color: '#64748B', fontSize: 12 }}>
                        {' '}
                        ({group.attendedMembers ?? 0} có mặt)
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{money(group.recordedAmount)}</td>
                    <td style={{ color: '#94A3B8' }}>{money(group.estimatedFee)}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>{money(group.estimatedNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!wallet.groups.length && (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <p>Chưa có nhóm sự kiện nào phát sinh tiền cọc.</p>
            </div>
          )}

          {/* Payout History Table */}
          {wallet.payouts?.length > 0 && (
            <div className="gm-table-wrap" style={{ marginTop: 24 }}>
              <table className="gm-table">
                <caption>Lịch sử giải ngân về tài khoản ngân hàng doanh nghiệp</caption>
                <thead>
                  <tr>
                    <th>Mã giải ngân</th>
                    <th>Thời gian</th>
                    <th>Tài khoản thụ hưởng</th>
                    <th>Nội dung</th>
                    <th>Số tiền thực nhận</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.payouts.map((po) => (
                    <tr key={po.id}>
                      <td>
                        <strong>{po.referenceCode}</strong>
                      </td>
                      <td>
                        {new Date(po.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <strong>{po.bankAccount?.bankId}</strong> · {po.bankAccount?.accountNo}
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          {po.bankAccount?.accountName}
                        </div>
                      </td>
                      <td>{po.note}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{money(po.amount)}</td>
                      <td>
                        <StatusPill tone="green">Đã chuyển khoản</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Escrow Process Flow */}
          <div style={{ marginTop: 24, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
              Quy trình giải ngân bảo đảm 4 bước của GoMate:
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                fontSize: 12,
                color: '#64748B',
              }}
            >
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>
                  1. Khách quét VietQR
                </strong>
                Thành viên quét mã nộp cọc. Tiền cọc được khóa an toàn trong quỹ Escrow.
              </div>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>
                  2. Tổ chức & Điểm danh
                </strong>
                Host bắt đầu hoạt động và tiến hành điểm danh người tham gia có mặt.
              </div>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>
                  3. Kết thúc sự kiện
                </strong>
                Khi sự kiện kết thúc thành công, 90% tiền cọc tự động chuyển sang &quot;Đủ điều kiện giải ngân&quot;.
              </div>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>
                  4. Giải ngân về tài khoản
                </strong>
                Doanh nghiệp bấm &quot;Yêu cầu giải ngân&quot; để rút 90% doanh thu cọc trực tiếp về ngân hàng thụ hưởng.
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
