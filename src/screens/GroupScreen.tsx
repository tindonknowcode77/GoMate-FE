import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityPlanPanel } from '../components/ActivityPlanPanel';
import { ActivityManagementPanel } from '../components/ActivityManagementPanel';
import { ChatHeaderActions } from '../components/ChatHeaderActions';
import { SharedChatLibrary } from '../components/ChatContent';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { Activity } from '../data/activities';
import { MembersPanel } from './MembershipViews';
import { ChatScreen } from './ChatScreen';
import { createConversation } from '../services/chatService';
import { getActivity, listRequests, toActivity } from '../services/activityApi';
import { getActivityPaymentInfo, ActivityPaymentInfo } from '../services/paymentService';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';
import { getSession } from '../services/api';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';

type GroupTab = 'chat' | 'plan' | 'members' | 'manage';
type Props = { activity: Activity; onBack: () => void; onStart: (activity: Activity) => void; onLeft: () => void; initialTab?: GroupTab };
const tabs = [
  { id: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline' },
  { id: 'plan', label: 'Kế hoạch', icon: 'calendar-outline' },
  { id: 'members', label: 'Thành viên', icon: 'people-outline' },
  { id: 'manage', label: 'Quản lý', icon: 'options-outline' },
] as const;

export function GroupScreen({ activity, onBack, onStart, onLeft, initialTab = 'chat' }: Props) {
  const [tab, setTab] = useState<GroupTab>(initialTab);
  const [sharedConversationId, setSharedConversationId] = useState(''), [chatRefresh, setChatRefresh] = useState(0), [headerError, setHeaderError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<ActivityPaymentInfo | null>(null);
  const loadPayment = useCallback(() => {
    if (activity.organizerType === 'business' || activity.business?.depositAmount) {
      void getActivityPaymentInfo(activity.id).then(setPaymentInfo).catch(() => { });
    }
  }, [activity.id, activity.organizerType, activity.business?.depositAmount]);
  useEffect(() => { loadPayment(); }, [loadPayment]);
  const load = useCallback(() => getActivity(activity.id), [activity.id]);
  const remote = useRemote(load, null);
  const reload = remote.reload;
  useEffect(() => { const timer = setInterval(() => void reload(), 10000); return () => clearInterval(timer); }, [reload]);
  const current = remote.data ? toActivity(remote.data) : activity;
  const isHost = current.hostId === getSession()?.user.id || Boolean(current.isBusinessManager);
  const isOfficial = current.organizerType === 'business';
  const loadPending = useCallback(() => isHost ? listRequests(activity.id) : Promise.resolve([]), [activity.id, isHost]);
  const pendingRequests = useRemote(loadPending, []);
  const activeTab = tab === 'manage' && !isHost ? 'chat' : tab;
  const noticeTitle = current.backendStatus === 'cancelled' ? 'Hoạt động đã hủy' : current.backendStatus === 'expired' ? 'Hoạt động đã hết hạn' : current.backendStatus === 'completed' ? 'Hoạt động đã kết thúc' : current.backendStatus === 'in-progress' ? 'Hoạt động đã bắt đầu' : remote.data?.scheduleConfirmedAt ? 'Host đã chốt lịch đi' : 'Nhóm đang lên kế hoạch';
  const noticeBody = current.backendStatus === 'completed' ? 'Xem tổng kết trong mục Kế hoạch.' : remote.data?.scheduleConfirmedAt && current.backendStatus === 'published' ? `${current.time} · ${current.meetingPoint || current.location}` : '';
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={onBack}><Ionicons name="chevron-back" size={27} color={colors.text} /></Pressable><Image source={current.image} style={styles.avatar} /><View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={styles.title}>{current.title}</Text><Text style={styles.subtitle}>{current.members} thành viên · {current.backendStatus === 'cancelled' ? 'Đã hủy' : current.backendStatus === 'expired' ? 'Đã hết hạn' : current.backendStatus === 'completed' ? 'Đã kết thúc' : current.backendStatus === 'in-progress' ? 'Đang diễn ra' : remote.data?.scheduleConfirmedAt ? 'Đã chốt lịch đi' : 'Đang lên kế hoạch'}</Text></View><ChatHeaderActions sharePath={`/app/home/activityDetail/${activity.id}`} onShared={() => { setHeaderError(''); void createConversation({ type: 'group', activityId: activity.id }).then(row => setSharedConversationId(row.id)).catch(reason => setHeaderError(reason.message)); }} onRefresh={() => { void remote.reload(); setChatRefresh(value => value + 1); }} onPlan={() => setTab('plan')} onMembers={() => setTab('members')} onManage={isHost ? () => setTab('manage') : undefined} /></View>
    {isOfficial && <View style={styles.businessCard}>
      <View style={styles.businessHeading}><Ionicons name="shield-checkmark" size={15} color={colors.primary} /><Text numberOfLines={1} style={styles.businessTitle}>Nhóm doanh nghiệp{current.business?.depositAmount ? ` · Cọc ${current.business.depositAmount.toLocaleString('vi-VN')} đ/người` : ''}</Text>{!isHost && Boolean(current.business?.depositAmount) && (paymentInfo?.isPaid ? <View style={styles.businessPaid}><Ionicons name="checkmark-circle" size={12} color="#16704A" /><Text style={styles.businessPaidText}>Đã đóng cọc</Text></View> : ['published', 'in-progress'].includes(current.backendStatus || '') ? <Pressable accessibilityRole="button" onPress={() => setShowPaymentModal(true)} style={({ pressed }) => [styles.businessPayButton, pressed && { opacity: 0.75 }]}><Ionicons name="qr-code-outline" size={13} color="#FFF" /><Text style={styles.businessPayText}>Quét VietQR cọc</Text></Pressable> : null)}{isHost && <Pressable accessibilityRole="button" accessibilityLabel="Quản lý doanh nghiệp" onPress={() => setTab('manage')} style={({ pressed }) => [styles.businessManageButton, pressed && styles.businessManagePressed]}><Text numberOfLines={1} style={styles.businessManageText}>Quản lý doanh nghiệp</Text><Ionicons name="arrow-forward" size={13} color={colors.primary} /></Pressable>}</View>
      {current.isBusinessManager ? <View style={styles.businessDetail}><Ionicons name="person-circle-outline" size={14} color={colors.primary} /><Text numberOfLines={1} style={styles.staffRoleLine}>Bạn là Nhân sự quản lý (Staff) của nhóm này · Điều hành nhóm tại tab Quản lý</Text></View> : isHost ? <View style={styles.businessDetail}><Ionicons name="business-outline" size={14} color={colors.primary} /><Text numberOfLines={1} style={styles.staffRoleLine}>Bạn là Chủ doanh nghiệp của nhóm này · Điều hành nhóm tại tab Quản lý</Text></View> : current.business?.offer ? <View style={styles.businessDetail}><Ionicons name="gift-outline" size={14} color={colors.textMuted} /><Text numberOfLines={1} style={styles.businessDetailText}>{current.business.offer}</Text></View> : null}
    </View>}
    <View style={styles.tabBar}>{tabs.filter(item => item.id !== 'manage' || isHost).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: activeTab === item.id }} accessibilityLabel={item.label} onPress={() => setTab(item.id)} style={[styles.tab, activeTab === item.id && styles.activeTab]}><Ionicons name={item.icon} size={19} color={activeTab === item.id ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, activeTab === item.id && { color: colors.primary }]}>{item.label}{(item.id === 'members' || item.id === 'manage') && pendingRequests.data.length > 0 ? ` (${pendingRequests.data.length})` : ''}</Text></Pressable>)}</View>
    {activeTab === 'chat' ? <><View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><Text accessibilityLiveRegion="polite" style={styles.noticeTitle}>{noticeTitle}</Text>{noticeBody ? <Text style={styles.noticeBody}>· {noticeBody}</Text> : null}</View></View><ActivityChat activityId={activity.id} onBack={onBack} refreshKey={chatRefresh} /></> : <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {activeTab === 'plan' && <ActivityPlanPanel activityId={activity.id} onChanged={remote.setData} onManage={isHost ? () => setTab('manage') : undefined} onProgress={row => onStart(toActivity(row))} />}
      {activeTab === 'members' && <MembersPanel activity={current} onLeft={onLeft} onChanged={() => { void remote.reload(); void pendingRequests.reload(true); }} />}
      {activeTab === 'manage' && isHost && <ActivityManagementPanel activityId={activity.id} onPlan={() => setTab('plan')} onMembers={() => setTab('members')} onProgress={onStart} onDeleted={onLeft} onChanged={fresh => { remote.setData(fresh); void pendingRequests.reload(true); }} />}
    </ScrollView>}
    {remote.error ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 10 }}>{remote.error}</Text> : null}
    {headerError ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 10 }}>{headerError}</Text> : null}
    {sharedConversationId ? <SharedChatLibrary conversationId={sharedConversationId} onClose={() => setSharedConversationId('')} /> : null}
    <VietQrPaymentModal
      visible={showPaymentModal}
      activityId={activity.id}
      activityTitle={current.title}
      amount={current.business?.depositAmount}
      type="activity_deposit"
      onClose={() => setShowPaymentModal(false)}
      onSuccess={() => {
        setShowPaymentModal(false);
        void remote.reload();
        loadPayment();
      }}
    />
  </SafeAreaView>;
}

