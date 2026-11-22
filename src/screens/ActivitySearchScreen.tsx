import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { BusinessIdentity } from '../components/BusinessIdentity';
import { Activity } from '../data/activities';
import { listActivities, listMyRequests, toActivity } from '../services/activityApi';
import { Coordinates, currentCoordinates } from '../services/locationService';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';

const RADIUS_OPTIONS = [5, 10, 25, 50];

export function ActivitySearchScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (activity: Activity) => void }) {
  const [text, setText] = useState(''), [query, setQuery] = useState(''), [kind, setKind] = useState<'all' | 'personal' | 'business'>('all');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const load = useCallback(async () => {
    const params: string[] = [];
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    if (kind !== 'all') params.push(`organizerType=${kind}`);
    if (coords) {
      params.push(`lat=${coords.latitude}`);
      params.push(`lng=${coords.longitude}`);
      params.push(`distanceKm=${radiusKm}`);
      params.push('sort=nearest');
    } else {
      params.push('sort=soonest');
    }
    const [rows, requests] = await Promise.all([listActivities(params.join('&')), listMyRequests()]);
    return rows.map(row => toActivity(row, requests.find(request => request.activityId === row.id)?.status));
  }, [query, kind, coords, radiusKm]);

  const remote = useRemote(load, []);
  const search = () => { if (query === text.trim()) void remote.reload(); else setQuery(text.trim()); };

  const locateNearby = async () => {
    if (locating) return;
    setLocating(true);
    setGpsError('');
    try {
      const gps = await currentCoordinates();
      setCoords(gps);
    } catch (reason) {
      setGpsError(reason instanceof Error ? reason.message : 'Không lấy được vị trí GPS.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Tìm hoạt động" subtitle="Tìm theo tên, địa điểm hoặc định vị GPS gần bạn" onBack={onBack} />
      <View style={styles.page}>
        <View style={styles.search}>
          <Ionicons name="search" color={colors.primary} size={22} />
          <TextInput accessibilityLabel="Tìm tên hoạt động" value={text} onChangeText={setText} onSubmitEditing={search} returnKeyType="search" placeholder="Nhập tên hoạt động, địa điểm..." style={styles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel="Tìm kiếm hoạt động" style={styles.searchButton} onPress={search}>
            <Ionicons name="arrow-forward" size={22} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.filters}>
          {([['all', 'Tất cả'], ['personal', 'Cá nhân'], ['business', 'Doanh nghiệp']] as const).map(([id, label]) => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === id }} key={id} onPress={() => setKind(id)} style={[styles.chip, kind === id && { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: kind === id ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>{label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={locating}
            onPress={() => { if (coords) setCoords(null); else void locateNearby(); }}
            style={[styles.gpsBtn, coords && { backgroundColor: colors.primary }]}
          >
            <Ionicons name="locate" size={15} color={coords ? colors.white : colors.primary} />
            <Text style={{ color: coords ? colors.white : colors.primary, fontWeight: '700', fontSize: 12 }}>
              {locating ? 'Đang lấy GPS...' : coords ? `Gần tôi (${radiusKm} km) ✕` : 'Gần tôi (GPS)'}
            </Text>
          </Pressable>
        </View>
        {coords && (
          <View style={styles.radiusRow}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>Bán kính GPS:</Text>
            {RADIUS_OPTIONS.map(km => (
              <Pressable
                key={km}
                accessibilityRole="button"
                onPress={() => setRadiusKm(km)}
                style={[styles.radiusChip, radiusKm === km && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: radiusKm === km ? colors.primary : colors.textSecondary }}>{km} km</Text>
              </Pressable>
            ))}
          </View>
        )}
        {gpsError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{gpsError}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 32 }]} refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
        <RemoteState {...remote} onRetry={remote.reload} />
        {!remote.loading && !remote.error && (
          <Text style={styles.caption}>
            {remote.data.length} hoạt động phù hợp{coords ? ` trong bán kính ${radiusKm} km quanh vị trí GPS của bạn` : ''}
          </Text>
        )}
        {remote.data.map(activity => (
          <Pressable accessibilityRole="button" accessibilityLabel={'Xem hoạt động ' + activity.title} onPress={() => onOpen(activity)} key={activity.id} style={[styles.card, activity.organizerType === 'business' && { borderColor: '#44A58E', borderWidth: 2 }]}>
            <Image source={activity.image} style={styles.image} />
            <View style={styles.copy}>
              <BusinessIdentity activity={activity} />
              <Text style={styles.title}>{activity.title}</Text>
              <Text style={styles.caption}>{activity.host}</Text>
              <Text style={styles.caption}>{activity.time}</Text>
              <Text style={styles.caption}>{activity.location} · {activity.members} người{activity.distance && activity.distance !== 'Chưa có vị trí' ? ` · Cách bạn ${activity.distance}` : ''}</Text>
              <View style={styles.bottom}>
                <Text style={styles.price}>{activity.estimatedCost}</Text>
                <Text style={styles.link}>{activity.requestStatus === 'approved' ? 'Đã tham gia' : activity.requestStatus === 'pending' ? 'Đang chờ duyệt' : 'Xem chi tiết →'}</Text>
              </View>
            </View>
          </Pressable>
        ))}
        {!remote.loading && !remote.error && !remote.data.length && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.primary} />
            <Text style={styles.title}>Chưa tìm thấy hoạt động</Text>
            <Text style={styles.caption}>{coords ? `Chưa có hoạt động nào trong bán kính ${radiusKm} km. Hãy thử tăng bán kính hoặc tắt lọc GPS.` : 'Thử tên ngắn hơn hoặc kéo xuống để làm mới sau khi bài được đăng.'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: colors.surface, paddingLeft: 14, paddingRight: 5, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, height: 52, minWidth: 0, fontSize: 14, color: colors.text, outlineWidth: 0 },
  searchButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primarySoft },
  radiusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  radiusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface },
  image: { width: '100%', height: 150 },
  copy: { padding: 16, gap: 7 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  caption: { fontSize: 12, color: colors.textSecondary, lineHeight: 19 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  price: { color: colors.text, fontWeight: '700', fontSize: 13 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  empty: { alignItems: 'center', gap: 14, padding: 28 },
});
