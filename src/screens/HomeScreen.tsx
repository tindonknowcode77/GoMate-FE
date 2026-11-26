import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader, HomeEmptyState, NextActivityCard, ActivityScheduleItem } from '../components/home/HomeComponents';
import { QrScannerModal } from '../components/QrScannerModal';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { Activity } from '../data/activities';
import { listJoined, listOwned, toActivity } from '../services/activityApi';
import { listNotificationPage } from '../services/communityService';
import { useProfile } from '../services/ProfileContext';
import { setCached } from '../services/remoteCache';
import { useLiveRefresh } from '../services/useLiveRefresh';
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
  const [qrOpen, setQrOpen] = useState(false);
  const loader = useCallback(async () => {
    const [joined, owned, notices] = await Promise.all([listJoined(), listOwned(), listNotificationPage().then(page => page.items).catch(() => [])]);
    setCached('my-activities', { joined, owned }, { staleTimeMs: 20000, tags: ['my-activities', 'activities'] });
    const items = [...joined, ...owned].filter(row => !['completed', 'expired', 'cancelled'].includes(row.status || '') && (!row.endsAt || new Date(row.endsAt).getTime() > Date.now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(row => toActivity(row, joined.some(item => item.id === row.id && !item.isBusinessManager) ? 'approved' : undefined));
    return { items, notices };
  }, []);
  const remote = useRemote(loader, { items: [], notices: [] }, true, {
    cacheKey: 'home',
    staleTimeMs: 20000,
    tags: ['home', 'activities', 'my-activities', 'notifications'],
  });
  useLiveRefresh(remote.reload);
  const activities = remote.data.items;
  const next = activities[0];
  const isStaff = Boolean(profile?.isStaff) || activities.some(item => item.isBusinessManager);
  const staffNotice = remote.data.notices.find(item => !item.readAt && (/phân công|nhân sự/i.test(item.title) || item.type === 'business-update')) ?? remote.data.notices.find(item => !item.readAt);
  return <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
    <View style={styles.page}>
      <HomeHeader activityCount={activities.length} onCalendarPress={onMyActivitiesPress} onNotificationsPress={onNotificationsPress} onProfilePress={onProfilePress} onScanQrPress={() => setQrOpen(true)} />
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
      <RemoteState loading={remote.loading && !activities.length} error={activities.length ? '' : remote.error} onRetry={remote.reload} />
      {(!remote.loading || activities.length > 0) && (!remote.error || activities.length > 0) && (next ? <NextActivityCard activity={next} onGroup={() => onOpenGroup(next)} onPlan={() => onOpenActivity(next)} /> : <HomeEmptyState onMatch={isStaff ? onMyActivitiesPress : onMatchPress} />)}
      <View style={styles.quickGrid}>
        <Pressable accessibilityRole="button" onPress={onMyActivitiesPress} style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.quickCopy}>
            <Text numberOfLines={1} style={styles.quickTitle}>{isStaff ? 'Nhóm phụ trách' : 'Hoạt động của tôi'}</Text>
            <Text numberOfLines={1} style={styles.quickSub}>{activities.length > 0 ? `${activities.length} sắp tới` : 'Xem lịch trình'}</Text>
          </View>
        </Pressable>
        {!isStaff && (
          <Pressable accessibilityRole="button" onPress={onPendingPress} style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}>
            <View style={[styles.quickIcon, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="hourglass-outline" size={20} color={colors.warningText} />
            </View>
            <View style={styles.quickCopy}>
              <Text numberOfLines={1} style={styles.quickTitle}>Chờ duyệt</Text>
              <Text numberOfLines={1} style={styles.quickSub}>Yêu cầu đã gửi</Text>
            </View>
          </Pressable>
        )}
      </View>
      {activities.length > 1 && (
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Lịch trình tiếp theo</Text>
          <Pressable accessibilityRole="button" onPress={onMyActivitiesPress} style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>Tất cả</Text>
          </Pressable>
        </View>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>{(!remote.loading || activities.length > 0) && (!remote.error || activities.length > 0) && activities.slice(1).map(item => <View key={item.id} style={{ width: wide ? '48%' : '100%' }}><ActivityScheduleItem key={item.id} activity={item} onPress={() => onOpenGroup(item)} status={item.isBusinessManager ? 'Phụ trách nhóm' : item.requestStatus === 'approved' ? 'Đã tham gia' : 'Bạn tổ chức'} /></View>)}</View>
    </View>
    <QrScannerModal
      visible={qrOpen}
      onClose={() => setQrOpen(false)}
      onOpenGroup={onOpenGroup}
      onCheckedIn={() => void remote.reload(true, true)}
    />
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
  quickGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 11, paddingHorizontal: 13, paddingVertical: 14 },
  quickCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  quickIcon: { alignItems: 'center', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  quickCopy: { flex: 1, gap: 2 },
  quickTitle: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  quickSub: { color: colors.textMuted, fontSize: 11.5 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginTop: 20 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionPill: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  sectionPillText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
