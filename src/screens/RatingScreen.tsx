import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { FormField } from '../components/FormField';
import { UserAvatar } from '../components/UserAvatar';
import { Activity } from '../data/activities';
import { getRatingForm, submitRating } from '../services/communityService';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';

export function RatingScreen({ activity, onBack, onComplete }: { activity: Activity; onBack: () => void; onComplete: () => void }) {
  const load = useCallback(() => getRatingForm(activity.id), [activity.id]);
  const remote = useRemote(load, null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [members, setMembers] = useState<Record<string, number>>({});
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const locked = useRef(false);

  const submitted = remote.data?.submitted;
  const isHost = Boolean(remote.data?.isHost);
  const canRateActivity = remote.data?.canRateActivity !== false && !isHost;

  const send = async () => {
    if (locked.current) return;
    const ratedMembers = Object.entries(members)
      .filter(([, value]) => value > 0)
      .map(([userId, value]) => ({
        userId,
        score: value,
        ...(memberNotes[userId]?.trim() ? { note: memberNotes[userId].trim() } : {}),
      }));

    if (canRateActivity && !score) {
      setError('Vui lòng chọn điểm đánh giá cho hoạt động.');
      return;
    }
    if (isHost && (remote.data?.members.length ?? 0) > 0 && !ratedMembers.length) {
      setError('Vui lòng đánh giá ít nhất một thành viên tham gia.');
      return;
    }

    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await submitRating(activity.id, {
        score: canRateActivity ? score : null,
        comment: canRateActivity ? comment : '',
        members: ratedMembers,
      });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa gửi được đánh giá');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={isHost ? 'Đánh giá thành viên' : 'Đánh giá hoạt động'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <RemoteState {...remote} onRetry={remote.reload} />
        {remote.data && !remote.error && (
          submitted || sent ? (
            <View style={styles.card}>
              <Ionicons name="checkmark-circle" size={45} color={colors.success} />
              <Text style={styles.heading}>Cảm ơn bạn đã chia sẻ!</Text>
              <Text style={styles.note}>Đánh giá của bạn đã được ghi nhận.</Text>
              {submitted && submitted.value.score ? (
                <>
                  <Text style={styles.note}>Điểm hoạt động: {submitted.value.score}/5 ★</Text>
                  {submitted.value.comment ? <Text style={styles.note}>{submitted.value.comment}</Text> : null}
                </>
              ) : null}
              <GradientButton label="Hoàn tất" onPress={onComplete} />
            </View>
          ) : (
            <>
              {canRateActivity ? (
                <>
                  <View style={[styles.card, { alignItems: 'center' }]}>
                    <Ionicons name="heart-outline" size={36} color={colors.primary} />
                    <Text style={styles.heading}>Trải nghiệm của bạn thế nào?</Text>
                    <Text style={styles.note}>{activity.title}</Text>
                    <Stars label="Trải nghiệm hoạt động" value={score} onChange={setScore} />
                  </View>
                  <View style={styles.card}>
                    <FormField
                      label="Nhận xét về hoạt động (không bắt buộc)"
                      value={comment}
                      onChangeText={text => setComment(text.slice(0, 1000))}
                      multiline
                    />
                    <Text style={styles.note}>{comment.length}/1000</Text>
                  </View>
                </>
              ) : (
                <View style={styles.hostBanner}>
                  <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
                  <Text style={styles.hostBannerText}>
                    Với vai trò Host, bạn chỉ cần đánh giá các thành viên đã tham gia (không cần đánh giá hoạt động do chính mình tạo).
                  </Text>
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.heading}>
                  {isHost ? 'Đánh giá thành viên tham gia' : 'Người đồng hành (tùy chọn)'}
                </Text>
                {remote.data.members.map(member => (
                  <View key={member.id} style={styles.memberBlock}>
                    <View style={styles.member}>
                      <UserAvatar uri={member.avatarUrl} name={member.name} size={44} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{member.name}</Text>
                        <Stars
                          small
                          label={member.name}
                          value={members[member.id] || 0}
                          onChange={value => setMembers(current => ({ ...current, [member.id]: value }))}
                        />
                        {Boolean(members[member.id]) && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={'Bỏ đánh giá ' + member.name}
                            onPress={() => setMembers(current => ({ ...current, [member.id]: 0 }))}
                          >
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Bỏ chọn</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {Boolean(members[member.id]) && (
                      <TextInput
                        value={memberNotes[member.id] || ''}
                        onChangeText={text => setMemberNotes(prev => ({ ...prev, [member.id]: text.slice(0, 300) }))}
                        placeholder={`Nhận xét ngắn về ${member.name} (tùy chọn)...`}
                        placeholderTextColor={colors.textMuted}
                        style={styles.memberNoteInput}
                      />
                    )}
                  </View>
                ))}
                {!remote.data.members.length && (
                  <Text style={styles.note}>Không có thành viên khác đã tham gia để đánh giá.</Text>
                )}
              </View>

              {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
              <GradientButton label={busy ? 'Đang gửi...' : 'Gửi đánh giá'} disabled={busy} onPress={() => void send()} />
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stars({ label, value, onChange, small = false }: { label: string; value: number; onChange: (value: number) => void; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${star} sao`}
          accessibilityState={{ selected: value === star }}
          onPress={() => onChange(star)}
          key={star}
          style={{ padding: small ? 5 : 6 }}
        >
          <Ionicons name={star <= value ? 'star' : 'star-outline'} color={star <= value ? colors.warning : colors.textMuted} size={small ? 24 : 30} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 18, paddingBottom: 40, maxWidth: Math.min(layout.maxWidth, 800), width: '100%', alignSelf: 'center', gap: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, gap: 14 },
  hostBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 16, padding: 14 },
  hostBannerText: { flex: 1, color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 26 },
  note: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  memberBlock: { gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberNoteInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, backgroundColor: colors.background },
});
