import { ActivityInvitations } from '../components/ActivityInvitations';
import { useFeedbackState } from '../services/feedback';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormField } from '../components/FormField';
import { Text } from '../components/LocalizedText';
import { RemoteState } from '../components/RemoteState';
import { UserAvatar } from '../components/UserAvatar';
import { MemberProfileModal } from '../components/MemberProfileModal';
import { decideFriend, Friend, getNearbyStatus, listFriendRequests, listFriends, removeFriend, requestFriend, scanNearbyPeople, searchPeople, updateNearbyPresence } from '../services/friendService';
import { Coordinates, currentCoordinates } from '../services/locationService';
import { useRemote } from '../services/useRemote';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { colors, layout } from '../theme';

const NEARBY_RADII = [5, 10, 25, 50];

async function load() {
  const [friends, requests] = await Promise.all([listFriends(), listFriendRequests()]);
  return { friends, requests };
}

export function FriendsScreen({ onBack, onChat, onInvitationAccepted }: { onBack: () => void; onChat: (userId: string) => Promise<void>; onInvitationAccepted?: (activityId: string) => Promise<void> }) {
  const remote = useRemote(load, { friends: [], requests: [] });
  const [query, setQuery] = useState(''), [results, setResults] = useState<Friend[] | null>(null), [error, setError] = useFeedbackState(''), [busy, setBusy] = useState(false), [removeId, setRemoveId] = useState(''), [profileId, setProfileId] = useState<string | null>(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyCoords, setNearbyCoords] = useState<Coordinates | null>(null);
  const [nearbyRadius, setNearbyRadius] = useState<number>(10);
  const [nearbyResults, setNearbyResults] = useState<Friend[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const lock = useRef(false), reload = remote.reload;
  useLiveRefresh(reload);

  useEffect(() => {
    let alive = true;
    void getNearbyStatus().then(presence => {
      if (!alive) return;
      setNearbyEnabled(Boolean(presence.enabled));
      if (presence.enabled && Number.isFinite(presence.latitude) && Number.isFinite(presence.longitude)) {
        setNearbyCoords({ latitude: presence.latitude!, longitude: presence.longitude! });
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu'); }
    finally { lock.current = false; setBusy(false); }
  };

  const handleScanNearby = async (customRadius = nearbyRadius) => {
    if (scanning) return;
    setScanning(true);
    setNearbyError('');
    try {
      const gps = await currentCoordinates();
      setNearbyCoords(gps);
      setNearbyEnabled(true);
      const found = await scanNearbyPeople(gps, customRadius);
      setNearbyResults(found);
    } catch (reason) {
      setNearbyError(reason instanceof Error ? reason.message : 'Chưa lấy được vị trí GPS để quét bạn xung quanh.');
    } finally {
      setScanning(false);
    }
  };

  const handleStopSharingLocation = async () => {
    if (scanning) return;
    setScanning(true);
    setNearbyError('');
    try {
      await updateNearbyPresence({ enabled: false });
      setNearbyEnabled(false);
      setNearbyCoords(null);
      setNearbyResults(null);
    } catch (reason) {
      setNearbyError(reason instanceof Error ? reason.message : 'Chưa tắt được chia sẻ vị trí.');
    } finally {
      setScanning(false);
    }
  };

  const row = (person: Friend, children: React.ReactNode) => <View key={person.id} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${person.name}`} onPress={() => setProfileId(person.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <UserAvatar uri={person.avatarUrl} name={person.name} size={46} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{person.name}</Text>
          {person.distanceKm !== undefined ? (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={12} color={colors.primary} />
              <Text style={styles.distanceBadgeText}>{person.distanceKm < 0.1 ? 'Dưới 100m' : `Cách ${person.distanceKm} km`}</Text>
            </View>
          ) : null}
        </View>
        {person.username ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{person.username}</Text> : null}
        {person.location ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{person.location}</Text> : null}
      </View>
    </Pressable>
    {children}
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Bạn bè GoMate" onBack={onBack} right={<Pressable accessibilityRole="button" accessibilityLabel="Làm mới bạn bè" onPress={() => void remote.reload()}><Text style={{ color: colors.primary }}>Làm mới</Text></Pressable>} />
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <ActivityInvitations onAccepted={onInvitationAccepted} />

      <View style={styles.radarCard}>
        <View style={styles.radarHeader}>
          <View style={styles.radarIconWrap}>
            <Ionicons name="radio-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.radarTitle}>Radar GPS · Quét bạn xung quanh</Text>
            <Text style={styles.radarSubtitle}>
              {nearbyEnabled
                ? 'Đang bật chia sẻ vị trí để bạn và mọi người quanh đây tìm thấy nhau.'
                : 'Bật chia sẻ vị trí GPS để tìm những người dùng GoMate đang ở gần bạn.'}
            </Text>
          </View>
        </View>

        <View style={styles.radiusRow}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>Bán kính quét:</Text>
          {NEARBY_RADII.map(km => (
            <Pressable
              key={km}
              accessibilityRole="button"
              onPress={() => {
                setNearbyRadius(km);
                if (nearbyCoords) void handleScanNearby(km);
              }}
              style={[styles.radiusChip, nearbyRadius === km && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: nearbyRadius === km ? colors.primary : colors.textSecondary }}>{km} km</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.radarActions}>
          <Pressable
            accessibilityRole="button"
            disabled={scanning}
            onPress={() => void handleScanNearby(nearbyRadius)}
            style={[styles.scanButton, scanning && { opacity: 0.6 }]}
          >
            <Ionicons name="locate" size={17} color={colors.white} />
            <Text style={styles.scanButtonText}>
              {scanning ? 'Đang quét GPS...' : nearbyResults !== null ? `Quét lại quanh đây (${nearbyRadius} km)` : `Chia sẻ vị trí & Quét bạn quanh đây`}
            </Text>
          </Pressable>
          {nearbyEnabled && (
            <Pressable
              accessibilityRole="button"
              disabled={scanning}
              onPress={() => void handleStopSharingLocation()}
              style={styles.stopShareButton}
            >
              <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.stopShareText}>Ẩn vị trí</Text>
            </Pressable>
          )}
        </View>
        {nearbyError ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>{nearbyError}</Text> : null}
      </View>

      {nearbyResults !== null && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Bạn ở xung quanh ({nearbyResults.length}) · trong {nearbyRadius} km
          </Text>
          {!nearbyResults.length && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Chưa có người dùng nào khác bật chia sẻ vị trí trong bán kính {nearbyRadius} km quanh bạn. Hãy thử tăng bán kính quét lên 25 km hoặc 50 km.
            </Text>
          )}
          {nearbyResults.map(person => row(
            person,
            person.friendshipStatus === 'accepted' ? (
              <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
                <Text style={{ color: colors.successText, fontWeight: '600', fontSize: 13 }}>Đã là bạn bè</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(() => onChat(person.id))}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Nhắn tin</Text>
                </Pressable>
              </View>
            ) : person.friendshipStatus === 'pending' ? (
              <Text style={{ color: colors.textMuted }}>{person.incoming ? 'Có lời mời từ người này ở bên dưới' : 'Đã gửi lời mời kết bạn'}</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Kết bạn với ' + person.name}
                disabled={busy}
                onPress={() => void run(async () => {
                  await requestFriend(person.id);
                  await remote.reload();
                  if (nearbyCoords) setNearbyResults(await scanNearbyPeople(nearbyCoords, nearbyRadius));
                })}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Kết bạn</Text>
              </Pressable>
            )
          ))}
        </View>
      )}

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

const styles = StyleSheet.create({
  radarCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  radarSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  scanButton: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  scanButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  stopShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  stopShareText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
