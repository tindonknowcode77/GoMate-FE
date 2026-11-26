import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text } from './LocalizedText';
import { Activity } from '../data/activities';
import { getActivity, joinActivity, listMyRequests, qrCheckInAttendance, toActivity } from '../services/activityApi';
import { getSession } from '../services/api';
import { parseGoMateQr } from '../services/qrCode';
import { useProfile } from '../services/ProfileContext';
import { canUserParticipate, isBasicProfileComplete, missingBasicProfileLabels } from './ActivityChoices';
import { promptProfileCompletion } from '../services/feedback';
import { colors, layout } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenGroup?: (activity: Activity) => void;
  onCheckedIn?: () => void;
  expectedActivityId?: string;
};

type ScanOutcome =
  | { kind: 'idle' }
  | { kind: 'processing'; label: string }
  | { kind: 'success'; title: string; message: string; activity?: Activity }
  | { kind: 'error'; message: string }
  | { kind: 'join-preview'; activity: Activity; status: 'can-join' | 'member' | 'pending' | 'unavailable'; note?: string };

export function QrScannerModal({ visible, onClose, onOpenGroup, onCheckedIn, expectedActivityId }: Props) {
  const { profile } = useProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const [outcome, setOutcome] = useState<ScanOutcome>({ kind: 'idle' });
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [joining, setJoining] = useState(false);
  const scanLock = useRef(false);

  const reset = useCallback(() => {
    scanLock.current = false;
    setOutcome({ kind: 'idle' });
    setManualCode('');
    setJoining(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      scanLock.current = false;
      return;
    }
    if (Platform.OS !== 'web' && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handlePayload = useCallback(async (raw: string) => {
    if (scanLock.current) return;
    const parsed = parseGoMateQr(raw);
    if (!parsed) {
      setOutcome({ kind: 'error', message: 'Mã QR không hợp lệ hoặc không thuộc GoMate.' });
      return;
    }
    if (expectedActivityId && parsed.kind === 'attendance' && parsed.activityId !== expectedActivityId) {
      setOutcome({ kind: 'error', message: 'Mã QR điểm danh không thuộc hoạt động này.' });
      return;
    }
    scanLock.current = true;
    if (parsed.kind === 'attendance') {
      setOutcome({ kind: 'processing', label: 'Đang xác nhận điểm danh...' });
      try {
        const res = await qrCheckInAttendance(parsed.activityId, parsed.token);
        onCheckedIn?.();
        setOutcome({
          kind: 'success',
          title: res.alreadyCheckedIn ? 'Đã điểm danh' : 'Điểm danh thành công!',
          message: res.alreadyCheckedIn ? 'Bạn đã điểm danh cho hoạt động này trước đó.' : 'Hệ thống đã ghi nhận sự có mặt của bạn.',
        });
      } catch (reason) {
        setOutcome({ kind: 'error', message: reason instanceof Error ? reason.message : 'Mã QR không hợp lệ hoặc đã hết hạn.' });
      }
      return;
    }

    setOutcome({ kind: 'processing', label: 'Đang tải thông tin nhóm...' });
    try {
      const [row, requests] = await Promise.all([getActivity(parsed.activityId), listMyRequests().catch(() => [])]);
      const ownReq = requests.find(item => item.activityId === row.id);
      const activity = toActivity(row, ownReq?.status);
      const me = getSession()?.user.id;
      const isMember = row.hostId === me || Boolean(row.isBusinessManager) || ownReq?.status === 'approved';
      if (isMember) {
        setOutcome({ kind: 'join-preview', activity, status: 'member', note: 'Bạn đã là thành viên của nhóm này.' });
        return;
      }
      if (ownReq?.status === 'pending') {
        setOutcome({ kind: 'join-preview', activity, status: 'pending', note: 'Bạn đã gửi yêu cầu tham gia và đang chờ Host duyệt.' });
        return;
      }
      const now = Date.now();
      const closed = row.status !== 'published'
        || new Date(row.startsAt).getTime() <= now
        || Boolean(row.registrationDeadline && new Date(row.registrationDeadline).getTime() <= now)
        || row.memberCount >= row.maxParticipants;
      if (closed) {
        setOutcome({ kind: 'join-preview', activity, status: 'unavailable', note: 'Hoạt động đã đủ chỗ hoặc không còn nhận đăng ký.' });
        return;
      }
      setOutcome({ kind: 'join-preview', activity, status: 'can-join' });
    } catch (reason) {
      setOutcome({ kind: 'error', message: reason instanceof Error ? reason.message : 'Không tìm thấy nhóm từ mã QR này.' });
    }
  }, [expectedActivityId, onCheckedIn]);

  const submitJoinFromQr = async (activity: Activity) => {
    if (joining) return;
    if (profile && !isBasicProfileComplete(profile)) {
      onClose();
      promptProfileCompletion(`Hồ sơ của bạn chưa đủ thông tin cơ bản (${missingBasicProfileLabels(profile).join(', ')}). Vui lòng bổ sung để gửi yêu cầu tham gia.`);
      return;
    }
    if (profile && !canUserParticipate(activity.participantPreferences, profile)) {
      onClose();
      promptProfileCompletion('Hồ sơ chưa đáp ứng yêu cầu nhóm. Hãy kiểm tra và bổ sung thông tin trong hồ sơ.');
      return;
    }
    setJoining(true);
    try {
      const res = await joinActivity(activity.id);
      const approved = res.request.status === 'approved';
      setOutcome({
        kind: 'success',
        title: approved ? 'Đã tham gia nhóm!' : 'Đã gửi yêu cầu tham gia!',
        message: approved ? `Bạn đã được thêm vào nhóm "${activity.title}".` : `Yêu cầu tham gia "${activity.title}" đã được gửi để Host duyệt.`,
        activity: approved ? { ...activity, requestStatus: 'approved' } : undefined,
      });
    } catch (reason) {
      setOutcome({ kind: 'error', message: reason instanceof Error ? reason.message : 'Không gửi được yêu cầu tham gia.' });
    } finally {
      setJoining(false);
    }
  };

  if (!visible) return null;

  const showCamera = outcome.kind === 'idle' && !manualOpen;

  return (
    <Modal visible={visible} statusBarTranslucent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng quét mã QR"
            hitSlop={12}
            onPress={() => { reset(); onClose(); }}
            style={styles.headerBtn}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Quét mã QR</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={manualOpen ? 'Mở camera quét QR' : 'Nhập mã QR thủ công'}
            onPress={() => { setManualOpen(v => !v); setOutcome({ kind: 'idle' }); scanLock.current = false; }}
            style={styles.headerBtn}
          >
            <Ionicons name={manualOpen ? 'camera-outline' : 'keypad-outline'} size={21} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {showCamera ? (
            Platform.OS === 'web' ? (
              <WebQrScanner onDetect={value => void handlePayload(value)} onFallbackManual={() => setManualOpen(true)} />
            ) : !permission ? (
              <View style={styles.centerCard}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : !permission.granted ? (
              <View style={styles.centerCard}>
                <View style={styles.iconCircle}><Ionicons name="camera-outline" size={32} color={colors.primary} /></View>
                <Text style={styles.cardTitle}>Cần quyền truy cập Camera</Text>
                <Text style={styles.cardSub}>Cho phép GoMate dùng camera để quét mã QR điểm danh hoặc tham gia nhóm.</Text>
                <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Cho phép Camera</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cameraWrap}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={({ data }) => {
                    if (data) void handlePayload(data);
                  }}
                />
                <View pointerEvents="none" style={styles.overlay}>
                  <View style={styles.frame}>
                    <View style={[styles.corner, styles.tl]} />
                    <View style={[styles.corner, styles.tr]} />
                    <View style={[styles.corner, styles.bl]} />
                    <View style={[styles.corner, styles.br]} />
                  </View>
                  <Text style={styles.scanHint}>Đưa mã QR điểm danh hoặc mã nhóm vào khung</Text>
                </View>
              </View>
            )
          ) : manualOpen && outcome.kind === 'idle' ? (
            <View style={styles.centerCard}>
              <View style={styles.iconCircle}><Ionicons name="qr-code-outline" size={30} color={colors.primary} /></View>
              <Text style={styles.cardTitle}>Nhập mã QR</Text>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Dán mã QR điểm danh hoặc mã tham gia nhóm..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!manualCode.trim()}
                onPress={() => void handlePayload(manualCode)}
                style={[styles.primaryBtn, !manualCode.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.primaryBtnText}>Tiếp tục</Text>
              </Pressable>
            </View>
          ) : outcome.kind === 'processing' ? (
            <View style={styles.centerCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.cardSub}>{outcome.label}</Text>
            </View>
          ) : outcome.kind === 'error' ? (
            <View style={styles.centerCard}>
              <View style={[styles.iconCircle, { backgroundColor: colors.matchSoft }]}>
                <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
              </View>
              <Text style={styles.cardTitle}>Không thể xử lý mã QR</Text>
              <Text style={styles.cardSub}>{outcome.message}</Text>
              <Pressable accessibilityRole="button" onPress={reset} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Quét lại</Text>
              </Pressable>
            </View>
          ) : outcome.kind === 'success' ? (
            <View style={styles.centerCard}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              </View>
              <Text style={styles.cardTitle}>{outcome.title}</Text>
              <Text style={styles.cardSub}>{outcome.message}</Text>
              {outcome.activity && onOpenGroup ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { const act = outcome.activity!; reset(); onClose(); onOpenGroup(act); }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Vào nhóm ngay</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => { reset(); onClose(); }} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Xong</Text>
                </Pressable>
              )}
            </View>
          ) : outcome.kind === 'join-preview' ? (
            <View style={styles.centerCard}>
              <Image source={outcome.activity.image} style={styles.previewImg} />
              <Text style={styles.cardTitle}>{outcome.activity.title}</Text>
              <Text style={styles.cardSub}>{outcome.activity.time}</Text>
              <Text style={styles.cardSub}>{outcome.activity.location} · {outcome.activity.members} thành viên</Text>
              {outcome.note ? <Text style={[styles.cardSub, { color: colors.primary, fontWeight: '600' }]}>{outcome.note}</Text> : null}
              {outcome.status === 'can-join' && (
                <Pressable
                  accessibilityRole="button"
                  disabled={joining}
                  onPress={() => void submitJoinFromQr(outcome.activity)}
                  style={[styles.primaryBtn, joining && { opacity: 0.6 }]}
                >
                  <Text style={styles.primaryBtnText}>{joining ? 'Đang gửi...' : 'Gửi yêu cầu tham gia'}</Text>
                </Pressable>
              )}
              {outcome.status === 'member' && onOpenGroup && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { const act = outcome.activity; reset(); onClose(); onOpenGroup(act); }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Mở nhóm chat</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={reset} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Quét mã khác</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function WebQrScanner({ onDetect, onFallbackManual }: { onDetect: (value: string) => void; onFallbackManual: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<'starting' | 'active' | 'unsupported'>('starting');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setStatus('unsupported'));
      return;
    }
    type BarcodeDetectorCtor = new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]> };
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      queueMicrotask(() => setStatus('unsupported'));
      return;
    }
    let alive = true;
    let stream: MediaStream | null = null;
    let rafId = 0;
    const detector = new Detector({ formats: ['qr_code'] });

    void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(media => {
      if (!alive) { media.getTracks().forEach(t => t.stop()); return; }
      stream = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        void videoRef.current.play().catch(() => {});
      }
      setStatus('active');
      const scan = async () => {
        if (!alive || !videoRef.current) return;
        try {
          if (videoRef.current.readyState >= 2) {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) {
              onDetect(found[0].rawValue);
              return;
            }
          }
        } catch { /* Ignore single-frame decode errors. */ }
        rafId = requestAnimationFrame(() => void scan());
      };
      rafId = requestAnimationFrame(() => void scan());
    }).catch(() => {
      if (alive) setStatus('unsupported');
    });

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onDetect]);

  if (status === 'unsupported') {
    return (
      <View style={styles.centerCard}>
        <View style={styles.iconCircle}><Ionicons name="qr-code-outline" size={32} color={colors.primary} /></View>
        <Text style={styles.cardTitle}>Quét mã QR trên trình duyệt</Text>
        <Text style={styles.cardSub}>Trình duyệt này chưa hỗ trợ quét trực tiếp từ camera. Bạn có thể nhập hoặc dán mã QR để tiếp tục.</Text>
        <Pressable accessibilityRole="button" onPress={onFallbackManual} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Nhập mã QR</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.scanHint}>Đưa mã QR điểm danh hoặc mã nhóm vào khung</Text>
      </View>
    </View>
  );
}

const CORNER = 26;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F101B' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  body: { flex: 1, justifyContent: 'center', padding: 18 },
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 22, backgroundColor: 'rgba(0,0,0,0.22)' },
  frame: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.white, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanHint: { color: colors.white, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, borderRadius: 14, overflow: 'hidden' },
  centerCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 12, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  cardSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  previewImg: { width: '100%', height: 150, borderRadius: 16, marginBottom: 4 },
  input: { width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, fontSize: 13, color: colors.text, backgroundColor: colors.background },
  primaryBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
