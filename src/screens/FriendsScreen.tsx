import { ActivityInvitations } from '../components/ActivityInvitations';
import { useFeedbackState } from '../services/feedback';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormField } from '../components/FormField';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { UserAvatar } from '../components/UserAvatar';
import { MemberProfileModal } from '../components/MemberProfileModal';
import { decideFriend, Friend, listFriendRequests, listFriends, removeFriend, requestFriend, searchPeople } from '../services/friendService';
import { useRemote } from '../services/useRemote';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { colors, layout } from '../theme';
async function load() { const [friends, requests] = await Promise.all([listFriends(), listFriendRequests()]); return { friends, requests }; }
export function FriendsScreen({ onBack, onChat, onInvitationAccepted }: { onBack: () => void; onChat: (userId: string) => Promise<void>; onInvitationAccepted?: (activityId: string) => Promise<void> }) {
  const remote = useRemote(load, { friends: [], requests: [] });
  const [query, setQuery] = useState(''), [results, setResults] = useState<Friend[] | null>(null), [error, setError] = useFeedbackState(''), [busy, setBusy] = useState(false), [removeId, setRemoveId] = useState(''), [profileId, setProfileId] = useState<string | null>(null);
  const lock = useRef(false), reload = remote.reload;
  useLiveRefresh(reload);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu'); }
    finally { lock.current = false; setBusy(false); }
  };
  const row = (person: Friend, children: React.ReactNode) => <View key={person.id} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${person.name}`} onPress={() => setProfileId(person.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <UserAvatar uri={person.avatarUrl} name={person.name} size={46} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{person.name}</Text>
        {person.username ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{person.username}</Text> : null}
        {person.location ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{person.location}</Text> : null}
      </View>
    </Pressable>
    {children}
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Bạn bè GoMate" onBack={onBack} right={<Pressable accessibilityRole="button" accessibilityLabel="Làm mới bạn bè" onPress={() => void remote.reload()}><Text style={{ color: colors.primary }}>Làm mới</Text></Pressable>} />
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <ActivityInvitations onAccepted={onInvitationAccepted} />
      <FormField label="Tìm bạn bằng tên hoặc Nickname" value={query} onChangeText={setQuery} placeholder="Nhập ít nhất 2 ký tự" /><Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { setResults(await searchPeople(query.trim())); })}><Text style={{ color: colors.primary }}>{busy ? 'Đang xử lý...' : 'Tìm bạn'}</Text></Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      {results !== null && <><Text style={{ fontSize: 18, fontWeight: '700' }}>Kết quả tìm kiếm</Text>{!results.length && <Text>Chưa tìm thấy người dùng phù hợp.</Text>}{results.map(person => row(person, person.friendshipStatus === 'accepted' ? <Text>Đã là bạn bè</Text> : person.friendshipStatus === 'pending' ? <Text>{person.incoming ? 'Có lời mời từ người này ở bên dưới' : 'Đã gửi lời mời'}</Text> : <Pressable accessibilityRole="button" accessibilityLabel={'Kết bạn với ' + person.name} disabled={busy} onPress={() => void run(async () => { await requestFriend(person.id); await remote.reload(); setResults(await searchPeople(query.trim())); })}><Text style={{ color: colors.primary }}>Kết bạn</Text></Pressable>))}</>}
      {remote.loading || remote.error ? <RemoteState {...remote} onRetry={remote.reload} /> : <>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Lời mời kết bạn</Text>
        {!remote.data.requests.length && <Text style={{ color: colors.textMuted }}>Chưa có lời mời đang chờ.</Text>}
        {remote.data.requests.map(person => row(person, person.incoming ? <View style={{ flexDirection: 'row', gap: 24 }}><Pressable accessibilityRole="button" accessibilityLabel={'Chấp nhận ' + person.name} disabled={busy} onPress={() => void run(async () => { await decideFriend(person.friendshipId!, 'accepted'); await remote.reload(); setResults(null); })}><Text style={{ color: colors.primary }}>Chấp nhận</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await decideFriend(person.friendshipId!, 'declined'); await remote.reload(); })}><Text>Từ chối</Text></Pressable></View> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await removeFriend(person.id); await remote.reload(); })}><Text>Hủy lời mời đã gửi</Text></Pressable>))}
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Bạn bè ({remote.data.friends.length})</Text>
        {!remote.data.friends.length && <Text>Kết bạn từ hồ sơ thành viên hoặc tìm bằng tên/Nickname ở trên.</Text>}
        {remote.data.friends.map(person => row(person, <View style={{ flexDirection: 'row', gap: 24 }}><Pressable accessibilityRole="button" accessibilityLabel={'Nhắn tin cho ' + person.name} disabled={busy} onPress={() => void run(() => onChat(person.id))}><Text style={{ color: colors.primary, fontWeight: '600' }}>Nhắn tin</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => setRemoveId(person.id)}><Text style={{ color: colors.textSecondary }}>Bỏ kết bạn</Text></Pressable></View>))}
      </>}
    </ScrollView>
    <Modal transparent animationType="fade" visible={Boolean(removeId)} onRequestClose={() => setRemoveId('')}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 14, maxWidth: 380, width: '100%', alignSelf: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Bỏ kết bạn với người này?</Text>
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <Pressable accessibilityRole="button" onPress={() => setRemoveId('')} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}><Text style={{ fontWeight: '600' }}>Giữ lại</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await removeFriend(removeId); setRemoveId(''); await remote.reload(); })} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.danger }}><Text style={{ color: colors.white, fontWeight: '700' }}>Xác nhận bỏ kết bạn</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
    {profileId && <MemberProfileModal userId={profileId} onClose={() => setProfileId(null)} />}
  </SafeAreaView>;
}
