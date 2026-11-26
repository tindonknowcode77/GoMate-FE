import { useFeedbackState } from '../services/feedback';
import { JoinRequestsPanel } from '../components/JoinRequestsPanel';
import { GroupCompanions } from '../components/CompanionCards';
import { AddActivityFriends } from '../components/AddActivityFriends';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { UserAvatar } from '../components/UserAvatar';
import { Activity } from '../data/activities';
import { getSession } from '../services/api';
import { getActivity, Member, ActivityDto, cancelRequest, leaveActivity, listJoined, listMembers, listMyRequests, listOwned, removeMember, requestLateLeave, toActivity } from '../services/activityApi';
import { buildGroupJoinQr, qrImageUrl } from '../services/qrCode';
import { getCached, setCached } from '../services/remoteCache';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';
import { MemberProfileModal } from '../components/MemberProfileModal';

function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFeedbackState('');
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Yêu cầu thất bại'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { busy, error, run };
}

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

function ActivityRow({ activity, onPress, children }: { activity: Activity; onPress: () => void; children?: React.ReactNode }) {
  return <View style={styles.card}><Pressable onPress={onPress} style={styles.row}>
    <Image source={activity.image} style={styles.image} /><View style={styles.copy}><Text style={styles.title}>{activity.title}</Text><Text>{activity.time}</Text><Text>{activity.location}</Text>{activity.isBusinessManager && <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Nhân sự quản lý · Được phân công</Text>}<Text>Host: {activity.host} · {activity.members}</Text></View>
  </Pressable>{children}</View>;
}

export function PendingActivitiesScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (activity: Activity) => void }) {
  const loader = useCallback(async () => {
    const [pending, conflicts] = await Promise.all([listMyRequests('pending'), listMyRequests('cancelled_conflict').catch(() => [])]);
    return [...pending, ...conflicts];
  }, []);
  const remote = useRemote(loader, [], true, {
    cacheKey: 'pending-activities',
    staleTimeMs: 15000,
    tags: ['my-requests', 'activities'],
  });
  useLiveRefresh(remote.reload);
  const action = useAction();
  return <SafeAreaView style={styles.safe}><ScreenHeader onBack={onBack} title="Yêu cầu tham gia"  />
    <ScrollView refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />} contentContainerStyle={styles.page}>
      <RemoteState loading={remote.loading && !remote.data.length} error={remote.data.length ? '' : remote.error} empty={!remote.loading && !remote.data.length} emptyMessage="Hiện chưa có yêu cầu nào." onRetry={remote.reload} />
      {action.error ? <Text style={{ color: colors.danger }}>{action.error}</Text> : null}
      {remote.data.map(request => request.activity && <ActivityRow key={request.id} activity={toActivity(request.activity, request.status)} onPress={() => onOpen(toActivity(request.activity!, request.status))}>
        {request.status === 'cancelled_conflict' ? (
          <View style={{ backgroundColor: colors.warningSoft, borderRadius: 10, padding: 10 }}>
            <Text style={{ color: colors.warningText, fontSize: 12, fontWeight: '700' }}>
              Đã vô hiệu hóa do trùng khung giờ{(request as { conflictActivityTitle?: string }).conflictActivityTitle ? ` với "${(request as { conflictActivityTitle?: string }).conflictActivityTitle}"` : ''}
            </Text>
          </View>
        ) : (
          <Button disabled={action.busy} label="Hủy yêu cầu" onPress={() => void action.run(async () => { await cancelRequest(request.activityId!); await remote.reload(); })} />
        )}
      </ActivityRow>)}
    </ScrollView></SafeAreaView>;
}

