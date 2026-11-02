import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { usePortalNotice } from './PortalNotifications';
import { portalActionError } from './portalActionError';
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

export default function BusinessWallet() {
  const notify = usePortalNotice();
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setWallet(await api('/portal/wallet'));
      notify('Đã cập nhật dữ liệu ví và đối soát tiền cọc.');
    } catch (reason) {
      const message = portalActionError('làm mới dữ liệu ví và đối soát tiền cọc', reason);
      setError(message);
      notify(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    void api('/portal/wallet')
      .then((data) => {
        if (alive) setWallet(data);
      })
      .catch((reason) => {
        if (alive) setError(reason.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const totalMembers = wallet ? wallet.groups.reduce((sum, g) => sum + g.recordedMembers, 0) : 0;

  return (
    <section className="gm-panel gm-live-panel" aria-busy={busy}>
      <div className="gm-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="gm-eyebrow">TÀI CHÍNH & KÝ QUỸ</span>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>Ví doanh nghiệp · Đối soát & Bảo đảm tiền cọc VietQR</h2>
          <p className="gm-live-muted" style={{ maxWidth: 760 }}>
            Cơ chế bảo vệ người dùng và đối tác (Anti-fraud Escrow): Toàn bộ tiền cọc thành viên quét mã VietQR được hệ thống tạm giữ an toàn. 
            Doanh nghiệp sẽ được giải ngân 90% khoản cọc sau khi hoạt động diễn ra, Host điểm danh thành viên đầy đủ và kết thúc hợp lệ.
          </p>
        </div>
        <PillButton type="button" disabled={busy} onClick={() => void load()}>
          <Icon name="activity" size={14} /> {busy ? 'Đang cập nhật…' : 'Làm mới đối soát'}
        </PillButton>
      </div>

      {error && <p role="alert" className="gm-form-error">{error}</p>}

      {wallet && (
        <>
          {/* 4 Key Metric Cards */}
          <div className="gm-metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '14px 0' }}>
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
              label="Đủ điều kiện giải ngân (90%)"
              value={money(wallet.eligiblePayoutAmount)}
              helper="Sau khi trừ 10% phí sàn GoMate"
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

          {/* Bank Gateway Connection Info */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', fontWeight: 800 }}>
                QR
              </div>
              <div>
                <strong style={{ fontSize: 14, color: '#0F172A', display: 'block' }}>Cổng thu hộ tự động: Ngân hàng BIDV (VietQR NAPAS 247)</strong>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  STK: <strong>8876191441</strong> · Chủ tài khoản: <strong>NGUYEN NGOC TIN</strong> · Cú pháp nhận diện: <strong>GMxxxxxx</strong>
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
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Mã nhóm: {group.id.slice(0, 8)}...</div>
                    </td>
                    <td>
                      <StatusPill tone={escrowTone(group.escrowStatus)}>
                        {escrowText(group.escrowStatus)}
                      </StatusPill>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{group.recordedMembers} người</span>
                      <span style={{ color: '#64748B', fontSize: 12 }}> ({group.attendedMembers ?? 0} có mặt)</span>
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

          {/* Escrow Process Flow */}
          <div style={{ marginTop: 24, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
              Quy trình giải ngân bảo đảm 4 bước của GoMate:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12, color: '#64748B' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>1. Khách quét VietQR</strong>
                Thành viên quét mã nộp cọc. Tiền cọc được khóa an toàn trong quỹ Escrow.
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>2. Tổ chức & Điểm danh</strong>
                Host bắt đầu hoạt động và tiến hành điểm danh người tham gia có mặt.
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>3. Kết thúc sự kiện</strong>
                Khi sự kiện kết thúc thành công, 90% tiền cọc tự động chuyển sang &quot;Đủ điều kiện giải ngân&quot;.
              </div>
              <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 4 }}>4. Quyết toán về tài khoản</strong>
                GoMate định kỳ đối soát và chuyển khoản phần thực nhận về tài khoản ngân hàng doanh nghiệp.
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