function ActivityChat({ activityId, onBack, refreshKey }: { activityId: string; onBack: () => void; refreshKey: number }) {
  const load = useCallback(() => createConversation({ type: 'group', activityId }), [activityId]);
  const remote = useRemote(load, null);
  if (!remote.data || remote.error) return <View style={{ flex: 1, justifyContent: 'center' }}><RemoteState {...remote} onRetry={remote.reload} /></View>;
  return <ChatScreen key={remote.data.id} embedded conversation={remote.data} onBack={onBack} refreshKey={refreshKey} />;
}

export function GroupChatEntry({ activityId, ...props }: Omit<Props, 'activity'> & { activityId: string }) {
  const load = useCallback(() => getActivity(activityId), [activityId]);
  const remote = useRemote(load, null);
  if (!remote.data || remote.error) return <SafeAreaView style={styles.safe}><Pressable onPress={props.onBack} style={{ padding: 20 }}><Text style={{ color: colors.primary }}>Quay lại</Text></Pressable><RemoteState {...remote} onRetry={remote.reload} /></SafeAreaView>;
  return <GroupScreen {...props} activity={toActivity(remote.data)} />;
}

const styles = StyleSheet.create({
  businessCard: { marginHorizontal: 14, marginTop: 2, marginBottom: 8, paddingVertical: 9, paddingHorizontal: 12, gap: 5, borderWidth: 1, borderColor: '#E9E5F1', borderRadius: 12, backgroundColor: colors.surface },
  businessHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 }, businessIcon: { width: 24, height: 24, borderRadius: 7, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, businessTitle: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', color: colors.text },
  businessDetail: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }, businessDetailText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, color: colors.textSecondary }, staffRoleLine: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.primary }, businessAmount: { fontWeight: '700', color: colors.text },
  businessPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  businessPaid: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#E7F5ED' }, businessPaidText: { fontSize: 11, fontWeight: '600', color: '#16704A' },
  businessPayButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: colors.primary }, businessPayText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  businessManageButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: '#E1D8F4', backgroundColor: '#F7F4FD' }, businessManageText: { fontSize: 11, fontWeight: '700', color: colors.primary }, businessManagePressed: { backgroundColor: '#EEE7FA', borderColor: colors.primary },
  notice: { flexDirection: 'row', gap: 9, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.primarySoft }, noticeTitle: { color: colors.primary, fontSize: 12, fontWeight: '700', lineHeight: 18 }, noticeBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface }, avatar: { width: 43, height: 43, borderRadius: 16 }, title: { fontSize: 17, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 12, color: colors.textMuted }, tabBar: { flexDirection: 'row', paddingHorizontal: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, tab: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 5, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: colors.primary }, tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted }, page: { padding: 18, paddingBottom: 36, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
});
