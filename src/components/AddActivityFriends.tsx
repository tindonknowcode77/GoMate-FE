import { useFeedbackState } from '../services/feedback';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './LocalizedText';
import { SelectionField } from './SelectionField';
import { RemoteState } from './RemoteState';
import { Friend, listFriends } from '../services/friendService';
import { ActivityDto, addActivityFriends, getActivity, listMembers, listSentActivityInvitations, ActivityInvitation } from '../services/activityApi';
import { useRemote } from '../services/useRemote';
import { colors } from '../theme';

export function AddActivityFriends({ activityId, onAdded }: { activityId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false), [ids, setIds] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useFeedbackState('');
  const lock = useRef(false);
  const loader = useCallback(async () => { const [friends, members, activity, invitations] = await Promise.all([listFriends(), listMembers(activityId), getActivity(activityId), listSentActivityInvitations(activityId)]); return { friends: friends.filter(friend => !members.some(member => member.userId === friend.id)), activity, invitations }; }, [activityId]);
  const remote = useRemote<{ friends: Friend[]; activity: ActivityDto | null; invitations: ActivityInvitation[] }>(loader, { friends: [], activity: null, invitations: [] });
  const add = async () => {
    if (lock.current || !ids.length) return;
    lock.current = true; setBusy(true); setError('');
    try { await addActivityFriends(activityId, ids, false); setIds([]); setOpen(false); await remote.reload(); onAdded(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được lời mời'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 10, paddingVertical: 10 }}>
    <Pressable accessibilityRole="button" onPress={() => { setOpen(!open); if (!open) void remote.reload(); }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{open ? 'Đóng thêm bạn bè −' : '+ Thêm bạn bè trên GoMate vào nhóm'}</Text></Pressable>
    {open && (remote.loading || remote.error ? <RemoteState {...remote} onRetry={remote.reload} /> : <>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Người được chọn sẽ nhận thông báo và tự động vào nhóm chat ngay khi đồng ý.</Text>
      <SelectionField label="Chọn bạn bè thêm vào nhóm" options={remote.data.friends.map(friend => ({ value: friend.id, label: friend.name + ' · ' + (friend.username || friend.id.slice(0, 6)) }))} selected={ids} onChange={setIds} multiple searchable emptyLabel={remote.data.friends.length ? 'Chọn bạn' : 'Không có bạn bè ngoài nhóm'} />
      <Pressable accessibilityRole="button" disabled={busy || !ids.length} onPress={() => void add()} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primarySoft, borderRadius: 12, alignSelf: 'flex-start', opacity: busy || !ids.length ? 0.5 : 1 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{busy ? 'Đang gửi...' : 'Gửi lời mời tham gia'}</Text></Pressable>
    </>)}
    {remote.data.invitations.map(invitation => <Text key={invitation.id} style={{ color: colors.textSecondary, fontSize: 13 }}>• {invitation.name}: {invitation.status === 'pending' ? 'Đang chờ đồng ý' : invitation.status === 'accepted' ? 'Đã vào nhóm' : 'Đã từ chối'}</Text>)}
    {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
  </View>;
}
