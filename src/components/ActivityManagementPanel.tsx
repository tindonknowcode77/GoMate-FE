import { useFeedbackState } from '../services/feedback';
import { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { RemoteState } from './RemoteState';
import { GradientButton } from './GradientButton';
import { ActivityLifecyclePanel } from './ActivityLifecyclePanel';
import { BusinessIdentity } from './BusinessIdentity';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Activity } from '../data/activities';
import {
  ActivityDto, Attendance, deleteActivity, getActivity, getPortalGroup,
  listAttendance, markAttendance, PortalGroupDetail, recordPortalDeposit,
  sendPortalOffer, toActivity, updatePortalOffer,
} from '../services/activityApi';
import { getSession } from '../services/api';
import { useRemote } from '../services/useRemote';
import { CreateActivityScreen } from '../screens/CreateActivityScreen';
import { colors } from '../theme';

type Icon = ComponentProps<typeof Ionicons>['name'];
type Props = { activityId: string; onPlan?: () => void; onOpenGroup?: (activity: Activity) => void; onMembers?: (activity: Activity) => void; onProgress?: (activity: Activity) => void; onDeleted: () => void; onChanged?: (activity: ActivityDto) => void };

const attendanceOptions: [Attendance['status'], string][] = [
  ['present', 'Có mặt'],
  ['late', 'Đến muộn'],
  ['absent', 'Vắng mặt'],
];

