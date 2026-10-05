import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav, MainTab } from '../components/BottomNav';
import { Activity, activities } from '../data/activities';
import { currentUserProfile, PersonProfile } from '../data/people';
import { colors } from '../theme';
import { ActivityDetailScreen } from './ActivityDetailScreen';
import { ActivityFilters, FilterScreen } from './FilterScreen';
import { ActivityProgressScreen } from './ActivityProgressScreen';
import { ActivitySummaryScreen } from './ActivitySummaryScreen';
import { ChatScreen } from './ChatScreen';
import { CreateActivityScreen } from './CreateActivityScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { GroupScreen } from './GroupScreen';
import { HomeScreen } from './HomeScreen';
import { HostMembersScreen } from './HostMembersScreen';
import { ManageActivitiesScreen } from './ManageActivitiesScreen';
import { MatchHubScreen } from './MatchHubScreen';
import { MatchScreen } from './MatchScreen';
import { MemberProfileScreen } from './MemberProfileScreen';
import { Conversation, MessagesScreen } from './MessagesScreen';
import { MyActivitiesScreen } from './MyActivitiesScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { PendingActivitiesScreen } from './PendingActivitiesScreen';
import { RatingScreen } from './RatingScreen';
import { SettingsScreen } from './SettingsScreen';
import { UserProfileScreen } from './UserProfileScreen';

type PeopleSource = { name: 'discover' } | { name: 'pending' } | { name: 'detail'; activity: Activity };

type FullScreenRoute =
  | { name: 'discover' }
  | { name: 'filter' }
  | { name: 'pending' }
  | { name: 'manage' }
  | { name: 'notifications' }
  | { name: 'myActivities' }
  | { name: 'editProfile'; source?: 'ownProfilePreview' }
  | { name: 'ownProfilePreview' }
  | { name: 'settings' }
  | { name: 'activityDetail'; activity: Activity; source: 'home' | 'discover' | 'pending' }
  | { name: 'group'; activity: Activity; source: 'home' | 'myActivities' }
  | { name: 'progress'; activity: Activity }
  | { name: 'summary'; activity: Activity }
  | { name: 'rating'; activity: Activity }
  | { name: 'chat'; conversation: Conversation; returnTo?: 'discover' }
  | { name: 'hostMembers'; activity: Activity; source: PeopleSource }
  | { name: 'memberProfile'; person: PersonProfile; source: 'manage' | 'hostMembers'; activity?: Activity; peopleSource?: PeopleSource }
  | null;

const dayTokens: Record<string, string> = { 'Thứ Hai': 'T2', 'Thứ Ba': 'T3', 'Thứ Tư': 'T4', 'Thứ Năm': 'T5', 'Thứ Sáu': 'T6', 'Thứ Bảy': 'T7', 'Chủ Nhật': 'CN' };

function activityMatchesLocation(activity: Activity, province: string, district: string) {
  if (province === 'Tất cả') return true;
  const provinceAliases: Record<string, string[]> = { 'TP. Hồ Chí Minh': ['TP.HCM', 'Thủ Đức'], 'Hà Nội': ['Hà Nội'], 'Đà Nẵng': ['Đà Nẵng'], 'Lâm Đồng': ['Lâm Đồng', 'Đà Lạt', 'Bảo Lộc'] };
  const provinceMatch = (provinceAliases[province] ?? [province]).some((token) => activity.location.includes(token));
  return provinceMatch && (district === 'Tất cả' || activity.location.includes(district));
}

function activityMatchesTime(activity: Activity, availableDays: string[], timePeriods: string[]) {
  const day = Object.entries(dayTokens).find(([label]) => activity.time.includes(label))?.[1];
  const hour = Number(activity.time.match(/(\d{1,2}):\d{2}/)?.[1] ?? 0);
  const period = hour < 12 ? 'Sáng' : hour < 18 ? 'Chiều' : 'Tối';
  return (availableDays.length === 0 || Boolean(day && availableDays.includes(day))) && (timePeriods.length === 0 || timePeriods.includes(period));
}