export function MyActivitiesScreen({ onBack, onOpenGroup, onOpenPending }: { onBack: () => void; onOpenGroup: (activity: Activity) => void; onOpenPending?: () => void }) {
  const [now] = useState(Date.now);
  const [tab, setTab] = useState<'joined' | 'owned' | 'past'>('joined');
  const loader = useCallback(async () => { const [joined, owned] = await Promise.all([listJoined(), listOwned()]); return { joined, owned }; }, []);
  const remote = useRemote(loader, { joined: [], owned: [] }, true, {
    cacheKey: 'my-activities',
    staleTimeMs: 20000,
    tags: ['my-activities', 'activities'],
  });
  useLiveRefresh(remote.reload);
  const isPast = (item: typeof remote.data.joined[number]) => ['completed', 'expired', 'cancelled'].includes(item.status || '') || Boolean(item.endsAt && new Date(item.endsAt).getTime() <= now);
  const rows = tab === 'past' ? [...remote.data.joined, ...remote.data.owned].filter(isPast) : remote.data[tab].filter(item => !isPast(item));
  return <SafeAreaView style={styles.safe}><ScreenHeader onBack={onBack} title="Hoạt động của tôi" />
    <ScrollView refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />} contentContainerStyle={styles.page}>
      <View style={styles.segmentedBar}>{([['joined', 'Đã tham gia'], ['owned', 'Tôi tổ chức'], ['past', 'Đã qua']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={[styles.segmentPill, tab === key && styles.segmentPillActive]}><Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>{label}</Text></Pressable>)}</View>
      {onOpenPending && (
        <Pressable accessibilityRole="button" onPress={onOpenPending} style={styles.pendingBanner}>
          <View style={styles.pendingBannerIcon}><Ionicons name="time-outline" size={18} color={colors.primary} /></View>
          <Text style={styles.pendingBannerText}>Yêu cầu đang chờ duyệt</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      <RemoteState loading={remote.loading && !rows.length} error={rows.length ? '' : remote.error} onRetry={remote.reload} />
      {!remote.loading && !remote.error && !rows.length && (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={32} color={colors.primary} /></View>
          <Text style={styles.emptyTitle}>{tab === 'joined' ? 'Chưa tham gia hoạt động nào' : tab === 'owned' ? 'Bạn chưa tổ chức hoạt động nào' : 'Chưa có hoạt động đã qua'}</Text>
          <Text style={styles.emptySub}>{tab === 'joined' ? 'Khám phá Match hoặc quét mã QR nhóm để tham gia cùng mọi người.' : tab === 'owned' ? 'Nhấn nút + ở thanh dưới để tạo hoạt động mới.' : 'Các hoạt động đã kết thúc sẽ được lưu lại tại đây.'}</Text>
        </View>
      )}
      {rows.map(row => <ActivityRow key={row.id} activity={toActivity(row)} onPress={() => onOpenGroup(toActivity(row))} />)}
    </ScrollView></SafeAreaView>;
}

export function MembersPanel({ activity, onLeft, onChanged }: { activity: Activity; onLeft: () => void; onChanged?: () => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const loader = useCallback(async () => {
    const cachedActivity = getCached<ActivityDto>(`activity:${activity.id}`);
    const [members, latest] = await Promise.all([
      listMembers(activity.id),
      cachedActivity?.fresh ? Promise.resolve(cachedActivity.value) : getActivity(activity.id).then(row => {
        setCached(`activity:${activity.id}`, row, { staleTimeMs: 20000, tags: ['activities', `activity:${activity.id}`] });
        return row;
      }),
    ]);
    return { members, latest };
  }, [activity.id]);
  const snapshot = useRemote<{ members: Member[]; latest: ActivityDto | null }>(loader, { members: [], latest: null }, true, {
    cacheKey: `members:${activity.id}`,
    staleTimeMs: 20000,
    tags: [`members:${activity.id}`, `activity:${activity.id}`],
  });
  const remote = { ...snapshot, data: snapshot.data.members };
  const reload = snapshot.reload;
  useLiveRefresh(reload);

  const action = useAction();
  const isHost = activity.hostId === getSession()?.user.id || Boolean(activity.isBusinessManager);
  const latest = snapshot.data.latest;
  const canChange = (latest?.status ?? activity.backendStatus) === 'published' && Boolean((latest?.startsAt || activity.startsAt) && new Date(latest?.startsAt || activity.startsAt!).getTime() > now);
  const [target, setTarget] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [inviteQrOpen, setInviteQrOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveNotice, setLeaveNotice] = useState('');
  const [isWithin6Hours, setIsWithin6Hours] = useState(false);

  const openLeaveConfirm = () => {
    setLeaveNotice('');
    setLeaveReason('');
    const startRaw = latest?.startsAt || activity.startsAt;
    const startTime = startRaw ? new Date(startRaw).getTime() : NaN;
    setIsWithin6Hours(Number.isFinite(startTime) && startTime - Date.now() <= 6 * 3600000);
    setTarget('me');
  };
  return <View>{isHost && <JoinRequestsPanel activityId={activity.id} enabled={canChange} full={Boolean(latest && latest.memberCount >= latest.maxParticipants)} onChanged={() => { void remote.reload(true, true); onChanged?.(); }} />}
    <View style={styles.membersHeader}>
      <Text style={styles.title}>Thành viên ({remote.data.length})</Text>
      {canChange && (
        <Pressable accessibilityRole="button" accessibilityLabel="Tạo mã QR mời vào nhóm" onPress={() => setInviteQrOpen(true)} style={styles.inviteQrBtn}>
          <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
          <Text style={styles.inviteQrText}>Mã QR vào nhóm</Text>
        </Pressable>
      )}
    </View>
    {canChange && isHost && activity.organizerType !== 'business' && <AddActivityFriends activityId={activity.id} onAdded={() => void remote.reload(true, true)} />}
    <RemoteState loading={remote.loading && !remote.data.length} error={remote.data.length ? '' : remote.error} onRetry={remote.reload} />
    {action.error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{action.error}</Text> : null}
    {remote.data.map(member => <View key={member.userId} style={[styles.card, styles.row]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${member.name}`} style={[styles.row, { flex: 1 }]} onPress={() => setProfileId(member.userId)}>
        <UserAvatar uri={member.avatarUrl} name={member.name} size={46} borderColor={member.role === 'host' ? colors.primary : undefined} />
        <View style={styles.copy}>
          <Text style={styles.title}>{member.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text>{member.role === 'host' ? (activity.organizerType === 'business' ? 'Doanh nghiệp tổ chức' : 'Host') : member.role === 'staff' ? `Nhân sự quản lý (Staff)${member.title ? ' · ' + member.title : ''}` : 'Thành viên'}</Text>
            {member.role === 'staff' && <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.primarySoft }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Staff</Text></View>}
            {member.depositStatus && <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: member.depositStatus === 'paid' ? colors.successSoft : colors.warningSoft }}><Text style={{ fontSize: 11, fontWeight: '700', color: member.depositStatus === 'paid' ? colors.successText : colors.warningText }}>{member.depositStatus === 'paid' ? 'Đã cọc' : 'Chưa cọc'}</Text></View>}
          </View>
        </View>
      </Pressable>
      {canChange && isHost && member.role === 'member' && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${member.name}`} disabled={action.busy} onPress={() => setTarget(member.userId)} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>Xóa</Text></Pressable>}
    </View>)}
    {leaveNotice ? <View style={[styles.card, { borderColor: colors.successText }]}><Text style={{ color: colors.successText }}>{leaveNotice}</Text></View> : null}
    {canChange && !isHost && !activity.isBusinessManager && !remote.loading && !remote.error && <Button disabled={action.busy} label="Rời nhóm" onPress={openLeaveConfirm} />}
    <Modal transparent animationType="fade" visible={Boolean(target)} onRequestClose={() => setTarget(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 }}>
        <View style={[styles.card, { maxWidth: 420, width: '100%', alignSelf: 'center', marginBottom: 0 }]}>
          <Text style={styles.title}>{target === 'me' ? (isWithin6Hours ? 'Rời nhóm sát giờ (trong vòng 6 tiếng)' : 'Bạn muốn rời nhóm?') : `Xóa ${remote.data.find(member => member.userId === target)?.name || 'thành viên'} khỏi nhóm?`}</Text>
          {target === 'me' && !isWithin6Hours && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Hiện còn hơn 6 tiếng trước giờ bắt đầu. Nếu bạn đã đóng cọc, hệ thống sẽ bảo vệ hoàn 100% tiền cọc trong Ví.</Text>}
          {target === 'me' && isWithin6Hours && <>
            <Text style={{ color: colors.warningText, fontSize: 13 }}>Trong vòng 6 tiếng trước giờ hoạt động, bạn cần nhập lý do. Bạn có thể gửi yêu cầu chờ Doanh nghiệp duyệt (hoàn 100% cọc) hoặc rời ngay (mất 20% tiền cọc, hoàn 80%).</Text>
            <TextInput
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Nhập lý do rời nhóm (tối thiểu 5 ký tự)..."
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, backgroundColor: colors.background }}
              multiline
            />
          </>}
          <View style={styles.tabs}>
            <Button disabled={action.busy} label="Hủy" onPress={() => setTarget(null)} />
            {target === 'me' && isWithin6Hours ? <>
              <Button disabled={action.busy || leaveReason.trim().length < 5} label="Gửi duyệt (Hoàn 100%)" onPress={() => void action.run(async () => {
                await requestLateLeave(activity.id, leaveReason.trim());
                setTarget(null);
                setLeaveNotice('Đã gửi yêu cầu rời nhóm kèm lý do để Doanh nghiệp xét duyệt hoàn 100% cọc.');
              })} />
              <Button disabled={action.busy || leaveReason.trim().length < 5} label="Rời ngay (Mất 20% cọc)" onPress={() => void action.run(async () => {
                await leaveActivity(activity.id, { reason: leaveReason.trim(), acceptPenalty: true });
                setTarget(null);
                onLeft();
              })} />
            </> : (
              <Button disabled={action.busy} label={target === 'me' ? 'Xác nhận rời nhóm' : 'Xóa'} onPress={() => void action.run(async () => {
                if (target === 'me') { await leaveActivity(activity.id); onLeft(); }
                else if (target) { await removeMember(activity.id, target); await remote.reload(true); onChanged?.(); }
                setTarget(null);
              })} />
            )}
          </View>
        </View>
      </View>
    </Modal>
    {profileId && <MemberProfileModal userId={profileId} onClose={() => setProfileId(null)} />}
    <Modal transparent animationType="fade" visible={inviteQrOpen} onRequestClose={() => setInviteQrOpen(false)}>
      <View style={styles.qrBackdrop}>
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>Mã QR tham gia nhóm</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng mã QR nhóm" onPress={() => setInviteQrOpen(false)} style={styles.qrClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <Text numberOfLines={2} style={styles.qrSubtitle}>{activity.title}</Text>
          <View style={styles.qrFrame}>
            <Image source={{ uri: qrImageUrl(buildGroupJoinQr(activity.id), 250) }} style={styles.qrImg} resizeMode="contain" />
          </View>
          <Text style={styles.qrHint}>Người dùng khác quét mã này từ màn hình chính để gửi yêu cầu tham gia nhóm cho Host duyệt.</Text>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { alignSelf: 'center', width: '100%', maxWidth: layout.maxWidth, padding: 18, gap: 12, paddingBottom: 30 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 14, gap: 8, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, image: { width: 80, height: 90, borderRadius: 12 }, copy: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { borderColor: colors.primary, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }, buttonText: { color: colors.primary, fontWeight: '700' },
  membersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  inviteQrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  inviteQrText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  qrBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', justifyContent: 'center', padding: 22 },
  qrCard: { backgroundColor: colors.surface, borderRadius: 26, padding: 22, gap: 14, maxWidth: 360, width: '100%', alignSelf: 'center', alignItems: 'center' },
  qrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  qrTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  qrClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  qrSubtitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  qrFrame: { padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  qrImg: { width: 220, height: 220, borderRadius: 10 },
  qrHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  segmentedBar: { flexDirection: 'row', gap: 8, backgroundColor: colors.surfaceMuted, padding: 5, borderRadius: 16 },
  segmentPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  segmentPillActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: colors.white },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13 },
  pendingBannerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pendingBannerText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 20, gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
