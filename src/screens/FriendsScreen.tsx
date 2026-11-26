import { ActivityInvitations } from '../components/ActivityInvitations';
import { useFeedbackState } from '../services/feedback';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
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
  const remote = useRemote(load, { friends: [], requests: [] }, true, {
    cacheKey: 'friends',
    staleTimeMs: 20000,
    tags: ['friends'],
  });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Friend[] | null>(null);
  const [error, setError] = useFeedbackState('');
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const lock = useRef(false);
  const reload = remote.reload;
  useLiveRefresh(reload);

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu'); }
    finally { lock.current = false; setBusy(false); }
  };

  const doSearch = () => void run(async () => {
    setResults(await searchPeople(query.trim()));
  });

  const row = (person: Friend, children: React.ReactNode) => (
    <View key={person.id} style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${person.name}`} onPress={() => setProfileId(person.id)} style={styles.personRow}>
        <UserAvatar uri={person.avatarUrl} name={person.name} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={styles.personName}>{person.name}</Text>
          {person.username ? <Text style={styles.personMeta}>@{person.username}</Text> : null}
          {person.location ? <Text style={styles.personMeta}>{person.location}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Bạn bè GoMate"
        onBack={onBack}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Làm mới bạn bè" onPress={() => void remote.reload()} style={styles.iconBtn}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <ActivityInvitations onAccepted={onInvitationAccepted} />

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.primary} />
          <TextInput
            accessibilityLabel="Tìm bạn bằng tên hoặc Nickname"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
            placeholder="Tìm theo tên hoặc @nickname..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <Pressable accessibilityRole="button" disabled={busy || query.trim().length < 2} onPress={doSearch} style={[styles.searchBtn, (busy || query.trim().length < 2) && { opacity: 0.45 }]}>
            <Text style={styles.searchBtnText}>{busy ? '...' : 'Tìm'}</Text>
          </Pressable>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {results !== null && (
          <>
            <Text style={styles.sectionTitle}>Kết quả tìm kiếm</Text>
            {!results.length && <Text style={styles.emptyText}>Chưa tìm thấy người dùng phù hợp.</Text>}
            {results.map(person => row(
              person,
              person.friendshipStatus === 'accepted' ? (
                <View style={styles.statusTag}><Ionicons name="checkmark-circle" size={15} color={colors.success} /><Text style={styles.statusTagText}>Đã là bạn bè</Text></View>
              ) : person.friendshipStatus === 'pending' ? (
                <View style={styles.statusTag}><Ionicons name="time-outline" size={15} color={colors.primary} /><Text style={styles.statusTagText}>{person.incoming ? 'Đã gửi lời mời cho bạn' : 'Đã gửi lời mời'}</Text></View>
              ) : (
                <View style={styles.btnRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={'Kết bạn với ' + person.name} disabled={busy} onPress={() => void run(async () => { await requestFriend(person.id); await remote.reload(); setResults(await searchPeople(query.trim())); })} style={[styles.btnPrimary, busy && { opacity: 0.5 }]}>
                    <Ionicons name="person-add-outline" size={16} color={colors.white} />
                    <Text style={styles.btnPrimaryText}>Kết bạn</Text>
                  </Pressable>
                </View>
              )
            ))}
          </>
        )}

        {(remote.loading && !remote.data.friends.length && !remote.data.requests.length) || (remote.error && !remote.data.friends.length && !remote.data.requests.length) ? (
          <RemoteState {...remote} onRetry={remote.reload} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Lời mời kết bạn</Text>
            {!remote.data.requests.length && <Text style={styles.emptyText}>Chưa có lời mời đang chờ.</Text>}
            {remote.data.requests.map(person => row(
              person,
              person.incoming ? (
                <View style={styles.btnRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={'Chấp nhận ' + person.name} disabled={busy} onPress={() => void run(async () => { await decideFriend(person.friendshipId!, 'accepted'); await remote.reload(); setResults(null); })} style={[styles.btnPrimary, busy && { opacity: 0.5 }]}>
                    <Text style={styles.btnPrimaryText}>Chấp nhận</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await decideFriend(person.friendshipId!, 'declined'); await remote.reload(); })} style={[styles.btnSecondary, busy && { opacity: 0.5 }]}>
                    <Text style={styles.btnSecondaryText}>Từ chối</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await removeFriend(person.id); await remote.reload(); })} style={[styles.btnSecondary, busy && { opacity: 0.5 }]}>
                    <Text style={styles.btnSecondaryText}>Hủy lời mời</Text>
                  </Pressable>
                </View>
              )
            ))}

            <Text style={styles.sectionTitle}>Bạn bè ({remote.data.friends.length})</Text>
            {!remote.data.friends.length && <Text style={styles.emptyText}>Chưa có bạn bè nào.</Text>}
            {remote.data.friends.map(person => row(
              person,
              <View style={styles.btnRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={'Nhắn tin cho ' + person.name} disabled={busy} onPress={() => void run(() => onChat(person.id))} style={[styles.btnSoft, busy && { opacity: 0.5 }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                  <Text style={styles.btnSoftText}>Nhắn tin</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => setRemoveId(person.id)} style={[styles.btnSecondary, busy && { opacity: 0.5 }]}>
                  <Text style={styles.btnSecondaryText}>Bỏ kết bạn</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal transparent animationType="fade" visible={Boolean(removeId)} onRequestClose={() => setRemoveId('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bỏ kết bạn với người này?</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setRemoveId('')} style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>Giữ lại</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => { await removeFriend(removeId); setRemoveId(''); await remote.reload(); })} style={styles.btnDanger}><Text style={styles.btnPrimaryText}>Bỏ kết bạn</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {profileId && <MemberProfileModal userId={profileId} onClose={() => setProfileId(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 18, gap: 14, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingLeft: 14, paddingRight: 6, height: 50 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, minWidth: 0 },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 11, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontWeight: '700', color: colors.text, fontSize: 15 },
  personMeta: { color: colors.textMuted, fontSize: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, height: 40, paddingHorizontal: 14 },
  btnPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  btnSoft: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 12, height: 40, paddingHorizontal: 14 },
  btnSoftText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 40, paddingHorizontal: 14 },
  btnSecondaryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  btnDanger: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger, borderRadius: 12, height: 40, paddingHorizontal: 14 },
  statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusTagText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 16, maxWidth: 380, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 10 },
});
