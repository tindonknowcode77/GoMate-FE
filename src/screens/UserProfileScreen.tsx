import { Text } from '../components/LocalizedText';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, layout } from '../theme';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useProfile } from '../hooks/useProfile';


type UserProfileScreenProps = {
  onEdit: () => void;
  onMyActivities: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  onBack?: () => void;
};

export function UserProfileScreen({ onEdit, onMyActivities, onNotifications, onSettings, onBack }: UserProfileScreenProps) {
  const { profile, error, retry } = useProfile();
  if (!profile) return <View style={styles.page}>
    <Text accessibilityRole="alert">{error || 'Đang tải hồ sơ…'}</Text>
    {!!error && <Pressable onPress={retry}><Text>Thử lại</Text></Pressable>}
    <Pressable onPress={onSettings}><Text>Cài đặt</Text></Pressable>
    {onBack && <Pressable onPress={onBack}><Text>Quay lại</Text></Pressable>}
  </View>;
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <View style={styles.header}>
          {onBack && <Pressable onPress={onBack}><Ionicons name="chevron-back" size={24} color={colors.ink} /></Pressable>}
          <Text style={styles.headerTitle}>Hồ sơ</Text>
          <View style={styles.headerActions}>
            <LanguageSwitcher />
            <Pressable onPress={onSettings} style={styles.settingsButton}><Ionicons color={colors.ink} name="settings-outline" size={22} /></Pressable>
          </View>
        </View>
        <View style={styles.cover}>
          <View style={styles.coverGlow} />
        </View>
        <View style={styles.profileCard}>
          {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar}><Ionicons name="person-circle-outline" size={68} color={colors.primary} /></View>}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
          </View>
          {!!profile.username && <Text style={styles.location}>@{profile.username}</Text>}
          <Text style={styles.location}>{profile.location}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
          <Pressable onPress={onEdit} style={styles.editButton}>
            <Ionicons color={colors.primary} name="create-outline" size={17} />
            <Text style={styles.editText}>Chỉnh sửa hồ sơ</Text>
          </Pressable>
          <View style={styles.interests}>
            {profile.interests.map((item) => <View key={item} style={styles.interest}><Text style={styles.interestText}>{item}</Text></View>)}
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuRow icon="calendar-outline" label="Hoạt động của tôi" onPress={onMyActivities} />
          <MenuRow icon="notifications-outline" label="Thông báo" onPress={onNotifications} />
          <MenuRow icon="shield-checkmark-outline" label="An toàn & quyền riêng tư" />
          <MenuRow icon="help-circle-outline" label="Trợ giúp" last />
        </View>
      </View>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, last = false }: { icon: 'calendar-outline' | 'notifications-outline' | 'shield-checkmark-outline' | 'help-circle-outline'; label: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, last && styles.lastRow]}>
      <View style={styles.menuIcon}><Ionicons color={colors.primary} name={icon} size={19} /></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 27 },
  page: { alignSelf: 'center', maxWidth: layout.maxWidth, paddingHorizontal: 18, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 14, paddingTop: 20 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  headerTitle: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  settingsButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 17, height: 42, justifyContent: 'center', width: 42 },
  cover: { backgroundColor: colors.primary, borderRadius: 25, height: 126, overflow: 'hidden' },
  coverGlow: { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 90, height: 180, position: 'absolute', right: -35, top: -80, width: 180 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, marginHorizontal: 12, marginTop: -43, padding: 17, shadowColor: colors.text, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  avatar: { borderColor: colors.white, borderRadius: 38, borderWidth: 4, height: 76, marginTop: -51, width: 76 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 7 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  location: { color: colors.body, fontSize: 11, marginTop: 4 },
  bio: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  editButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 15, flexDirection: 'row', gap: 6, marginTop: 13, paddingHorizontal: 13, paddingVertical: 8 },
  editText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  interests: { flexDirection: 'row', gap: 7, marginTop: 14 },
  interest: { backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  interestText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  statsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 21, borderWidth: 1, flexDirection: 'row', marginTop: 15, paddingVertical: 16 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  statLabel: { color: colors.body, fontSize: 9.5, marginTop: 3 },
  divider: { backgroundColor: colors.border, height: 29, width: 1 },
  sectionCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 21, borderWidth: 1, marginTop: 15, padding: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  rating: { color: colors.warning, fontSize: 12, fontWeight: '900' },
  review: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginTop: 10 },
  reviewAuthor: { color: colors.textMuted, fontSize: 9.5, marginTop: 7 },
  recentRow: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
  recentIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 14, height: 40, justifyContent: 'center', marginRight: 10, width: 40 },
  recentTitle: { color: colors.text, fontSize: 12.5, fontWeight: '800' },
  recentMeta: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  photoRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  activityPhoto: { borderRadius: 12, height: 76, width: '31.8%' },
  menuCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginTop: 15, overflow: 'hidden', paddingHorizontal: 15 },
  menuRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 60 },
  lastRow: { borderBottomWidth: 0 },
  menuIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 34, justifyContent: 'center', width: 34 },
  menuLabel: { color: colors.textSecondary, flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 11 },
});
