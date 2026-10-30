import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { apiBaseUrl, getSession } from '../services/api';
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
  const noticeBody = current.backendStatus === 'cancelled' ? 'Hoạt động đã bị hủy bởi người tổ chức.' : current.backendStatus === 'expired' ? 'Hoạt động chưa bắt đầu trước khi hết lịch; không mở đánh giá.' : current.backendStatus === 'completed' ? 'Xem tổng kết và đánh giá trong mục Kế hoạch.' : current.backendStatus === 'in-progress' ? 'Host đang điều hành và điểm danh cho nhóm.' : remote.data?.scheduleConfirmedAt ? `${current.time} · ${current.meetingPoint || current.location}` : '';
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={onBack}><Ionicons name="chevron-back" size={27} color={colors.text} /></Pressable><Image source={current.image} style={styles.avatar} /><View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={styles.title}>{current.title}</Text><Text style={styles.subtitle}>{current.members} thành viên · {current.backendStatus === 'cancelled' ? 'Đã hủy' : current.backendStatus === 'expired' ? 'Đã hết hạn' : current.backendStatus === 'completed' ? 'Đã kết thúc' : current.backendStatus === 'in-progress' ? 'Đang diễn ra' : remote.data?.scheduleConfirmedAt ? 'Đã chốt lịch đi' : 'Đang lên kế hoạch'}</Text></View><ChatHeaderActions sharePath={`/app/home/activityDetail/${activity.id}`} onShared={() => { setHeaderError(''); void createConversation({ type: 'group', activityId: activity.id }).then(row => setSharedConversationId(row.id)).catch(reason => setHeaderError(reason.message)); }} onRefresh={() => { void remote.reload(); setChatRefresh(value => value + 1); }} onPlan={() => setTab('plan')} onMembers={() => setTab('members')} onManage={isHost ? () => setTab('manage') : undefined} /></View>
    {isOfficial && <View style={[styles.notice, { backgroundColor: '#EEF2FF', justifyContent: 'space-between', alignItems: 'center' }]}><View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}><Text style={[styles.noticeTitle, { color: colors.primary }]}>✓ Nhóm sự kiện doanh nghiệp</Text>{current.business?.offer ? <Text style={styles.noticeBody}>· Ưu đãi: {current.business.offer}</Text> : null}{current.business?.depositAmount ? <Text style={styles.noticeBody}>· Cọc: {current.business.depositAmount.toLocaleString('vi-VN')}đ/người</Text> : null}</View>{(current.isBusinessManager || current.hostId === getSession()?.user.id) && <Pressable accessibilityRole="button" onPress={() => { if (Platform.OS === 'web') window.location.assign('/portal'); else void Linking.openURL(apiBaseUrl.replace(/\/api\/?$/, '') + '/portal'); }}><Text style={[styles.noticeTitle, { textDecorationLine: 'underline' }]}>Mở trang quản lý doanh nghiệp</Text></Pressable>}</View>}
    <View style={styles.tabBar}>{tabs.filter(item => item.id !== 'manage' || isHost).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: activeTab === item.id }} accessibilityLabel={item.label} onPress={() => setTab(item.id)} style={[styles.tab, activeTab === item.id && styles.activeTab]}><Ionicons name={item.icon} size={19} color={activeTab === item.id ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, activeTab === item.id && { color: colors.primary }]}>{item.label}{item.id === 'members' && pendingRequests.data.length > 0 ? ` (${pendingRequests.data.length})` : ''}</Text></Pressable>)}</View>
    {activeTab === 'chat' ? <><View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}><Text accessibilityLiveRegion="polite" style={styles.noticeTitle}>{noticeTitle}</Text>{noticeBody ? <Text style={styles.noticeBody}>· {noticeBody}</Text> : null}</View></View><ActivityChat activityId={activity.id} onBack={onBack} refreshKey={chatRefresh} /></> : <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {activeTab === 'plan' && <ActivityPlanPanel activityId={activity.id} onChanged={remote.setData} onManage={isHost ? () => setTab('manage') : undefined} onProgress={row => onStart(toActivity(row))} />}
      {activeTab === 'members' && <MembersPanel activity={current} onLeft={onLeft} onChanged={() => { void remote.reload(); void pendingRequests.reload(true); }} />}
      {activeTab === 'manage' && isHost && <ActivityManagementPanel activityId={activity.id} onPlan={() => setTab('plan')} onProgress={onStart} onDeleted={onLeft} onChanged={remote.setData} />}
    </ScrollView>}
    {remote.error ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 10 }}>{remote.error}</Text> : null}
    {headerError ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 10 }}>{headerError}</Text> : null}
    {sharedConversationId ? <SharedChatLibrary conversationId={sharedConversationId} onClose={() => setSharedConversationId('')} /> : null}
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
  notice: { flexDirection: 'row', gap: 9, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.primarySoft }, noticeTitle: { color: colors.primary, fontSize: 12, fontWeight: '700', lineHeight: 18 }, noticeBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface }, avatar: { width: 43, height: 43, borderRadius: 16 }, title: { fontSize: 17, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 12, color: colors.textMuted }, tabBar: { flexDirection: 'row', paddingHorizontal: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, tab: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 5, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' }, activeTab: { borderBottomColor: colors.primary }, tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted }, page: { padding: 18, paddingBottom: 36, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
});
