import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { colors, shadows } from '../theme';
import {
  confirmPayment,
  createQrPayment,
  getPaymentStatus,
  Payment,
} from '../services/paymentService';

type Props = {
  visible: boolean;
  activityId?: string;
  activityTitle?: string;
  amount?: number;
  type?: 'activity_deposit' | 'activity_fee' | 'plus_subscription' | 'wallet_topup';
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
};

export function VietQrPaymentModal({
  visible,
  activityId,
  activityTitle,
  amount,
  type = 'activity_deposit',
  onClose,
  onSuccess,
}: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);

  // Initialize payment when modal opens
  useEffect(() => {
    aliveRef.current = true;
    if (!visible) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      queueMicrotask(() => {
        if (!aliveRef.current) return;
        setPayment(null);
        setError('');
        setIsSuccess(false);
      });
      return;
    }

    queueMicrotask(() => {
      if (!aliveRef.current) return;
      setLoading(true);
      setError('');
    });
    createQrPayment({ type, activityId, amount })
      .then((res) => {
        if (!aliveRef.current) return;
        setPayment(res.payment);
        if (res.payment.status === 'paid') {
          setIsSuccess(true);
        }
      })
      .catch((err) => {
        if (!aliveRef.current) return;
        setError(err.message || 'Không thể tạo mã QR thanh toán.');
      })
      .finally(() => {
        if (aliveRef.current) setLoading(false);
      });

    return () => {
      aliveRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible, activityId, amount, type]);

  // Start polling payment status every 3s
  useEffect(() => {
    if (!visible || !payment || isSuccess || payment.status === 'paid') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await getPaymentStatus(payment.id);
        if (res.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsSuccess(true);
          onSuccess({ ...payment, status: 'paid', paidAt: res.paidAt });
        }
      } catch {
        // Silently retry on next tick
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible, payment, isSuccess, onSuccess]);

  const handleCopy = useCallback(async (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const handleManualConfirm = async () => {
    if (!payment || confirming) return;
    setConfirming(true);
    setError('');
    try {
      const res = await confirmPayment(payment.id);
      setIsSuccess(true);
      onSuccess(res.payment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác nhận thất bại.');
    } finally {
      setConfirming(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
              <Text style={styles.dialogTitle}>Thanh toán VietQR</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tạo mã VietQR thanh toán…</Text>
              </View>
            ) : error ? (
              <View style={styles.centerBox}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => {
                    setLoading(true);
                    setError('');
                    createQrPayment({ type, activityId, amount })
                      .then((res) => setPayment(res.payment))
                      .catch((err) => setError(err.message))
                      .finally(() => setLoading(false));
                  }}
                >
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : isSuccess ? (
              <View style={styles.successBox}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={68} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Thanh toán thành công!</Text>
                <Text style={styles.successMessage}>
                  Tiền cọc cho hoạt động{' '}
                  <Text style={{ fontWeight: '700' }}>{activityTitle || payment?.activityTitle}</Text> đã
                  được hệ thống ghi nhận an toàn.
                </Text>
                <Pressable style={styles.finishBtn} onPress={onClose}>
                  <Text style={styles.finishText}>Hoàn tất</Text>
                </Pressable>
              </View>
            ) : payment ? (
              <>
                {/* Amount pill */}
                <View style={styles.amountPill}>
                  <Text style={styles.amountLabel}>Số tiền cần thanh toán</Text>
                  <Text style={styles.amountValue}>
                    {payment.amount.toLocaleString('vi-VN')} đ
                  </Text>
                  {Boolean(activityTitle || payment.activityTitle) && (
                    <Text style={styles.activitySubtitle} numberOfLines={1}>
                      {activityTitle || payment.activityTitle}
                    </Text>
                  )}
                </View>

                {/* QR Code Frame */}
                <View style={styles.qrCard}>
                  <Image
                    source={{ uri: payment.qrImageUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <View style={styles.qrBadge}>
                    <Text style={styles.qrBadgeText}>Quét bằng mọi App Ngân hàng / Ví điện tử</Text>
                  </View>
                </View>

                {/* Bank transfer info card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngân hàng</Text>
                    <Text style={styles.infoValue}>
                      {payment.bank.bankId} (Ngân hàng TMCP Đầu tư & Phát triển VN)
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số tài khoản</Text>
                    <View style={styles.copyRow}>
                      <Text style={[styles.infoValue, styles.monoValue]}>
                        {payment.bank.accountNo}
                      </Text>
                      <Pressable
                        style={styles.copyBtn}
                        onPress={() => handleCopy('acc', payment.bank.accountNo)}
                      >
                        <Ionicons
                          name={copiedKey === 'acc' ? 'checkmark' : 'copy-outline'}
                          size={15}
                          color={copiedKey === 'acc' ? colors.success : colors.primary}
                        />
                        <Text style={styles.copyText}>
                          {copiedKey === 'acc' ? 'Đã sao chép' : 'Sao chép'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chủ tài khoản</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700' }]}>
                      {payment.bank.accountName}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nội dung chuyển khoản</Text>
                    <View style={styles.copyRow}>
                      <Text style={[styles.infoValue, styles.highlightMemo]}>
                        {payment.description}
                      </Text>
                      <Pressable
                        style={styles.copyBtn}
                        onPress={() => handleCopy('memo', payment.description)}
                      >
                        <Ionicons
                          name={copiedKey === 'memo' ? 'checkmark' : 'copy-outline'}
                          size={15}
                          color={copiedKey === 'memo' ? colors.success : colors.primary}
                        />
                        <Text style={styles.copyText}>
                          {copiedKey === 'memo' ? 'Đã sao chép' : 'Sao chép'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Polling indicator & manual confirmation */}
                <View style={styles.footerWrap}>
                  <View style={styles.statusLiveRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.statusLiveText}>
                      Hệ thống tự động kiểm tra thanh toán…
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.confirmBtn, confirming && { opacity: 0.7 }]}
                    disabled={confirming}
                    onPress={handleManualConfirm}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmBtnText}>Tôi đã chuyển khoản xong</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.card,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  amountPill: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E9E5FF',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  activitySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  qrBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qrBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  monoValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  highlightMemo: {
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  copyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footerWrap: {
    gap: 12,
    marginTop: 6,
  },
  statusLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusLiveText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 14,
  },
  successIconWrap: {
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  successMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  finishBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  finishText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
