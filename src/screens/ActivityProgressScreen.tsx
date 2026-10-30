import { useFeedbackState } from '../services/feedback';
import { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { FormField } from '../components/FormField';
import { RemoteState } from '../components/RemoteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Activity } from '../data/activities';
import { AttendanceRoster, attendanceLabels } from '../components/AttendanceRoster';
import { getSession } from '../services/api';
import { addActivityUpdate, Attendance, getActivity, listAttendance, listUpdates, markAttendance, toActivity, transitionActivity } from '../services/activityApi';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';

export function ActivityProgressScreen({ activity, onBack, onEnd }: { activity: Activity; onBack: () => void; onEnd: (activity: Activity) => void }) {
  const loader = useCallback(async () => { const [current, attendance, updates] = await Promise.all([getActivity(activity.id), listAttendance(activity.id), listUpdates(activity.id)]); return { current, attendance, updates }; }, [activity.id]);
  const remote = useRemote(loader, null);
  const [error, setError] = useFeedbackState('');
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [note, setNote] = useState('');
  const lock = useRef(false);
  const isHost = remote.data?.current.hostId === getSession()?.user.id || Boolean(remote.data?.current.isBusinessManager);
  const isRunning = remote.data?.current.status === 'in-progress';
  const canChange = isHost && ['published', 'in-progress'].includes(remote.data?.current.status || '');
  const canCorrect = isHost && remote.data?.current.status === 'completed' && Boolean(remote.data?.current.autoCompletedAt && Date.now() - new Date(remote.data.current.autoCompletedAt).getTime() < 86400000);
  const canPostUpdate = isHost && ['published', 'in-progress'].includes(remote.data?.current.status || '');
  const noteAttempt = useRef<{ text: string; id: string } | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được thay đổi'); }
    finally { lock.current = false; setBusy(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader onBack={onBack} title={remote.data?.current.status === 'completed' ? 'Đã kết thúc' : 'Đang diễn ra'} subtitle={activity.title} />
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
      <RemoteState {...remote} onRetry={remote.reload} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {remote.data && !remote.error && <>
        {isHost && isRunning && <View style={styles.card}><Text style={styles.title}>Điểm danh & kết thúc hoạt động</Text><Text>Cập nhật điểm danh thành viên. Khi kết thúc, thành viên chưa đánh dấu vắng mặt sẽ mặc định được ghi nhận Có mặt để mở đánh giá.</Text><ActionButton disabled={busy} label="Kết thúc hoạt động" onPress={() => setConfirmEnd(true)} /></View>}
        {isHost && isRunning && confirmEnd && <View style={styles.card}><Text>Xác nhận kết thúc hoạt động? Các thành viên tham gia sẽ có thể gửi đánh giá ngay sau khi kết thúc.</Text>{remote.data.attendance.some(item => item.status === 'unmarked') && <Text style={{ color: colors.textSecondary }}>Còn {remote.data.attendance.filter(item => item.status === 'unmarked').length} thành viên chưa chọn trạng thái sẽ được mặc định là Có mặt.</Text>}<ActionButton disabled={busy} label="Tiếp tục hoạt động" onPress={() => setConfirmEnd(false)} /><ActionButton disabled={busy} label="Xác nhận kết thúc" onPress={() => void run(async () => { const row = await transitionActivity(activity.id, 'complete'); onEnd(toActivity(row)); })} /></View>}
        <AttendanceRoster people={remote.data.attendance} hostId={remote.data.current.hostId} editable={Boolean(canChange || canCorrect)} busy={busy} onMark={(userId, status) => void run(async () => { await markAttendance(activity.id, userId, status); await remote.reload(); })} />
        {canPostUpdate && <View style={styles.card}><FormField label="Cập nhật cho nhóm" multiline value={note} onChangeText={setNote} /><ActionButton disabled={busy} label="Đăng cập nhật" onPress={() => void run(async () => { const clean = note.trim(); if (!clean) throw new Error('Nhập nội dung cập nhật.'); if (noteAttempt.current?.text !== clean) noteAttempt.current = { text: clean, id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) }; await addActivityUpdate(activity.id, clean, noteAttempt.current.id); noteAttempt.current = null; setNote(''); await remote.reload(); })} /></View>}
        <Text style={styles.title}>Lịch sử hoạt động</Text>
        {remote.data.updates.map(update => <View key={update.id} style={styles.card}><Text>{update.text || (update.type === 'started' ? 'Đã bắt đầu hoạt động' : update.type === 'completed' ? 'Đã kết thúc hoạt động' : update.type === 'cancelled' ? 'Hoạt động đã bị hủy' : update.type === 'expired' ? 'Hoạt động đã hết hạn' : update.type === 'plan-updated' ? 'Host đã cập nhật kế hoạch' : update.type === 'activity-updated' ? 'Host đã cập nhật hoạt động' : update.type === 'schedule-confirmed' ? 'Host đã chốt lịch đi' : `Điểm danh: ${remote.data!.attendance.find(member => member.userId === update.userId)?.name || ''} · ${attendanceLabels[update.status as Attendance['status']] || ''}`)}</Text><Text>{new Date(update.createdAt).toLocaleString('vi-VN')}</Text></View>)}
        {remote.data.current.status === 'completed' && <ActionButton label="Xem tổng kết" onPress={() => onEnd(toActivity(remote.data!.current))} />}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.link}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, page: { alignSelf: 'center', maxWidth: layout.maxWidth, width: '100%', padding: 18, gap: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' }, link: { color: colors.primary, fontWeight: '600' },
});
