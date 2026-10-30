import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './LocalizedText';
import { RemoteState } from './RemoteState';
import { MemberProfileModal } from './MemberProfileModal';
import { decideRequest, listRequests } from '../services/activityApi';
import { useRemote } from '../services/useRemote';
import { colors } from '../theme';

export function JoinRequestsPanel({ activityId, enabled, full, onChanged }: { activityId: string; enabled: boolean; full: boolean; onChanged: () => void }) {
  const load = useCallback(() => listRequests(activityId), [activityId]);
  const remote = useRemote(load, []);
  const reload = remote.reload;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [profile, setProfile] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => { const timer = setInterval(() => void reload(true), 10000); return () => clearInterval(timer); }, [reload]);
  const decide = async (id: string, status: 'approved' | 'rejected') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await decideRequest(activityId, id, status); await reload(true); onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 10, marginBottom: 20 }}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Yêu cầu tham gia{remote.data.length ? ` (${remote.data.length})` : ''}</Text>
    <RemoteState {...remote} empty={!remote.data.length} emptyMessage="Hiện chưa có yêu cầu nào." onRetry={reload} />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    {remote.data.map(request => <View key={request.id} style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 14, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${request.name}`} onPress={() => setProfile(request.userId)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontWeight: '600', color: colors.text }}>{request.name}</Text></Pressable>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable accessibilityRole="button" disabled={busy || !enabled || full} onPress={() => void decide(request.id, 'approved')} style={{ minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, opacity: busy || !enabled || full ? 0.45 : 1 }}><Text style={{ color: colors.primary }}>Duyệt</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy || !enabled} onPress={() => void decide(request.id, 'rejected')} style={{ minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' }}><Text style={{ color: colors.textSecondary }}>Từ chối</Text></Pressable>
      </View>
      {full ? <Text>Nhóm đã đủ chỗ.</Text> : !enabled ? <Text>Đã đóng yêu cầu.</Text> : null}
    </View>)}
    {profile && <MemberProfileModal userId={profile} onClose={() => setProfile(null)} />}
  </View>;
}