export function ActivityManagementPanel({ activityId, onPlan, onOpenGroup, onMembers, onProgress, onDeleted, onChanged }: Props) {
  const load = useCallback(async () => {
    const activity = await getActivity(activityId);
    if (activity.hostId !== getSession()?.user.id && !activity.isBusinessManager) throw new Error('Chỉ host hoặc nhân sự được phân công có quyền quản lý hoạt động.');
    const [portalGroup, attendance] = await Promise.all([
      activity.organizerType === 'business' ? getPortalGroup(activityId).catch(() => null) : Promise.resolve(null),
      ['published', 'in-progress', 'completed'].includes(activity.status || '') ? listAttendance(activityId).catch(() => []) : Promise.resolve([]),
    ]);
    return { activity, portalGroup, attendance };
  }, [activityId]);
  const remote = useRemote(load, null);
  const [editing, setEditing] = useState(false), [error, setError] = useFeedbackState(''), [busy, setBusy] = useState(false);
  const [offerTitle, setOfferTitle] = useState(''), [offerBody, setOfferBody] = useState(''), [editingOfferId, setEditingOfferId] = useState(''), [offerNotice, setOfferNotice] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const [confirmation, setConfirmation] = useState<'delete' | null>(null);
  const locked = useRef(false);
  const row = remote.data?.activity;
  const portalGroup: PortalGroupDetail | null = remote.data?.portalGroup ?? null;
  const attendance: Attendance[] = remote.data?.attendance ?? [];
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được thay đổi.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const refresh = async () => { await remote.reload(); const fresh = await getActivity(activityId); onChanged?.(fresh); };
  const editable = row?.status === 'published' && new Date(row.startsAt).getTime() > now;
  const activeRun = ['published', 'in-progress'].includes(row?.status || '');
  const confirm = () => void run(async () => {
    if (!row || !confirmation) return;
    if (confirmation === 'delete') { await deleteActivity(activityId); setConfirmation(null); onDeleted(); return; }
  });
  const dialog = confirmation && {
    delete: [row && row.memberCount > 1 ? 'Hủy hoạt động?' : 'Xóa hoạt động?', row && row.memberCount > 1 ? 'Nhóm sẽ ngừng nhận tin nhắn. Lịch sử trò chuyện được giữ lại.' : 'Hoạt động sẽ bị xóa. Không thể hoàn tác.'],
  }[confirmation];
  const paidCount = portalGroup?.depositMembers.filter(item => item.status === 'paid').length ?? 0;
  const totalCollected = portalGroup?.depositMembers.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || portalGroup.depositAmount || 0), 0) ?? 0;
  const markedCount = attendance.filter(item => item.status !== 'unmarked').length;
  return <View style={styles.panel}>
    <RemoteState {...remote} onRetry={remote.reload} />
    {row && <>
      {row.isBusinessManager && <View style={styles.roleBanner}><Ionicons name="shield-checkmark" size={16} color={colors.primary} /><Text numberOfLines={1} style={styles.roleBannerText}>Bạn là Nhân sự quản lý (Staff) của nhóm này · Có đầy đủ quyền điều hành</Text></View>}
      <ActivityLifecyclePanel activity={row} onPlan={onPlan} onChanged={fresh => { remote.setData(data => data ? { ...data, activity: fresh } : data); onChanged?.(fresh); void remote.reload(true); }} onProgress={fresh => onProgress?.(toActivity(fresh))} />
      {row.organizerType === 'business' && <View style={styles.card}><BusinessIdentity activity={toActivity(row)} details /></View>}
      <View style={styles.overview}><View style={styles.headingRow}><View style={styles.statusDot} /><Text style={styles.eyebrow}>{row.status === 'expired' ? 'ĐÃ HẾT HẠN' : row.status === 'completed' ? 'ĐÃ KẾT THÚC' : row.status === 'in-progress' ? 'ĐANG DIỄN RA' : 'SẮP DIỄN RA'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Làm mới quản lý" onPress={() => void remote.reload()}><Ionicons name="refresh-outline" size={19} color={colors.primary} /></Pressable></View><Text style={styles.title}>Tổng quan</Text><View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{row.memberCount}/{row.maxParticipants}</Text><Text style={styles.muted}>Thành viên</Text></View><View style={styles.stat}><Ionicons name={row.scheduleConfirmedAt ? 'calendar' : 'calendar-outline'} size={23} color={colors.primary} /><Text style={styles.muted}>{row.scheduleConfirmedAt ? 'Đã chốt lịch' : 'Chưa chốt lịch'}</Text></View></View></View>

      {editable && <JoinRequestsPanel activityId={activityId} enabled={editable} full={row.memberCount >= row.maxParticipants} onChanged={() => void refresh()} />}

      {row.organizerType === 'business' && portalGroup && <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.sectionTitle}>Quản lý tiền cọc</Text>
            <Text style={styles.muted}>{portalGroup.depositAmount > 0 ? `Mức cọc: ${portalGroup.depositAmount.toLocaleString('vi-VN')} đ/người · Đã thu: ${totalCollected.toLocaleString('vi-VN')} đ` : 'Nhóm không yêu cầu đặt cọc'}</Text>
          </View>
          <View style={styles.count}><Text style={styles.countText}>{paidCount}/{portalGroup.depositMembers.length} đã cọc</Text></View>
        </View>
        {!portalGroup.depositMembers.length ? <Text style={styles.muted}>Chưa có thành viên được duyệt trong nhóm.</Text> : portalGroup.depositMembers.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.muted}>{Number(member.amount || portalGroup.depositAmount).toLocaleString('vi-VN')} đ · {member.status === 'paid' ? 'Đã xác nhận cọc' : member.status === 'not-required' ? 'Không yêu cầu cọc' : 'Chưa đóng cọc'}</Text>
            </View>
            {activeRun && portalGroup.depositAmount > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void run(async () => {
                  await recordPortalDeposit(activityId, member.id, portalGroup.version, member.status === 'paid' ? 'pending' : 'paid');
                  await refresh();
                })}
                style={[styles.smallBtn, member.status === 'paid' ? styles.smallBtnSecondary : styles.smallBtnPrimary, busy && { opacity: 0.5 }]}
              >
                <Text style={[styles.smallBtnText, member.status === 'paid' && { color: colors.textSecondary }]}>{member.status === 'paid' ? 'Hủy xác nhận' : 'Xác nhận đã cọc'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>}

      {activeRun && attendance.length > 0 && <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.sectionTitle}>Điểm danh thành viên</Text>
            <Text style={styles.muted}>Cập nhật trạng thái tham gia của từng thành viên trước khi hoàn tất hoạt động</Text>
          </View>
          <View style={styles.count}><Text style={styles.countText}>{markedCount}/{attendance.length}</Text></View>
        </View>
        {attendance.map(member => (
          <View key={member.userId} style={styles.attendanceItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={styles.memberName}>{member.name}{member.userId === row.hostId ? ' (Ban tổ chức)' : ''}</Text>
              <Text style={[styles.muted, { color: member.status === 'unmarked' ? colors.warningText : colors.primary, fontWeight: '700' }]}>
                {member.status === 'present' ? 'Có mặt' : member.status === 'late' ? 'Đến muộn' : member.status === 'absent' ? 'Vắng mặt' : 'Chưa điểm danh'}
              </Text>
            </View>
            <View style={styles.attendancePills}>
              {attendanceOptions.map(([status, label]) => {
                const selected = member.status === status;
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void run(async () => {
                      await markAttendance(activityId, member.userId, status);
                      await refresh();
                    })}
                    style={[styles.pill, selected && styles.pillActive, busy && { opacity: 0.5 }]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>}

      {row.organizerType === 'business' && portalGroup && activeRun && <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingOfferId ? 'Cập nhật thông báo ưu đãi' : 'Thông báo & ưu đãi nhóm'}</Text>
        <TextInput
          accessibilityLabel="Tiêu đề ưu đãi"
          placeholder="Tiêu đề thông báo / ưu đãi (VD: Tặng nước chào mừng)"
          placeholderTextColor={colors.textMuted}
          value={offerTitle}
          onChangeText={setOfferTitle}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Nội dung ưu đãi"
          placeholder="Nội dung chi tiết gửi tới các thành viên trong nhóm"
          placeholderTextColor={colors.textMuted}
          value={offerBody}
          onChangeText={setOfferBody}
          multiline
          style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !offerTitle.trim() || !offerBody.trim()}
            onPress={() => void run(async () => {
              setOfferNotice('');
              if (editingOfferId) {
                await updatePortalOffer(activityId, editingOfferId, { version: portalGroup.version, title: offerTitle.trim(), body: offerBody.trim(), expiresAt: '' });
                setEditingOfferId('');
                setOfferNotice('Đã cập nhật thông báo ưu đãi.');
              } else {
                await sendPortalOffer(activityId, { version: portalGroup.version, clientId: `offer-${Date.now()}`, title: offerTitle.trim(), body: offerBody.trim(), expiresAt: '' });
                setOfferNotice('Đã gửi thông báo ưu đãi đến nhóm.');
              }
              setOfferTitle(''); setOfferBody('');
              await refresh();
            })}
            style={[styles.smallBtn, styles.smallBtnPrimary, { flex: 1, paddingVertical: 11 }, (busy || !offerTitle.trim() || !offerBody.trim()) && { opacity: 0.5 }]}
          >
            <Text style={styles.smallBtnText}>{editingOfferId ? 'Lưu thông báo ưu đãi' : 'Gửi thông báo ưu đãi'}</Text>
          </Pressable>
          {Boolean(editingOfferId) && <Pressable accessibilityRole="button" onPress={() => { setEditingOfferId(''); setOfferTitle(''); setOfferBody(''); }} style={[styles.smallBtn, styles.smallBtnSecondary, { paddingVertical: 11 }]}><Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>Hủy</Text></Pressable>}
        </View>
        {offerNotice ? <Text style={{ color: '#16704A', fontSize: 12, fontWeight: '600' }}>{offerNotice}</Text> : null}
        {Boolean(portalGroup.notifications?.length) && <View style={{ gap: 8, marginTop: 4 }}>
          <Text style={styles.muted}>Đã gửi gần đây</Text>
          {portalGroup.notifications.slice(0, 5).map(item => (
            <View key={item.id} style={styles.memberRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.memberName}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.muted}>{item.body}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => { setEditingOfferId(item.id); setOfferTitle(item.title); setOfferBody(item.body); setOfferNotice(''); }} style={[styles.smallBtn, styles.smallBtnSecondary]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Sửa</Text>
              </Pressable>
            </View>
          ))}
        </View>}
      </View>}

      <View style={styles.card}>
        {onOpenGroup && <ManagementRow icon="chatbubbles-outline" title="Mở chat nhóm" detail="" onPress={() => onOpenGroup(toActivity(row))} />}
        {onPlan && <ManagementRow icon="calendar-outline" title="Quản lý lịch trình & kế hoạch" detail="" onPress={onPlan} />}
        {onMembers && <ManagementRow icon="people-outline" title="Quản lý thành viên" detail="" onPress={() => onMembers(toActivity(row))} />}
        {editable && row.organizerType !== 'business' && <ManagementRow icon="create-outline" title="Chỉnh sửa hoạt động" detail="" disabled={busy} onPress={() => setEditing(true)} />}
      </View>
      {row.organizerType !== 'business' && !row.isBusinessManager && <View style={styles.card}><ManagementRow icon="trash-outline" title={row.memberCount > 1 ? 'Hủy hoạt động' : 'Xóa hoạt động'} detail="" destructive disabled={busy} onPress={() => setConfirmation('delete')} /></View>}
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Modal visible={Boolean(confirmation)} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmation(null); }}><View style={styles.overlay}><View style={styles.dialog}><Ionicons name={confirmation === 'delete' ? 'trash-outline' : 'calendar-outline'} size={30} color={confirmation === 'delete' ? colors.danger : colors.primary} /><Text style={styles.title}>{dialog?.[0]}</Text><Text style={styles.body}>{dialog?.[1]}</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<GradientButton disabled={busy} label={busy ? 'Đang xử lý...' : 'Xác nhận'} onPress={confirm} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setConfirmation(null); setError(''); }} style={styles.cancel}><Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Để sau</Text></Pressable></View></View></Modal>
    <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{row && <CreateActivityScreen key={row.id} initialActivity={row} onCancel={() => setEditing(false)} onCreated={() => { setEditing(false); void refresh(); }} />}</SafeAreaView></Modal>
  </View>;
}

