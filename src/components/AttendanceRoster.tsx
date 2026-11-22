import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { UserAvatar } from './UserAvatar';
import { Attendance, AttendanceQrToken, createAttendanceQrToken, gpsCheckInAttendance, qrCheckInAttendance } from '../services/activityApi';
import { currentCoordinates } from '../services/locationService';
import { colors } from '../theme';

export const attendanceLabels: Record<Attendance['status'], string> = { unmarked: 'Chưa điểm danh', present: 'Có mặt', absent: 'Vắng', late: 'Đến muộn' };
const tones = {
  unmarked: { fg: colors.textSecondary, bg: colors.surfaceMuted, icon: 'ellipse-outline' },
  present: { fg: colors.successText, bg: colors.successSoft, icon: 'checkmark-circle' },
  late: { fg: colors.warningText, bg: colors.warningSoft, icon: 'time' },
  absent: { fg: colors.matchText, bg: colors.matchSoft, icon: 'close-circle' },
} as const;

export function AttendanceRoster({
  activityId,
  people,
  hostId,
  editable,
  busy,
  onMark,
  onMarkAll,
  onCheckedIn,
}: {
  activityId?: string;
  people: Attendance[];
  hostId: string;
  editable: boolean;
  busy: boolean;
  onMark: (userId: string, status: Attendance['status']) => void;
  onMarkAll?: (status: Attendance['status']) => void;
  onCheckedIn?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | Attendance['status']>('all');
  const [qrModal, setQrModal] = useState(false);
  const [qrData, setQrData] = useState<AttendanceQrToken | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [scanModal, setScanModal] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState('');

  const present = people.filter(person => ['present', 'late'].includes(person.status)).length;

  const checkInByGps = async () => {
    if (!activityId || gpsBusy) return;
    setGpsBusy(true);
    setGpsMsg('');
    try {
      const coords = await currentCoordinates();
      const res = await gpsCheckInAttendance(activityId, coords);
      setGpsMsg(
        res.alreadyCheckedIn
          ? `Bạn đã được điểm danh trước đó rồi (cách địa điểm ${res.distanceMeters}m).`
          : `Điểm danh GPS thành công! Bạn cách điểm tập trung ${res.distanceMeters}m.`
      );
      onCheckedIn?.();
    } catch (reason) {
      setGpsMsg(reason instanceof Error ? reason.message : 'Chưa điểm danh được bằng GPS.');
    } finally {
      setGpsBusy(false);
    }
  };

  const generateQr = async () => {
    if (!activityId) return;
    setQrLoading(true);
    setQrError('');
    try {
      setQrData(await createAttendanceQrToken(activityId));
    } catch (reason) {
      setQrError(reason instanceof Error ? reason.message : 'Không tạo được mã QR điểm danh.');
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (qrModal && activityId && !qrData) {
      const timer = setTimeout(() => {
        void generateQr();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [qrModal, activityId, qrData]);

  const submitQrCode = async () => {
    if (!activityId || !scanCode.trim() || scanBusy) return;
    setScanBusy(true);
    setScanMsg('');
    try {
      const res = await qrCheckInAttendance(activityId, scanCode.trim());
      setScanMsg(res.alreadyCheckedIn ? 'Bạn đã điểm danh trước đó rồi.' : 'Điểm danh bằng mã QR thành công!');
      onCheckedIn?.();
    } catch (reason) {
      setScanMsg(reason instanceof Error ? reason.message : 'Mã QR không hợp lệ hoặc đã hết hạn.');
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.hero}>
        <View style={styles.heroHeading}>
          <View style={styles.heroIcon}><Ionicons name="people" size={26} color={colors.primary} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>Điểm danh ({present}/{people.length})</Text>
            <Text style={styles.caption}>Tích &quot;Điểm danh tất cả&quot; rồi chọn người vắng để thao tác nhanh nhất.</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progress, { width: `${people.length ? (present / people.length) * 100 : 0}%` }]} />
        </View>
        <View style={styles.stats}>
          {(['present', 'late', 'absent', 'unmarked'] as const).map(status => (
            <View key={status} style={styles.stat}>
              <Text style={[styles.statNumber, { color: tones[status].fg }]}>
                {people.filter(person => person.status === status).length}
              </Text>
              <Text style={styles.statLabel}>{attendanceLabels[status]}</Text>
            </View>
          ))}
        </View>

        {editable && (
          <View style={styles.quickRow}>
            {onMarkAll && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => onMarkAll('present')}
                style={[styles.markAllBtn, busy && { opacity: 0.5 }]}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={colors.white} />
                <Text style={styles.markAllText}>Điểm danh tất cả</Text>
              </Pressable>
            )}
            {activityId && (
              <Pressable
                accessibilityRole="button"
                onPress={() => { setQrData(null); setQrModal(true); }}
                style={styles.qrBtn}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                <Text style={styles.qrBtnText}>Mã QR nhóm</Text>
              </Pressable>
            )}
          </View>
        )}

        {!editable && activityId && (
          <View style={{ gap: 8 }}>
            <View style={styles.quickRow}>
              <Pressable accessibilityRole="button" disabled={gpsBusy} onPress={() => void checkInByGps()} style={[styles.markAllBtn, gpsBusy && { opacity: 0.5 }]}>
                <Ionicons name="locate" size={18} color={colors.white} />
                <Text style={styles.markAllText}>{gpsBusy ? 'Đang định vị GPS...' : 'Điểm danh bằng GPS'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setScanCode(''); setScanMsg(''); setScanModal(true); }} style={styles.qrBtn}>
                <Ionicons name="scan-outline" size={18} color={colors.primary} />
                <Text style={styles.qrBtnText}>Điểm danh bằng mã QR</Text>
              </Pressable>
            </View>
            {gpsMsg ? (
              <Text style={{ color: gpsMsg.includes('thành công') || gpsMsg.includes('trước đó') ? colors.successText : colors.danger, fontSize: 12, fontWeight: '600' }}>
                {gpsMsg}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.filters}>
        {(['all', 'unmarked', 'present', 'late', 'absent'] as const).map(status => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === status }}
            accessibilityLabel={'Lọc điểm danh: ' + (status === 'all' ? 'Tất cả' : attendanceLabels[status])}
            key={status}
            onPress={() => setFilter(status)}
            style={[styles.filter, filter === status && styles.selectedFilter]}
          >
            <Text style={[styles.filterLabel, filter === status && { color: colors.primary }]}>
              {status === 'all' ? 'Tất cả' : attendanceLabels[status]}
            </Text>
          </Pressable>
        ))}
      </View>

      {people.filter(person => filter === 'all' || person.status === filter).map(person => {
        const tone = tones[person.status];
        return (
          <View key={person.userId} style={styles.person}>
            <View style={styles.personTop}>
              <UserAvatar name={person.name} size={42} borderColor={tone.fg} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{person.name}</Text>
                <Text style={styles.caption}>{person.userId === hostId ? 'Người tổ chức' : 'Thành viên'}</Text>
              </View>
              <View style={[styles.status, { backgroundColor: tone.bg }]}>
                <Ionicons name={tone.icon} size={15} color={tone.fg} />
                <Text style={{ color: tone.fg, fontSize: 11, fontWeight: '600' }}>{attendanceLabels[person.status]}</Text>
              </View>
            </View>
            {person.correctionReportId && <Text style={styles.caption}>Admin đã xác minh điểm danh.</Text>}
            {editable && !person.correctionReportId && (
              <View style={styles.choices}>
                {(['present', 'late', 'absent', 'unmarked'] as const).map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityLabel={`Điểm danh ${person.name}: ${attendanceLabels[status]}`}
                    accessibilityState={{ selected: person.status === status, disabled: busy }}
                    disabled={busy}
                    onPress={() => onMark(person.userId, status)}
                    style={[
                      styles.choice,
                      person.status === status && { backgroundColor: tones[status].bg, borderColor: tones[status].fg },
                      busy && { opacity: 0.5 },
                    ]}
                  >
                    <Ionicons name={tones[status].icon} size={18} color={person.status === status ? tones[status].fg : colors.textMuted} />
                    <Text style={{ color: person.status === status ? tones[status].fg : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
                      {status === 'unmarked' ? 'Đặt lại' : attendanceLabels[status]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {!people.some(person => filter === 'all' || person.status === filter) && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={30} color={colors.primary} />
          <Text style={styles.caption}>Không có thành viên trong mục này.</Text>
        </View>
      )}

      <Modal transparent animationType="fade" visible={qrModal} onRequestClose={() => setQrModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mã QR Điểm Danh</Text>
              <Pressable onPress={() => setQrModal(false)} style={styles.modalClose}><Ionicons name="close" size={20} color={colors.text} /></Pressable>
            </View>
            <Text style={styles.caption}>Thành viên quét hoặc nhập mã bên dưới để tự điểm danh. Mã tự động hết hạn sau 2 phút để chống điểm danh hộ.</Text>
            {qrLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> : qrError ? <Text style={{ color: colors.danger }}>{qrError}</Text> : qrData ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData.token)}` }}
                  style={{ width: 210, height: 210, borderRadius: 12, backgroundColor: colors.surfaceMuted }}
                />
                <Text selectable style={styles.qrCodeText}>{qrData.token}</Text>
                <Text style={styles.caption}>Hết hạn lúc: {new Date(qrData.expiresAt).toLocaleTimeString('vi-VN')}</Text>
              </View>
            ) : null}
            <Pressable onPress={() => void generateQr()} style={styles.qrBtn}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.qrBtnText}>Tạo mã QR mới</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={scanModal} onRequestClose={() => setScanModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Điểm danh bằng mã QR</Text>
              <Pressable onPress={() => setScanModal(false)} style={styles.modalClose}><Ionicons name="close" size={20} color={colors.text} /></Pressable>
            </View>
            <TextInput
              value={scanCode}
              onChangeText={setScanCode}
              placeholder="Dán mã QR từ Host (GMQR1....)"
              placeholderTextColor={colors.textMuted}
              style={styles.qrInput}
            />
            {scanMsg ? <Text style={{ color: scanMsg.includes('thành công') ? colors.successText : colors.danger, fontSize: 13 }}>{scanMsg}</Text> : null}
            <Pressable disabled={scanBusy || !scanCode.trim()} onPress={() => void submitQrCode()} style={[styles.markAllBtn, (scanBusy || !scanCode.trim()) && { opacity: 0.5 }]}>
              <Text style={styles.markAllText}>{scanBusy ? 'Đang xác nhận...' : 'Xác nhận điểm danh'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 },
  heroHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  progressTrack: { height: 7, backgroundColor: colors.surfaceStrong, borderRadius: 8, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: colors.success, borderRadius: 8 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 10 },
  quickRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  markAllBtn: { flex: 1, minWidth: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  markAllText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  qrBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, minHeight: 38 },
  selectedFilter: { backgroundColor: colors.primarySoft },
  filterLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  person: { padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  status: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  choices: { flexDirection: 'row', gap: 6 },
  choice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, minHeight: 56 },
  empty: { alignItems: 'center', gap: 10, padding: 26 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 14, maxWidth: 420, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  qrCodeText: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.surfaceMuted, padding: 8, borderRadius: 8, width: '100%', textAlign: 'center' },
  qrInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, backgroundColor: colors.background, fontSize: 13 },
});
