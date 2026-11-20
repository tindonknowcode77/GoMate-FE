import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FriendRequestButton } from '../components/FriendRequestButton';
import { Text } from '../components/LocalizedText';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { UserAvatar } from '../components/UserAvatar';
import { Activity } from '../data/activities';
import { getSession } from '../services/api';
import { ActivityMemory, getActivitySummary, uploadActivityMemory } from '../services/activityApi';
import { imageUrl } from '../services/profileService';
import { useRemote } from '../services/useRemote';
import { colors, layout, radii } from '../theme';

const statusBadge = {
  present: { label: 'Có mặt', fg: colors.successText, bg: colors.successSoft },
  late: { label: 'Đến muộn', fg: colors.warningText, bg: colors.warningSoft },
  absent: { label: 'Vắng mặt', fg: colors.matchText, bg: colors.matchSoft },
  unmarked: { label: 'Chưa rõ', fg: colors.textSecondary, bg: colors.surfaceMuted },
} as const;

export function ActivitySummaryScreen({ activity, onBack, onRate }: { activity: Activity; onBack: () => void; onRate: () => void }) {
  const loader = useCallback(() => getActivitySummary(activity.id), [activity.id]);
  const remote = useRemote(loader, null);
  const [showRoster, setShowRoster] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [lightbox, setLightbox] = useState<ActivityMemory | null>(null);

  const pickMemory = async () => {
    if (uploading) return;
    setUploadError('');
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (picked.canceled || !picked.assets[0]?.base64) return;
      setUploading(true);
      await uploadActivityMemory(activity.id, picked.assets[0].base64, '');
      await remote.reload(true);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Không thể tải ảnh kỷ niệm lên.');
    } finally {
      setUploading(false);
    }
  };

  const summary = remote.data;
  const me = getSession()?.user.id;
  const companions = summary?.attendance.members.filter(
    member => member.userId !== me && ['present', 'late'].includes(member.status)
  ) ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader onBack={onBack} title="Tổng kết hoạt động" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <Image source={activity.image} style={styles.image} />
          <View style={styles.success}>
            <Ionicons color={colors.success} name="checkmark-circle" size={28} />
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>Hoạt động đã hoàn thành</Text>
              <Text style={styles.successText}>{activity.title} · {activity.location}</Text>
            </View>
            {summary?.rating.average != null && (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingPillText}>{summary.rating.average.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <RemoteState {...remote} onRetry={remote.reload} />

          {summary && (
            <>
              <View style={styles.stats}>
                <Stat
                  label={summary.attendance.lateCount > 0 ? `Tham gia (${summary.attendance.lateCount} muộn)` : 'Tham gia'}
                  value={String(summary.attendance.attendedCount)}
                  color={colors.successText}
                />
                <View style={styles.divider} />
                <Stat label="Vắng mặt" value={String(summary.attendance.absentCount)} color={colors.matchText} />
                <View style={styles.divider} />
                <Stat label="Tổng đăng ký" value={String(summary.attendance.total)} color={colors.text} />
              </View>

              <View style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowRoster(v => !v)}
                  style={styles.cardHeaderRow}
                >
                  <Text style={styles.cardTitle}>Chi tiết điểm danh ({summary.attendance.attendedCount}/{summary.attendance.total})</Text>
                  <Ionicons name={showRoster ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>
                {showRoster && (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {summary.attendance.members.map(member => {
                      const badge = statusBadge[member.status] || statusBadge.unmarked;
                      return (
                        <View key={member.userId} style={styles.rosterRow}>
                          <UserAvatar uri={member.avatarUrl} name={member.name} size={36} />
                          <Text style={styles.rosterName}>{member.name}</Text>
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={{ color: badge.fg, fontSize: 11, fontWeight: '700' }}>{badge.label}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Kỷ niệm ({summary.memories.length})</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={uploading}
                    onPress={() => void pickMemory()}
                    style={styles.addMemoryBtn}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={16} color={colors.primary} />
                        <Text style={styles.addMemoryText}>Thêm ảnh</Text>
                      </>
                    )}
                  </Pressable>
                </View>
                {uploadError ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{uploadError}</Text> : null}
                {summary.memories.length > 0 ? (
                  <View style={styles.memoryGrid}>
                    {summary.memories.map(item => (
                      <Pressable key={item.id} onPress={() => setLightbox(item)} style={styles.memoryTile}>
                        <Image source={{ uri: imageUrl(item.imageUrl) }} style={styles.memoryImg} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyNote}>Chưa có ảnh kỷ niệm nào. Hãy tải lên khoảnh khắc đẹp của nhóm!</Text>
                )}
              </View>

              {companions.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Kết bạn với người đồng hành</Text>
                  {companions.map(member => (
                    <View key={member.userId} style={styles.companionRow}>
                      <UserAvatar uri={member.avatarUrl} name={member.name} size={40} />
                      <Text style={styles.rosterName}>{member.name}</Text>
                      <FriendRequestButton userId={member.userId} />
                    </View>
                  ))}
                </View>
              )}

              {!summary.rating.canRate && !summary.rating.hasRated ? (
                <Text style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 13 }}>
                  Đánh giá dành cho thành viên đã tham gia hoạt động.
                </Text>
              ) : null}

              <GradientButton
                disabled={!summary.rating.canRate}
                label={
                  summary.rating.hasRated
                    ? 'Xem lại đánh giá của bạn'
                    : summary.rating.isHost
                      ? 'Đánh giá thành viên'
                      : 'Đánh giá trải nghiệm'
                }
                onPress={onRate}
                trailing={<Ionicons color={colors.white} name="star" size={18} />}
              />
            </>
          )}
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={Boolean(lightbox)} onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightboxBackdrop}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightbox(null)}>
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          {lightbox && (
            <View style={styles.lightboxCard}>
              <Image source={{ uri: imageUrl(lightbox.imageUrl) }} style={styles.lightboxImg} resizeMode="contain" />
              <Text style={styles.lightboxCaption}>
                {lightbox.uploaderName}{lightbox.caption ? ` · ${lightbox.caption}` : ''}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 32 },
  page: { alignSelf: 'center', maxWidth: layout.maxWidth, padding: 18, width: '100%' },
  image: { borderRadius: radii.largeCard, height: 190, width: '100%' },
  success: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radii.card, flexDirection: 'row', marginTop: 13, padding: 15, gap: 10 },
  successCopy: { flex: 1 },
  successTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  successText: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingPillText: { fontSize: 13, fontWeight: '800', color: colors.text },
  stats: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, flexDirection: 'row', marginTop: 13, paddingVertical: 16 },
  stat: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  divider: { backgroundColor: colors.border, height: 32, width: 1 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, marginTop: 13, padding: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rosterName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  addMemoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  addMemoryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  memoryTile: { width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  memoryImg: { width: '100%', height: '100%' },
  emptyNote: { color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 19 },
  companionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lightboxBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  lightboxClose: { position: 'absolute', top: 44, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lightboxCard: { width: '100%', maxWidth: 500, alignItems: 'center', gap: 12 },
  lightboxImg: { width: '100%', height: 420, borderRadius: 16 },
  lightboxCaption: { color: colors.white, fontSize: 14, textAlign: 'center' },
});
