import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, shadows } from '../theme';
import { getPaymentHistory, refundPayment, type Payment } from '../services/paymentService';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';

type Props = {
  onBack: () => void;
};

const POPULAR_BANKS = ['BIDV', 'VCB', 'MB', 'TCB', 'ACB', 'VPB', 'CTG', 'TPB'];

export function UserWalletScreen({ onBack }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'refundable' | 'refunded'>('all');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100000);

  // Refund / Withdraw Modal state
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [bankId, setBankId] = useState('BIDV');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [refundReason, setRefundReason] = useState('Hoàn trả tiền cọc về tài khoản cá nhân');
  const [refunding, setRefunding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPaymentHistory(1, 50).catch(() => ({
        items: [],
        total: 0,
      }));
      setPayments(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  const totalDeposited = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const refundableItems = payments.filter((p) => p.refundEligible);
  const refundableTotal = refundableItems.reduce((sum, p) => sum + (p.amount || 0), 0);

  const refundedTotal = payments
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const filteredPayments = payments.filter((p) => {
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'refundable') return Boolean(p.refundEligible);
    if (filter === 'refunded') return p.status === 'refunded';
    return true;
  });

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;
    if (!accountNo.trim() || !accountName.trim()) {
      setFeedback({
        type: 'error',
        text: 'Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản nhận tiền hoàn.',
      });
      return;
    }

    setRefunding(true);
    setFeedback(null);
    try {
      await refundPayment(refundTarget.id, {
        bankId,
        accountNo: accountNo.trim(),
        accountName: accountName.trim().toUpperCase(),
        reason: refundReason.trim(),
      });
      setRefundTarget(null);
      setFeedback({
        type: 'success',
        text: `Đã hoàn ${refundTarget.amount.toLocaleString('vi-VN')}đ về tài khoản ${bankId} · ${accountNo.trim()} thành công!`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể xử lý yêu cầu hoàn tiền lúc này.',
      });
    } finally {
      setRefunding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Ví & Thanh toán VietQR" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main balance card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTopline}>
            <View style={styles.walletBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.walletBadgeText}>Bảo đảm cọc Escrow an toàn</Text>
            </View>
            <Ionicons name="wallet-outline" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>Tổng tiền cọc đang hiệu lực</Text>
            <Text style={styles.balanceValue}>
              {totalDeposited.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.subMetricsRow}>
            <View style={styles.subMetricBox}>
              <Text style={styles.subMetricLabel}>Có thể rút / hoàn cọc</Text>
              <Text style={styles.subMetricValue}>{refundableTotal.toLocaleString('vi-VN')} đ</Text>
            </View>
            <View style={styles.subMetricDivider} />
            <View style={styles.subMetricBox}>
              <Text style={styles.subMetricLabel}>Đã hoàn về ngân hàng</Text>
              <Text style={styles.subMetricValue}>{refundedTotal.toLocaleString('vi-VN')} đ</Text>
            </View>
          </View>

          <View style={styles.walletActions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                setTopupAmount(100000);
                setShowTopupModal(true);
              }}
            >
              <Ionicons name="qr-code-outline" size={18} color="#4F46E5" />
              <Text style={styles.actionBtnText}>Quét QR nạp cọc</Text>
            </Pressable>

            {refundableItems.length > 0 ? (
              <Pressable
                style={[styles.actionBtn, styles.actionBtnHighlight]}
                onPress={() => {
                  setFeedback(null);
                  setRefundTarget(refundableItems[0]);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#065F46" />
                <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Hoàn / Rút cọc</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, styles.actionBtnOutline]} onPress={loadData}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Làm mới</Text>
              </Pressable>
            )}
          </View>
        </View>

        {feedback && (
          <View
            style={[
              styles.feedbackBanner,
              feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
            ]}
          >
            <Ionicons
              name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={feedback.type === 'success' ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: feedback.type === 'success' ? '#065F46' : '#991B1B' },
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        )}

        {/* Bank Receiver Information */}
        <View style={styles.bankInfoBox}>
          <View style={styles.bankHeaderRow}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.bankTitle}>Tài khoản thụ hưởng thanh toán (VietQR Escrow)</Text>
          </View>
          <View style={styles.bankDetailItem}>
            <Text style={styles.bankLabel}>Ngân hàng</Text>
            <Text style={styles.bankValue}>BIDV (Ngân hàng TMCP Đầu tư và Phát triển VN)</Text>
          </View>
          <View style={styles.bankDetailItem}>
            <Text style={styles.bankLabel}>Số tài khoản</Text>
            <Text style={[styles.bankValue, styles.monoText]}>8876191441</Text>
          </View>
          <View style={styles.bankDetailItem}>
            <Text style={styles.bankLabel}>Chủ tài khoản</Text>
            <Text style={[styles.bankValue, { fontWeight: '700' }]}>NGUYEN NGOC TIN</Text>
          </View>
        </View>

        {/* Transaction History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount} đang chờ chuyển</Text>
              </View>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { key: 'all', label: `Tất cả (${payments.length})` },
              { key: 'paid', label: 'Đã cọc' },
              { key: 'refundable', label: `Có thể hoàn (${refundableItems.length})` },
              { key: 'refunded', label: 'Đã hoàn tiền' },
            ].map((tab) => {
              const active = filter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(tab.key as any)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
              <Text style={styles.emptyDesc}>
                Khi tham gia hoạt động nhóm hoặc thanh toán tiền cọc, lịch sử và trạng thái bảo vệ Escrow sẽ hiển thị tại đây.
              </Text>
            </View>
          ) : (
            filteredPayments.map((item) => (
              <View key={item.id} style={styles.txItemContainer}>
                <View style={styles.txRow}>
                  <View
                    style={[
                      styles.txIconWrap,
                      {
                        backgroundColor:
                          item.status === 'paid'
                            ? '#ECFDF5'
                            : item.status === 'refunded'
                            ? '#EEF2FF'
                            : item.status === 'cancelled'
                            ? '#FEF2F2'
                            : '#FFFBEB',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.status === 'paid'
                          ? 'checkmark-circle'
                          : item.status === 'refunded'
                          ? 'arrow-undo-circle'
                          : item.status === 'cancelled'
                          ? 'close-circle'
                          : 'time'
                      }
                      size={22}
                      color={
                        item.status === 'paid'
                          ? '#10B981'
                          : item.status === 'refunded'
                          ? '#4F46E5'
                          : item.status === 'cancelled'
                          ? '#EF4444'
                          : '#F59E0B'
                      }
                    />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.txTitle}>
                      {item.activityTitle ||
                        (item.type === 'activity_deposit'
                          ? 'Tiền cọc hoạt động'
                          : 'Nạp cọc ví GoMate')}
                    </Text>
                    <Text style={styles.txDate}>
                      Mã: {item.orderCode} ·{' '}
                      {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.refundInfo?.refundCode && (
                      <Text style={styles.refundMeta}>
                        Mã hoàn: {item.refundInfo.refundCode} · {item.refundInfo.bankId}{' '}
                        {item.refundInfo.accountNo}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={styles.txAmount}>
                      {item.status === 'refunded' ? '↺ ' : '+'}
                      {item.amount.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text
                      style={[
                        styles.txStatus,
                        {
                          color:
                            item.status === 'paid'
                              ? '#10B981'
                              : item.status === 'refunded'
                              ? '#4F46E5'
                              : item.status === 'cancelled'
                              ? '#EF4444'
                              : '#F59E0B',
                        },
                      ]}
                    >
                      {item.status === 'paid'
                        ? 'Đã thanh toán'
                        : item.status === 'refunded'
                        ? 'Đã hoàn tiền'
                        : item.status === 'cancelled'
                        ? 'Đã hủy'
                        : 'Chờ thanh toán'}
                    </Text>
                  </View>
                </View>

                {item.refundEligible && (
                  <View style={styles.txActionFooter}>
                    <Text style={styles.txRefundHint}>
                      {item.activityStatus === 'cancelled' || item.activityStatus === 'expired'
                        ? 'Sự kiện đã hủy/hết hạn · Được bảo vệ hoàn cọc 100%'
                        : 'Khoản cọc đang trong thời hạn cho phép hoàn rút'}
                    </Text>
                    <Pressable
                      style={styles.refundSmallBtn}
                      onPress={() => {
                        setFeedback(null);
                        setRefundTarget(item);
                      }}
                    >
                      <Ionicons name="arrow-undo-outline" size={14} color="#4F46E5" />
                      <Text style={styles.refundSmallBtnText}>Yêu cầu hoàn tiền</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Refund / Withdraw to Bank Modal */}
      <Modal
        visible={Boolean(refundTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hoàn / Rút tiền cọc về ngân hàng</Text>
              <Pressable onPress={() => setRefundTarget(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {refundTarget && (
              <View style={styles.refundSummaryBox}>
                <Text style={styles.refundSummaryLabel}>
                  Giao dịch: {refundTarget.activityTitle || refundTarget.orderCode}
                </Text>
                <Text style={styles.refundSummaryAmount}>
                  Số tiền hoàn: {refundTarget.amount.toLocaleString('vi-VN')} đ (100%)
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Chọn ngân hàng nhận tiền</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankChipRow}
            >
              {POPULAR_BANKS.map((b) => (
                <Pressable
                  key={b}
                  style={[styles.bankChip, bankId === b && styles.bankChipActive]}
                  onPress={() => setBankId(b)}
                >
                  <Text style={[styles.bankChipText, bankId === b && styles.bankChipTextActive]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Số tài khoản nhận tiền</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số tài khoản ngân hàng của bạn"
              keyboardType="numeric"
              value={accountNo}
              onChangeText={setAccountNo}
            />

            <Text style={styles.inputLabel}>Tên chủ tài khoản (in hoa không dấu)</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: NGUYEN VAN A"
              autoCapitalize="characters"
              value={accountName}
              onChangeText={setAccountName}
            />

            <Text style={styles.inputLabel}>Ghi chú / Lý do hoàn tiền</Text>
            <TextInput
              style={styles.input}
              placeholder="Lý do hoàn tiền..."
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setRefundTarget(null)}
              >
                <Text style={styles.modalBtnCancelText}>Đóng</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                disabled={refunding}
                onPress={() => void handleConfirmRefund()}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {refunding ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Topup / Deposit Modal */}
      <VietQrPaymentModal
        visible={showTopupModal}
        amount={topupAmount}
        type="wallet_topup"
        activityTitle="Nạp tiền / Tiền cọc ví GoMate"
        onClose={() => setShowTopupModal(false)}
        onSuccess={() => {
          setShowTopupModal(false);
          void loadData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 18,
    gap: 18,
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 22,
    gap: 14,
    ...shadows.card,
  },
  walletTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  walletBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceWrap: {
    gap: 4,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  subMetricBox: {
    flex: 1,
    gap: 2,
  },
  subMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  subMetricLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
  },
  subMetricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnHighlight: {
    backgroundColor: '#A7F3D0',
  },
  actionBtnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  bankInfoBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bankDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bankValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  monoText: {
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  historySection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#4F46E5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  txItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  txDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  refundMeta: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  txActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  txRefundHint: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
  },
  refundSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refundSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  refundSummaryBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 2,
  },
  refundSummaryLabel: {
    fontSize: 12,
    color: '#166534',
  },
  refundSummaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  bankChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  bankChipTextActive: {
    color: '#4F46E5',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#F8FAFC',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    fontWeight: '700',
    color: '#475569',
  },
  modalBtnConfirm: {
    backgroundColor: '#4F46E5',
  },
  modalBtnConfirmText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
