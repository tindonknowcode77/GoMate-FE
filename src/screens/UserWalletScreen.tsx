import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';
import { BankPicker } from '../components/BankPicker';
import { findBank } from '../constants/banks';
import { confirmParticipation, getPaymentHistory, refundPayment, saveRefundBank, type BankAccount, type Payment, type PaymentHistoryResponse } from '../services/paymentService';
import { colors, layout } from '../theme';

const money = (value = 0) => value.toLocaleString('vi-VN') + ' đ';
const refundLabels: Record<string, string> = { pending: 'Chờ duyệt hoàn tiền', approved: 'Đã duyệt, chờ chuyển tiền', completed: 'Đã ghi nhận chuyển tiền hoàn', rejected: 'Yêu cầu bị từ chối' };
const emptyBank: BankAccount = { bankId: 'BIDV', accountNo: '', accountName: '' };

export function UserWalletScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Payment[]>([]), [summary, setSummary] = useState<PaymentHistoryResponse['summary']>();
  const [bank, setBank] = useState<BankAccount | null>(null), [bankForm, setBankForm] = useState<BankAccount>(emptyBank), [editingBank, setEditingBank] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'refunds' | 'paid'>('all');
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [target, setTarget] = useState<{ payment: Payment; kind: 'refund' | 'disputed' } | null>(null), [reason, setReason] = useState('');
  const [qrTarget, setQrTarget] = useState<Payment | null>(null);
  const page = useRef(0), generation = useRef(0), lock = useRef(false);
  const load = useCallback(async (reset = true) => {
    const request = ++generation.current, next = reset ? 1 : page.current + 1; setLoading(true);
    try {
      const response = await getPaymentHistory(next, 20);
      if (request !== generation.current) return;
      setItems(current => reset ? response.items : [...current, ...response.items.filter(item => !current.some(existing => existing.id === item.id))]);
      setSummary(response.summary); setHasMore(Boolean(response.hasMore)); page.current = next;
      setBank(response.bankAccount || null); if (response.bankAccount) { const { bankId, accountNo, accountName, branch } = response.bankAccount; setBankForm({ bankId, accountNo, accountName, ...(branch ? { branch } : {}) }); }
    } catch (error) { if (request === generation.current) setFeedback({ error: true, message: error instanceof Error ? error.message : 'Chưa tải được ví. Hãy thử lại.' }); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    if (lock.current) return; lock.current = true; setBusy(true); setFeedback(null);
    try { await action(); setTarget(null); setEditingBank(false); setFeedback({ error: false, message }); await load(); }
    catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : 'Không xử lý được yêu cầu.' }); }
    finally { lock.current = false; setBusy(false); }
  };
  const openRefund = (payment: Payment) => {
    if (!bank) { setEditingBank(true); setFeedback({ error: true, message: 'Lưu tài khoản nhận hoàn tiền trước.' }); return; }
    setReason(''); setTarget({ payment, kind: 'refund' }); setFeedback(null);
  };
  const visible = items.filter(item => filter === 'all' || filter === 'refunds' && Boolean(item.refundRequest) || filter === 'paid' && item.status === 'paid');
  return <SafeAreaView style={styles.safe}>
    <ScreenHeader title="Ví & tiền cọc" onBack={onBack} />
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
      <View style={styles.balance}><Text style={styles.balanceLabel}>Cọc đang giữ / xử lý</Text><Text style={styles.balanceValue}>{summary ? money(summary.totalPaid) : '—'}</Text><Text style={styles.balanceLabel}>Đã hoàn về ngân hàng: {summary ? money(summary.refundedAmount) : '—'}</Text></View>
      {feedback && <Text accessibilityRole="alert" style={{ color: feedback.error ? colors.danger : colors.success }}>{feedback.message}</Text>}
      <View style={styles.card}><View style={styles.row}><Text style={styles.title}>Ngân hàng nhận hoàn tiền</Text><Action label={editingBank ? 'Đóng' : bank ? 'Thay đổi' : 'Thêm ngân hàng'} disabled={busy} onPress={() => setEditingBank(value => !value)} /></View>
        {bank && !editingBank && (() => {
          const bankInfo = findBank(bank.bankId);
          return (
            <View style={styles.bankDisplay}>
              {bankInfo ? (
                <Image source={bankInfo.logo} style={styles.bankDisplayLogo} resizeMode="contain" />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.bankName}>{bankInfo ? `${bankInfo.shortName} (${bank.bankId})` : bank.bankId} · {bank.accountNo}</Text>
                <Text style={styles.accountName}>{bank.accountName}</Text>
              </View>
            </View>
          );
        })()}
        {!bank && !editingBank && <Text style={styles.muted}>Chưa có tài khoản nhận tiền.</Text>}
        {editingBank && <>
          <Text style={styles.label}>Ngân hàng thụ hưởng</Text>
          <BankPicker
            value={bankForm.bankId}
            disabled={busy}
            onChange={selected => setBankForm(current => ({ ...current, bankId: selected.code }))}
          />
          <Text style={styles.label}>Số tài khoản</Text>
          <TextInput accessibilityLabel="Số tài khoản nhận hoàn" placeholder="Số tài khoản ngân hàng" keyboardType="number-pad" maxLength={25} style={styles.input} value={bankForm.accountNo} onChangeText={accountNo => setBankForm(current => ({ ...current, accountNo: accountNo.trim() }))} />
          <Text style={styles.label}>Tên chủ tài khoản</Text>
          <TextInput accessibilityLabel="Chủ tài khoản nhận hoàn" placeholder="Tên chủ tài khoản (không dấu)" maxLength={120} style={styles.input} value={bankForm.accountName} onChangeText={accountName => setBankForm(current => ({ ...current, accountName: accountName.toUpperCase() }))} />
          <Action primary label="Lưu ngân hàng" disabled={busy || !bankForm.bankId || !bankForm.accountNo.trim() || !bankForm.accountName.trim()} onPress={() => void run(async () => { const result = await saveRefundBank(bankForm); setBank(result.bankAccount); }, 'Đã lưu tài khoản nhận hoàn tiền.')} />
        </>}
      </View>
      <View style={styles.row}>{[['all', 'Tất cả'], ['paid', 'Đã nhận cọc'], ['refunds', 'Yêu cầu hoàn']].map(([key, label]) => <Pressable key={key} accessibilityRole="button" style={[styles.chip, filter === key && styles.chipActive]} onPress={() => setFilter(key as typeof filter)}><Text>{label}</Text></Pressable>)}<Action label="Làm mới ví" disabled={loading} onPress={() => void load()} /></View>
      {loading && !items.length && <ActivityIndicator color={colors.primary} />}
      {!loading && !visible.length && <Text style={styles.muted}>Chưa có giao dịch.</Text>}
      {visible.map(payment => <View key={payment.id} style={styles.card}>
        <View style={styles.row}><Text style={[styles.title, { flex: 1 }]}>{payment.activityTitle || payment.orderCode}</Text><Text style={styles.title}>{money(payment.receivedAmount ?? payment.amount)}</Text></View>
        <Text style={styles.muted}>{payment.orderCode} · {new Date(payment.createdAt).toLocaleDateString('vi-VN')}</Text>
        <Text style={{ color: payment.status === 'paid' && payment.verification ? colors.success : colors.primary }}>{payment.refundRequest ? refundLabels[payment.refundRequest.status] : payment.financeState === 'settled' ? 'Đã giải ngân cho doanh nghiệp' : payment.status === 'paid' ? payment.verification ? 'Tiền vào đã đối soát' : 'Cần đối soát tiền vào' : payment.status === 'refunded' ? 'Đã hoàn tiền' : payment.status === 'pending' ? 'Chờ đối soát thanh toán' : 'Giao dịch không còn hiệu lực'}</Text>
        {payment.refundRequest && <><Text style={styles.muted}>{payment.refundRequest.bankAccount.bankId} · {payment.refundRequest.bankAccount.accountNo}</Text>{payment.refundRequest.reviewNote && <Text>{payment.refundRequest.reviewNote}</Text>}{payment.refundRequest.transferRef && <Text>Mã chuyển tiền: {payment.refundRequest.transferRef}</Text>}</>}
        {payment.refundEligible && <View style={styles.row}><Text style={[styles.muted, { flex: 1 }]}>{payment.refundPolicy === 'full_refund' ? 'Hoàn đủ theo chính sách' : 'Hủy sát giờ / vắng mặt: admin xem xét'}</Text><Action label="Yêu cầu hoàn cọc" disabled={busy} onPress={() => openRefund(payment)} /></View>}
        {payment.canConfirmAttendance && <View style={styles.row}><Action label={payment.participantConfirmation?.status === 'attended' ? 'Đã xác nhận tham gia' : 'Xác nhận đã tham gia'} disabled={busy || payment.participantConfirmation?.status === 'attended'} onPress={() => void run(() => confirmParticipation(payment.id, 'attended'), 'Đã xác nhận tham gia hoạt động.')} /><Action label="Báo sự cố" disabled={busy} onPress={() => { setReason(''); setTarget({ payment, kind: 'disputed' }); }} /></View>}
        {payment.financeState === 'disputed' && <Text style={{ color: colors.danger }}>Khiếu nại đang được xử lý, cọc đang tạm giữ.</Text>}
        {payment.status === 'pending' && payment.activityId && <Action label="Mở mã thanh toán" disabled={busy} onPress={() => setQrTarget(payment)} />}
      </View>)}
      {hasMore && <Action label="Xem thêm giao dịch" disabled={loading} onPress={() => void load(false)} />}
    </ScrollView>
    <Modal visible={Boolean(target)} transparent animationType="fade" onRequestClose={() => { if (!busy) setTarget(null); }}><View style={styles.overlay}><View style={styles.modal}>
      <Text style={styles.title}>{target?.kind === 'refund' ? 'Yêu cầu hoàn cọc' : 'Báo sự cố hoạt động'}</Text>
      <Text>{target?.payment.activityTitle}</Text>
      {target?.kind === 'refund' && <><Text style={styles.amount}>{money(target.payment.refundAmount)}</Text><Text>{bank?.bankId} · {bank?.accountNo} · {bank?.accountName}</Text><Text style={styles.muted}>Admin duyệt và đối soát trước khi chuyển tiền. Gửi yêu cầu trước giờ bắt đầu sẽ hủy chỗ tham gia.</Text></>}
      <TextInput accessibilityLabel="Lý do yêu cầu" placeholder="Lý do / nội dung sự cố (ít nhất 5 ký tự)" style={[styles.input, { minHeight: 90 }]} multiline maxLength={500} value={reason} onChangeText={setReason} />
      {feedback?.error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{feedback.message}</Text>}
      <View style={styles.row}><Action label="Đóng" disabled={busy} onPress={() => setTarget(null)} /><Action primary label={busy ? 'Đang gửi…' : 'Gửi yêu cầu'} disabled={busy || reason.trim().length < 5} onPress={() => {
        if (!target) return;
        void run(() => target.kind === 'refund' ? refundPayment(target.payment.id, { reason }) : confirmParticipation(target.payment.id, 'disputed', reason), 'Đã gửi yêu cầu, đang chờ admin xử lý.');
      }} /></View>
    </View></View></Modal>
    <VietQrPaymentModal visible={Boolean(qrTarget)} activityId={qrTarget?.activityId} activityTitle={qrTarget?.activityTitle} onClose={() => setQrTarget(null)} onSuccess={() => { setQrTarget(null); void load(); }} />
  </SafeAreaView>;
}
function Action({ label, onPress, disabled = false, primary = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, primary && styles.primary, disabled && { opacity: 0.5 }]}><Text style={{ color: primary ? '#fff' : colors.primary, fontWeight: '600' }}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, page: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', padding: 18, gap: 16, paddingBottom: 40 },
  balance: { borderRadius: 20, padding: 22, backgroundColor: '#6546a5', gap: 8 }, balanceLabel: { color: '#eae2ff' }, balanceValue: { color: '#fff', fontSize: 30, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 16, color: colors.text, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, backgroundColor: colors.surface },
  button: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, primary: { backgroundColor: colors.primary, borderColor: colors.primary }, chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,.5)' }, modal: { width: '100%', maxWidth: 480, padding: 22, borderRadius: 20, backgroundColor: colors.surface, gap: 14 }, amount: { color: colors.primary, fontWeight: '800', fontSize: 26 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 },
  bankDisplay: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  bankDisplayLogo: { width: 54, height: 30 },
  bankName: { fontSize: 15, fontWeight: '700', color: colors.text },
  accountName: { fontSize: 13, color: colors.textMuted },
});