function ManagementRow({ icon, title, detail, onPress, destructive, disabled }: { icon: Icon; title: string; detail: string; onPress: () => void; destructive?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && { opacity: 0.5 }]}><View style={[styles.actionIcon, destructive && { backgroundColor: colors.matchSoft }]}><Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.primary} /></View><View style={{ flex: 1, gap: 5 }}><Text style={[styles.sectionTitle, destructive && { color: colors.danger }]}>{title}</Text>{detail ? <Text style={styles.muted}>{detail}</Text> : null}</View><Ionicons name="chevron-forward" color={colors.textMuted} size={18} /></Pressable>;
}

export function ManagedActivityThumbnail({ activity, selected, onPress }: { activity: Activity; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.thumbnail, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}><Image source={activity.image} style={styles.thumbnailImage} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={styles.sectionTitle}>{activity.title}</Text><Text style={styles.muted}>{activity.members} thành viên{activity.isBusinessManager ? ' · Staff' : ''}</Text></View>{selected && <Ionicons name="checkmark-circle" color={colors.primary} size={20} />}</Pressable>;
}

const styles = StyleSheet.create({
  panel: { gap: 18 },
  roleBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#E1D8F4' },
  roleBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.primary },
  overview: { padding: 20, gap: 16, backgroundColor: colors.primarySoft, borderRadius: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  eyebrow: { flex: 1, color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 29 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 7 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  count: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.primarySoft },
  countText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  memberName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  smallBtnPrimary: { backgroundColor: colors.primary },
  smallBtnSecondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  smallBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  attendanceItem: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  attendancePills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center' },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pillTextActive: { color: colors.primary, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 64 },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  error: { padding: 12, color: colors.danger, backgroundColor: colors.matchSoft, borderRadius: 12 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19152B66', padding: 24 },
  dialog: { width: '100%', maxWidth: 430, padding: 24, gap: 18, borderRadius: 26, backgroundColor: colors.surface },
  cancel: { alignItems: 'center', padding: 10 },
  thumbnail: { width: 265, flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center' },
  thumbnailImage: { width: 52, height: 64, borderRadius: 12 },
});