export function MainApp({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [route, setRoute] = useState<FullScreenRoute>(null);
  const [filters, setFilters] = useState<ActivityFilters>();
  const filteredActivities = useMemo(() => {
    if (!filters) return activities;
    return activities.filter((activity) => {
      const estimatedCost = Number(activity.estimatedCost.replace(/\D/g, ''));
      const capacity = Number(activity.members.split('/')[1] ?? 0);
      return Number.parseFloat(activity.distance) <= filters.distance
        && activityMatchesLocation(activity, filters.province, filters.district)
        && (filters.categories.length === 0 || filters.categories.includes(activity.category))
        && activityMatchesTime(activity, filters.availableDays, filters.timePeriods)
        && estimatedCost >= filters.minBudget
        && (filters.maxBudget === 2000000 || estimatedCost <= filters.maxBudget)
        && capacity >= filters.minimumCapacity;
    });
  }, [filters]);

  if (route?.name === 'discover') return <MatchScreen activityItems={filteredActivities} onBack={() => setRoute(null)} onFilterPress={() => setRoute({ name: 'filter' })} />;
  if (route?.name === 'filter') return <FilterScreen initialFilters={filters} onApply={(next) => { setFilters(next); setRoute({ name: 'discover' }); }} onClose={() => setRoute({ name: 'discover' })} />;
  if (route?.name === 'pending') return <PendingActivitiesScreen onBack={() => setRoute(null)} onOpen={(activity) => setRoute({ name: 'activityDetail', activity, source: 'pending' })} />;
  if (route?.name === 'manage') return <ManageActivitiesScreen onBack={() => setRoute(null)} onViewProfile={(person) => setRoute({ name: 'memberProfile', person, source: 'manage' })} />;
  if (route?.name === 'activityDetail') {
    const current = route;
    return <ActivityDetailScreen activity={current.activity} onBack={() => setRoute(current.source === 'discover' ? { name: 'discover' } : current.source === 'pending' ? { name: 'pending' } : null)} onPrimary={() => Alert.alert('Đã gửi yêu cầu', 'Host sẽ xem hồ sơ và phản hồi sau khi duyệt.')} onViewPeople={() => setRoute({ name: 'hostMembers', activity: current.activity, source: { name: 'detail', activity: current.activity } })} />;
  }
  if (route?.name === 'hostMembers') {
    const { activity, source } = route;
    return <HostMembersScreen activity={activity} onBack={() => setRoute(source.name === 'detail' ? { name: 'activityDetail', activity: source.activity, source: 'discover' } : source)} onViewProfile={(person) => setRoute({ name: 'memberProfile', person, source: 'hostMembers', activity, peopleSource: source })} />;
  }
  if (route?.name === 'memberProfile') {
    const current = route;
    return <MemberProfileScreen person={current.person} onBack={() => current.source === 'manage' ? setRoute({ name: 'manage' }) : current.activity && current.peopleSource ? setRoute({ name: 'hostMembers', activity: current.activity, source: current.peopleSource }) : setRoute(null)} />;
  }
  if (route?.name === 'ownProfilePreview') return <MemberProfileScreen mode="own-preview" onBack={() => setRoute(null)} onEdit={() => setRoute({ name: 'editProfile', source: 'ownProfilePreview' })} person={currentUserProfile} />;
  if (route?.name === 'notifications') return <NotificationsScreen onBack={() => setRoute(null)} />;
  if (route?.name === 'myActivities') return <MyActivitiesScreen onBack={() => setRoute(null)} onOpenGroup={(activity) => setRoute({ name: 'group', activity, source: 'myActivities' })} />;
  if (route?.name === 'editProfile') {
    const returnRoute = route.source === 'ownProfilePreview' ? { name: 'ownProfilePreview' } as const : null;
    return <EditProfileScreen onBack={() => setRoute(returnRoute)} onSaved={() => setRoute(returnRoute)} />;
  }
  if (route?.name === 'settings') return <SettingsScreen onBack={() => setRoute(null)} onLogout={onLogout} />;
  if (route?.name === 'chat') { const current = route; return <ChatScreen conversation={current.conversation} onBack={() => setRoute(current.returnTo === 'discover' ? { name: 'discover' } : null)} />; }
  if (route?.name === 'group') { const current = route; return <GroupScreen activity={current.activity} onBack={() => setRoute(current.source === 'myActivities' ? { name: 'myActivities' } : null)} onStart={() => setRoute({ name: 'progress', activity: current.activity })} />; }
  if (route?.name === 'progress') return <ActivityProgressScreen activity={route.activity} onBack={() => setRoute({ name: 'group', activity: route.activity, source: 'myActivities' })} onEnd={() => setRoute({ name: 'summary', activity: route.activity })} />;
  if (route?.name === 'summary') return <ActivitySummaryScreen activity={route.activity} onBack={() => setRoute({ name: 'progress', activity: route.activity })} onRate={() => setRoute({ name: 'rating', activity: route.activity })} />;
  if (route?.name === 'rating') return <RatingScreen activity={route.activity} onBack={() => setRoute({ name: 'summary', activity: route.activity })} onComplete={() => { setActiveTab('home'); setRoute(null); }} />;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen onMatchPress={() => { setActiveTab('match'); setRoute({ name: 'discover' }); }} onMyActivitiesPress={() => setRoute({ name: 'myActivities' })} onNotificationsPress={() => setRoute({ name: 'notifications' })} onOpenActivity={(activity) => setRoute({ name: 'activityDetail', activity, source: 'home' })} onOpenGroup={(activity) => setRoute({ name: 'group', activity, source: 'home' })} onPendingPress={() => setRoute({ name: 'pending' })} />}
        {activeTab === 'match' && <MatchHubScreen onDiscover={() => setRoute({ name: 'discover' })} onManage={() => setRoute({ name: 'manage' })} onNotifications={() => setRoute({ name: 'notifications' })} onPending={() => setRoute({ name: 'pending' })} onPreviewProfile={() => setRoute({ name: 'ownProfilePreview' })} />}
        {activeTab === 'create' && <CreateActivityScreen onCreated={() => setRoute({ name: 'myActivities' })} />}
        {activeTab === 'messages' && <MessagesScreen onOpenChat={(conversation) => setRoute({ name: 'chat', conversation })} />}
        {activeTab === 'profile' && <UserProfileScreen onEdit={() => setRoute({ name: 'editProfile' })} onMyActivities={() => setRoute({ name: 'myActivities' })} onNotifications={() => setRoute({ name: 'notifications' })} onSettings={() => setRoute({ name: 'settings' })} />}
      </View>
      <BottomNav activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); if (tab === 'match') setRoute({ name: 'discover' }); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, content: { flex: 1 } });
