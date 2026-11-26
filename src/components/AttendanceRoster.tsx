import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { UserAvatar } from './UserAvatar';
import { QrScannerModal } from './QrScannerModal';
import { Attendance, AttendanceQrToken, createAttendanceQrToken } from '../services/activityApi';
import { qrImageUrl } from '../services/qrCode';
import { colors } from '../theme';

export const attendanceLabels: Record<Attendance['status'], string> = { unmarked: 'Chưa điểm danh', present: 'Có mặt', absent: 'Vắng', late: 'Đến muộn' };
const tones = {
  unmarked: { fg: colors.textSecondary, bg: colors.surfaceMuted, icon: 'ellipse-outline' },
  present: { fg: colors.successText, bg: colors.successSoft, icon: 'checkmark-circle' },
  late: { fg: colors.warningText, bg: colors.warningSoft, icon: 'time' },
  absent: { fg: colors.matchText, bg: colors.matchSoft, icon: 'close-circle' },
} as const;

const QR_WINDOW_SECONDS = 120;

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

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
  const [remainingSeconds, setRemainingSeconds] = useState(QR_WINDOW_SECONDS);
  const [scanModal, setScanModal] = useState(false);
  const qrFetchingRef = useRef(false);

  // Host always self-checks in automatically when the activity starts; only members need attendance marking.
  const attendees = people.filter(person => person.userId !== hostId);
  const present = attendees.filter(person => ['present', 'late'].includes(person.status)).length;

  const generateQr = useCallback(async () => {
    if (!activityId || qrFetchingRef.current) return;
    qrFetchingRef.current = true;
    setQrLoading(true);
    setQrError('');
    try {
      const next = await createAttendanceQrToken(activityId);
      setQrData(next);
      const ttl = Math.max(1, Math.round((new Date(next.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(Math.min(QR_WINDOW_SECONDS, ttl));
    } catch (reason) {
      setQrError(reason instanceof Error ? reason.message : 'Không tạo được mã QR điểm danh.');
    } finally {
      qrFetchingRef.current = false;
      setQrLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    if (!qrModal || !activityId) return;
    const timer = setTimeout(() => { void generateQr(); }, 0);
    return () => clearTimeout(timer);
  }, [qrModal, activityId, generateQr]);

  useEffect(() => {
    if (!qrModal || !qrData) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(qrData.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0 && !qrFetchingRef.current) {
        void generateQr();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [qrModal, qrData, generateQr]);

  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / QR_WINDOW_SECONDS));

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.hero}>
        <View style={styles.heroHeading}>
          <View style={styles.heroIcon}><Ionicons name="people" size={26} color={colors.primary} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>Điểm danh ({present}/{attendees.length})</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progress, { width: `${attendees.length ? (present / attendees.length) * 100 : 100}%` }]} />
        </View>
        <View style={styles.stats}>
          {(['present', 'late', 'absent', 'unmarked'] as const).map(status => (
            <View key={status} style={styles.stat}>
              <Text style={[styles.statNumber, { color: tones[status].fg }]}>
                {attendees.filter(person => person.status === status).length}
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
                onPress={() => { setQrData(null); setRemainingSeconds(QR_WINDOW_SECONDS); setQrModal(true); }}
                style={styles.qrBtn}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                <Text style={styles.qrBtnText}>Mã QR điểm danh</Text>
              </Pressable>
            )}
          </View>
        )}

        {!editable && activityId && (
          <Pressable accessibilityRole="button" onPress={() => setScanModal(true)} style={styles.qrBtn}>
            <Ionicons name="scan-outline" size={18} color={colors.primary} />
            <Text style={styles.qrBtnText}>Quét mã QR điểm danh</Text>
          </Pressable>
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

      {attendees.filter(person => filter === 'all' || person.status === filter).map(person => {
        const tone = tones[person.status];
        return (
          <View key={person.userId} style={styles.person}>
            <View style={styles.personTop}>
              <UserAvatar name={person.name} size={42} borderColor={tone.fg} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{person.name}</Text>
                <Text style={styles.caption}>Thành viên</Text>
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

      {!attendees.some(person => filter === 'all' || person.status === filter) && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={30} color={colors.primary} />
          <Text style={styles.caption}>Không có thành viên trong mục này.</Text>
        </View>
      )}

      <Modal transparent animationType="fade" visible={qrModal} onRequestClose={() => setQrModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mã QR Điểm Danh</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng mã QR" onPress={() => setQrModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.qrStage}>
              {qrLoading && !qrData ? (
                <View style={styles.qrPlaceholder}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : qrError ? (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
                  <Text style={{ color: colors.danger, textAlign: 'center', fontSize: 13 }}>{qrError}</Text>
                  <Pressable onPress={() => void generateQr()} style={styles.qrBtn}>
                    <Text style={styles.qrBtnText}>Thử lại</Text>
                  </Pressable>
                </View>
              ) : qrData ? (
                <View style={styles.qrFrame}>
                  <Image
                    source={{ uri: qrImageUrl(qrData.token, 260) }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  {qrLoading && (
                    <View style={styles.qrRefreshingOverlay}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            {qrData && !qrError && (
              <View style={styles.timerBlock}>
                <View style={styles.timerPill}>
                  <Ionicons name="time-outline" size={16} color={remainingSeconds <= 15 ? colors.danger : colors.primary} />
                  <Text style={[styles.timerText, remainingSeconds <= 15 && { color: colors.danger }]}>
                    {formatCountdown(remainingSeconds)}
                  </Text>
                </View>
                <View style={styles.timerTrack}>
                  <View style={[styles.timerFill, { width: `${progressRatio * 100}%`, backgroundColor: remainingSeconds <= 15 ? colors.danger : colors.primary }]} />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <QrScannerModal
        visible={scanModal}
        expectedActivityId={activityId}
        onClose={() => setScanModal(false)}
        onCheckedIn={() => onCheckedIn?.()}
      />
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', justifyContent: 'center', padding: 22 },
  qrModalCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 22, gap: 18, maxWidth: 360, width: '100%', alignSelf: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  qrStage: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  qrFrame: { padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  qrImage: { width: 228, height: 228, borderRadius: 10 },
  qrRefreshingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qrPlaceholder: { width: 240, height: 240, borderRadius: 22, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18 },
  timerBlock: { width: '100%', alignItems: 'center', gap: 10 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
  timerText: { fontSize: 17, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  timerTrack: { width: '78%', height: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 999 },
});
