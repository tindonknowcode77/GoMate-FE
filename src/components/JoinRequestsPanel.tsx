import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { RemoteState } from './RemoteState';
import { MemberProfileModal } from './MemberProfileModal';
import { UserAvatar } from './UserAvatar';
import { decideRequest, listRequests } from '../services/activityApi';
import { useRemote } from '../services/useRemote';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { colors } from '../theme';

export function JoinRequestsPanel({ activityId, enabled, full, onChanged }: { activityId: string; enabled: boolean; full: boolean; onChanged: () => void }) {
  const load = useCallback(() => listRequests(activityId), [activityId]);
  const remote = useRemote(load, [], true, {
    cacheKey: `activity-requests:${activityId}`,
    staleTimeMs: 15000,
    tags: [`requests:${activityId}`, `activity:${activityId}`],
  });
  const reload = remote.reload;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [profile, setProfile] = useState<string | null>(null);
  const lock = useRef(false);
  useLiveRefresh(reload);
  const decide = async (id: string, status: 'approved' | 'rejected') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await decideRequest(activityId, id, status); await reload(true); onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 10, marginBottom: 20 }}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Yêu cầu tham gia{remote.data.length ? ` (${remote.data.length})` : ''}</Text>
    <RemoteState loading={remote.loading && !remote.data.length} error={remote.error} empty={!remote.loading && !remote.data.length} emptyMessage="Chưa có yêu cầu mới" onRetry={reload} />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    {remote.data.map(request => <View key={request.id} style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 14, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${request.name}`} onPress={() => setProfile(request.userId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <UserAvatar name={request.name} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{request.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" disabled={busy || !enabled || full} onPress={() => void decide(request.id, 'approved')} style={{ flex: 1, minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, opacity: busy || !enabled || full ? 0.45 : 1 }}><Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>Duyệt</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy || !enabled} onPress={() => void decide(request.id, 'rejected')} style={{ flex: 1, minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, opacity: busy || !enabled ? 0.45 : 1 }}><Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Từ chối</Text></Pressable>
      </View>
      {full ? <Text>Nhóm đã đủ chỗ.</Text> : !enabled ? <Text>Đã đóng yêu cầu.</Text> : null}
    </View>)}
    {profile && <MemberProfileModal userId={profile} onClose={() => setProfile(null)} />}
  </View>;
}
