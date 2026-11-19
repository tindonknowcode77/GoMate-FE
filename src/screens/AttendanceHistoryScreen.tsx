import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { FormField } from '../components/FormField';
import { GradientButton } from '../components/GradientButton';
import { ReputationStats } from '../components/ReputationStats';
import { attendanceLabels } from '../components/AttendanceRoster';
import { AttendanceHistoryItem, listAttendanceHistory, listReports, submitAttendanceComplaint } from '../services/communityService';
import { getProfile } from '../services/profileService';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';

const load = async () => { const [items, reports, profile] = await Promise.all([listAttendanceHistory(), listReports(), getProfile()]); return { items, reports, reputation: profile.reputation }; };
export function AttendanceHistoryScreen({ onBack, activityId }: { onBack: () => void; activityId?: string }) {
  const remote = useRemote(load, null), [selected, setSelected] = useState<AttendanceHistoryItem | null>(null);
  const [kind, setKind] = useState<'attendance' | 'other'>('attendance'), [requested, setRequested] = useState<'present' | 'late'>('present');
  const [detail, setDetail] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), lock = useRef(false);
  const open = (item: AttendanceHistoryItem, type: 'attendance' | 'other') => { setSelected(item); setKind(type); setRequested('present'); setDetail(''); setError(''); setNotice(''); };
  const send = async () => {
    if (lock.current || !selected) return;
    if (detail.trim().length < 10 || detail.length > 1000) { setError('Mô tả từ 10 đến 1000 ký tự, kèm thông tin để Admin đối chiếu.'); return; }
    lock.current = true; setBusy(true); setError('');
    try { const { report } = await submitAttendanceComplaint(selected.id, kind, detail, requested); setSelected(null); setNotice(report.status === 'pending' ? 'Đã tiếp nhận khiếu nại. Bạn có thể theo dõi kết quả bên dưới.' : 'Khiếu nại cho kết quả điểm danh này đã được xem xét. Xem phản hồi bên dưới.'); await remote.reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được khiếu nại.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={styles.safe}><ScreenHeader title="Điểm danh & khiếu nại" onBack={onBack} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
    <RemoteState {...remote} onRetry={remote.reload} />{remote.data && <ReputationStats reputation={remote.data.reputation} />}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.note}>{notice}</Text> : null}
    {selected && <View style={styles.card}><Text style={styles.heading}>{kind === 'attendance' ? 'Khiếu nại điểm danh' : 'Khiếu nại vấn đề khác'} · {selected.title}</Text>
      {kind === 'attendance' && <View style={styles.row}>{(['present', 'late'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: requested === status }} onPress={() => setRequested(status)} style={[styles.button, requested === status && { backgroundColor: colors.primary }]}><Text style={{ color: requested === status ? colors.white : colors.text }}>{attendanceLabels[status]}</Text></Pressable>)}</View>}
      <FormField label="Nội dung khiếu nại" multiline value={detail} onChangeText={setDetail} placeholder="Mô tả thời gian có mặt, người có thể xác nhận, hoặc vấn đề cần Admin hỗ trợ…" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <GradientButton label={busy ? 'Đang gửi…' : 'Gửi khiếu nại'} disabled={busy} onPress={() => void send()} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => setSelected(null)}><Text style={styles.note}>Hủy</Text></Pressable>
    </View>}
    {!remote.loading && !remote.error && !remote.data?.items.length && <Text>Chưa có hoạt động tham gia để xem điểm danh.</Text>}
    {[...(remote.data?.items || [])].sort((a, b) => Number(b.id === activityId) - Number(a.id === activityId)).map(item => <View key={item.id} style={[styles.card, item.id === activityId && { borderColor: colors.primary }]}><Text style={styles.heading}>{item.title}</Text><Text>Điểm danh: {attendanceLabels[item.status]}</Text><Text style={styles.note}>{item.activityStatus === 'completed' ? 'Đã kết thúc' : item.activityStatus === 'published' ? 'Chưa bắt đầu' : 'Đang diễn ra'}{item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleString('vi-VN')}` : ''}</Text>
      <View style={styles.row}>{(item.status === 'absent' || item.status === 'unmarked' && item.activityStatus !== 'published') && <Pressable accessibilityRole="button" onPress={() => open(item, 'attendance')} style={styles.button}><Text style={styles.link}>Khiếu nại điểm danh</Text></Pressable>}<Pressable accessibilityRole="button" onPress={() => open(item, 'other')} style={styles.button}><Text style={styles.link}>Vấn đề khác</Text></Pressable></View>
    </View>)}
    <Text style={styles.heading}>Kết quả khiếu nại</Text>{remote.data?.reports.filter(report => report.type === 'member-complaint').map(report => <View key={report.id} style={styles.card}><Text style={styles.heading}>{report.reason}</Text><Text>{report.detail}</Text><Text>{report.status === 'pending' ? 'Chờ Admin xem xét' : report.status === 'resolved' ? 'Đã xử lý' : 'Không chấp nhận'}</Text>{report.reviewNote && <Text>Phản hồi Admin: {report.reviewNote}</Text>}{report.correctedStatus && <Text>Kết quả: {attendanceLabels[report.correctedStatus as AttendanceHistoryItem['status']]}</Text>}</View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, page: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', padding: 18, gap: 14, paddingBottom: 40 }, card: { padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, gap: 12 }, heading: { color: colors.text, fontSize: 16, fontWeight: '700' }, note: { color: colors.textSecondary, fontSize: 12, lineHeight: 20 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, button: { padding: 12, borderRadius: 10, backgroundColor: colors.primarySoft }, link: { color: colors.primary, fontWeight: '600' }, error: { color: colors.danger } });
