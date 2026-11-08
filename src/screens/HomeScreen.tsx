import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader, HomeEmptyState, NextActivityCard, ActivityScheduleItem } from '../components/home/HomeComponents';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { Activity } from '../data/activities';
import { listJoined, listOwned, toActivity } from '../services/activityApi';
import { listNotifications } from '../services/communityService';
import { useProfile } from '../services/ProfileContext';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';
type HomeScreenProps = {
  onMatchPress: () => void; onMyActivitiesPress: () => void; onNotificationsPress: () => void; onProfilePress: () => void;
  onPendingPress: () => void; onOpenActivity: (activity: Activity) => void; onOpenGroup: (activity: Activity) => void;
};
export function HomeScreen({ onMatchPress, onMyActivitiesPress, onNotificationsPress, onProfilePress, onPendingPress, onOpenActivity, onOpenGroup }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const { profile } = useProfile();
  const loader = useCallback(async () => {
    const [joined, owned, notices] = await Promise.all([listJoined(), listOwned(), listNotifications().catch(() => [])]);
    const items = [...joined, ...owned].filter(row => !['completed', 'expired', 'cancelled'].includes(row.status || '') && (!row.endsAt || new Date(row.endsAt).getTime() > Date.now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(row => toActivity(row, joined.some(item => item.id === row.id && !item.isBusinessManager) ? 'approved' : undefined));
    return { items, notices };
  }, []);
  const remote = useRemote(loader, { items: [], notices: [] });
  const activities = remote.data.items;
  const next = activities[0];
  const isStaff = Boolean(profile?.isStaff) || activities.some(item => item.isBusinessManager);
  const staffNotice = remote.data.notices.find(item => !item.readAt && (/phân công|nhân sự/i.test(item.title) || item.type === 'business-update')) ?? remote.data.notices.find(item => !item.readAt);
  return <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
    <View style={styles.page}>
      <HomeHeader activityCount={activities.length} onCalendarPress={onMyActivitiesPress} onNotificationsPress={onNotificationsPress} onProfilePress={onProfilePress} />
      {isStaff && (
        <Pressable accessibilityRole="button" onPress={onNotificationsPress} style={styles.staffBanner}>
          <View style={styles.staffBannerIcon}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={styles.staffBannerTitle}>{staffNotice ? staffNotice.title : 'Tài khoản Nhân sự doanh nghiệp (Staff)'}</Text>
            <Text numberOfLines={1} style={styles.staffBannerBody}>{staffNotice ? staffNotice.text : `Bạn được phân công quản lý ${activities.filter(item => item.isBusinessManager).length} nhóm sự kiện doanh nghiệp`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      )}
      <RemoteState {...remote} onRetry={remote.reload} />
      {!remote.loading && !remote.error && (next ? <NextActivityCard activity={next} onGroup={() => onOpenGroup(next)} onPlan={() => onOpenActivity(next)} /> : <HomeEmptyState onMatch={isStaff ? onMyActivitiesPress : onMatchPress} />)}
      {!isStaff && <Pressable onPress={onPendingPress} style={styles.sectionHeading}><Text style={styles.switchLink}>Yêu cầu đang chờ duyệt →</Text></Pressable>}
      <Pressable onPress={onMyActivitiesPress} style={styles.sectionHeading}><Text style={styles.sectionTitle}>{isStaff ? 'Nhóm được phân công →' : 'Hoạt động của tôi →'}</Text></Pressable>
      <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>{!remote.loading && !remote.error && activities.slice(1).map(item => <View key={item.id} style={{ width: wide ? '48%' : '100%' }}><ActivityScheduleItem key={item.id} activity={item} onPress={() => onOpenGroup(item)} status={item.isBusinessManager ? 'Phụ trách nhóm' : item.requestStatus === 'approved' ? 'Đã tham gia' : 'Bạn tổ chức'} /></View>)}</View>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 28 },
  emptyScroll: { flexGrow: 1, paddingBottom: 24 },
  page: { alignSelf: 'center', flex: 1, maxWidth: layout.maxWidth, paddingHorizontal: 16, width: '100%' },
  staffBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#E1D8F4' },
  staffBannerIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  staffBannerTitle: { fontSize: 13, fontWeight: '700', color: colors.primary },
  staffBannerBody: { fontSize: 12, color: colors.textSecondary },
  calendarHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  pageTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  switchLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, marginTop: 24 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
