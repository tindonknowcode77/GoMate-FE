import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, shadows } from '../theme';
import { api } from '../services/api';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';

type Props = {
  onBack: () => void;
};

type PaymentItem = {
  id: string;
  orderCode: string;
  type: string;
  activityTitle?: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  createdAt: string;
  paidAt?: string | null;
  bank?: {
    bankId: string;
    accountNo: string;
    accountName: string;
  };
};

export function UserWalletScreen({ onBack }: Props) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100000);

  const loadData = useCallback(async () => {
    try {
      const res = await api<{ items: PaymentItem[] }>('/payments/history').catch(() => ({
        items: [],
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

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

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
            <Text style={styles.balanceLabel}>Tổng tiền cọc đã ghi nhận</Text>
            <Text style={styles.balanceValue}>
              {totalDeposited.toLocaleString('vi-VN')} đ
            </Text>
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

            <Pressable style={[styles.actionBtn, styles.actionBtnOutline]} onPress={loadData}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Làm mới</Text>
            </Pressable>
          </View>
        </View>

        {/* Bank Receiver Information */}
        <View style={styles.bankInfoBox}>
          <View style={styles.bankHeaderRow}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={styles.bankTitle}>Tài khoản thụ hưởng thanh toán (VietQR)</Text>
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

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
          ) : payments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
              <Text style={styles.emptyDesc}>
                Khi tham gia hoạt động nhóm hoặc thanh toán tiền cọc, lịch sử và mã giao dịch VietQR sẽ hiển thị tại đây.
              </Text>
            </View>
          ) : (
            payments.map((item) => (
              <View key={item.id} style={styles.txRow}>
                <View
                  style={[
                    styles.txIconWrap,
                    {
                      backgroundColor:
                        item.status === 'paid'
                          ? '#ECFDF5'
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
                        : item.status === 'cancelled'
                        ? 'close-circle'
                        : 'time'
                    }
                    size={22}
                    color={
                      item.status === 'paid'
                        ? '#10B981'
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
                        : 'Thanh toán GoMate')}
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
                </View>

                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={styles.txAmount}>+{item.amount.toLocaleString('vi-VN')} đ</Text>
                  <Text
                    style={[
                      styles.txStatus,
                      {
                        color:
                          item.status === 'paid'
                            ? '#10B981'
                            : item.status === 'cancelled'
                            ? '#EF4444'
                            : '#F59E0B',
                      },
                    ]}
                  >
                    {item.status === 'paid'
                      ? 'Đã thanh toán'
                      : item.status === 'cancelled'
                      ? 'Đã hủy'
                      : 'Chờ thanh toán'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

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
    gap: 16,
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
  walletActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
  actionBtnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
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
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
});
