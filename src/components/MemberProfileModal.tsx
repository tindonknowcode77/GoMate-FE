import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlockUserButton } from './BlockUserButton';
import { FriendRequestButton } from './FriendRequestButton';
import { Text } from './LocalizedText';
import { RemoteState } from './RemoteState';
import { ReputationStats } from './ReputationStats';
import { UserAvatar } from './UserAvatar';
import { getPublicProfile, imageUrl, PublicProfile } from '../services/profileService';
import { useRemote } from '../services/useRemote';
import { colors } from '../theme';

export function MemberProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const loader = useCallback(() => getPublicProfile(userId), [userId]);
  const remote = useRemote<PublicProfile | null>(loader, null);
  const profile = remote.data;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng hồ sơ" />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Hồ sơ thành viên</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng hồ sơ"
              hitSlop={10}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <RemoteState {...remote} onRetry={remote.reload} />
            {profile && !remote.loading && !remote.error && (
              <>
                {profile.coverUrl ? (
                  <Image source={{ uri: imageUrl(profile.coverUrl) }} style={styles.cover} />
                ) : null}
                <View style={styles.identityRow}>
                  <UserAvatar uri={profile.avatarUrl} name={profile.name} size={76} borderColor={colors.primarySoft} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.name}>
                      {profile.name}
                      {profile.age !== null ? `, ${profile.age}` : ''}
                    </Text>
                    {profile.location ? <Text style={styles.meta}>{profile.location}</Text> : null}
                    {profile.occupation ? <Text style={styles.meta}>{profile.occupation}</Text> : null}
                  </View>
                </View>
                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                {profile.interests.length > 0 && (
                  <Text style={styles.infoLine}>Sở thích: {profile.interests.join(', ')}</Text>
                )}
                {profile.languages.length > 0 && (
                  <Text style={styles.infoLine}>Ngôn ngữ: {profile.languages.join(', ')}</Text>
                )}
                <ReputationStats reputation={profile.reputation} />
                {profile.companionGoal ? <Text style={styles.infoLine}>Đồng hành: {profile.companionGoal}</Text> : null}
                {profile.availableTimes?.length ? (
                  <Text style={styles.infoLine}>Thường rảnh: {profile.availableTimes.join(' · ')}</Text>
                ) : null}
                {profile.school || profile.education ? (
                  <Text style={styles.infoLine}>{[profile.school, profile.education].filter(Boolean).join(' · ')}</Text>
                ) : null}
                {profile.activityWish ? <Text style={styles.infoLine}>Muốn thử: {profile.activityWish}</Text> : null}
                {profile.contribution ? <Text style={styles.infoLine}>Có thể chia sẻ: {profile.contribution}</Text> : null}
                {(profile.photos || []).map(photo => (
                  <Image key={photo.id} source={{ uri: imageUrl(photo.url) }} style={styles.photo} />
                ))}
                <View style={styles.actions}>
                  <FriendRequestButton userId={profile.id} />
                  <BlockUserButton userId={profile.id} onBlocked={onClose} />
                </View>
                {profile.demo ? <Text style={styles.demoNote}>Hồ sơ demo hư cấu · ảnh minh họa</Text> : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 18 },
  card: { alignSelf: 'center', width: '100%', maxWidth: 480, maxHeight: '88%', backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 12 },
  cover: { width: '100%', height: 140, borderRadius: 14 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  bio: { fontSize: 14, lineHeight: 20, color: colors.text },
  infoLine: { fontSize: 13, color: colors.text, lineHeight: 19 },
  photo: { width: '100%', aspectRatio: 0.9, borderRadius: 16 },
  actions: { gap: 10, marginTop: 4 },
  demoNote: { color: colors.textMuted, fontSize: 12 },
});
