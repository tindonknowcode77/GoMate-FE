import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlacePicker } from './PlacePicker';
import { ActivityMap } from './ActivityMap';
import { MapAttribution } from './MapAttribution';
import { Text } from './LocalizedText';
import { Coordinates, currentCoordinates } from '../services/locationService';
import { getMapsConfig, MapPlace, MapsConfig, reversePlace } from '../services/mapsService';
import type { SearchProvider } from '../services/mapsService';
import { useRemote } from '../services/useRemote';
import { colors } from '../theme';

export function LocationField({ value, onChange, radiusKm, onPlaceSelected }: { value?: Coordinates | null; onChange: (point: Coordinates | null) => void; radiusKm?: number; onPlaceSelected?: (place: MapPlace) => void }) {
  const config = useRemote<MapsConfig | null>(getMapsConfig, null, true, {
    cacheKey: 'maps-config',
    staleTimeMs: 5 * 60 * 1000,
    tags: ['static'],
  });
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [placeProvider, setPlaceProvider] = useState<SearchProvider>();
  const [pickedLabel, setPickedLabel] = useState('');
  const lock = useRef(false);
  const reverseRequest = useRef(0);

  useEffect(() => () => { reverseRequest.current++; }, []);

  const selectPoint = (point: Coordinates) => {
    const current = ++reverseRequest.current;
    onChange(point);
    setError('');
    setPlaceProvider(undefined);
    setPickedLabel('');
    if (!onPlaceSelected) return;
    if (config.data && !config.data.placesEnabled) {
      setResolvingAddress(false);
      return;
    }
    setResolvingAddress(true);
    void reversePlace(point).then(place => {
      if (current === reverseRequest.current) {
        onPlaceSelected(place);
        setPlaceProvider(place.provider);
        setPickedLabel(place.title || place.address || '');
      }
    }).catch(reason => {
      if (current === reverseRequest.current) setError(reason instanceof Error ? reason.message : 'Chưa nhận diện được địa chỉ tại điểm này.');
    }).finally(() => {
      if (current === reverseRequest.current) setResolvingAddress(false);
    });
  };

  const locate = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      selectPoint(await currentCoordinates());
      setOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lấy được vị trí hiện tại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const clearPoint = () => {
    reverseRequest.current++;
    setResolvingAddress(false);
    setPlaceProvider(undefined);
    setPickedLabel('');
    setError('');
    onChange(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.statusCard}>
        <View style={[styles.statusIcon, value && styles.statusIconActive]}>
          <Ionicons name={value ? 'location' : 'location-outline'} size={18} color={value ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{value ? 'Đã ghim vị trí bản đồ' : 'Vị trí trên bản đồ'}</Text>
          <Text numberOfLines={1} style={styles.statusSubtitle}>
            {resolvingAddress
              ? 'Đang nhận diện địa chỉ...'
              : value
                ? (pickedLabel || 'Đã sẵn sàng chỉ đường cho thành viên')
                : 'Chọn vị trí hiện tại hoặc ghim trên bản đồ'}
          </Text>
        </View>
        {value && (
          <Pressable accessibilityRole="button" accessibilityLabel="Gỡ vị trí đã chọn" onPress={clearPoint} style={styles.clearBtn}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void locate()} style={[styles.pillPrimary, busy && { opacity: 0.6 }]}>
          <Ionicons name="locate-outline" size={16} color={colors.primary} />
          <Text style={styles.pillPrimaryText}>{busy ? 'Đang định vị...' : 'Vị trí hiện tại'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={styles.pillSecondary}>
          <Ionicons name={open ? 'chevron-up-outline' : 'map-outline'} size={16} color={colors.textSecondary} />
          <Text style={styles.pillSecondaryText}>{open ? 'Ẩn bản đồ' : 'Chọn bản đồ'}</Text>
        </Pressable>
        {config.data?.placesEnabled && (
          <Pressable accessibilityRole="button" accessibilityLabel="Tìm địa chỉ" onPress={() => setSearching(true)} style={styles.pillSecondary}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.pillSecondaryText}>Tìm nhanh</Text>
          </Pressable>
        )}
      </View>

      {open && (
        <View style={styles.mapWrap}>
          <Text style={styles.mapHint}>Chạm vào bản đồ để đặt ghim chính xác</Text>
          <ActivityMap point={value ?? { latitude: 10.7769, longitude: 106.7009 }} radiusKm={radiusKm} editable onChange={selectPoint} />
          {placeProvider && <MapAttribution provider={placeProvider} />}
        </View>
      )}

      {searching && (
        <PlacePicker
          bias={value}
          onClose={() => setSearching(false)}
          onSelect={place => {
            reverseRequest.current++;
            setResolvingAddress(false);
            setError('');
            setPlaceProvider(place.provider);
            setPickedLabel(place.title || place.address || '');
            onChange(place.point);
            onPlaceSelected?.(place);
            setOpen(true);
            setSearching(false);
          }}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  statusCard: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  statusIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 11, height: 36, justifyContent: 'center', width: 36 },
  statusIconActive: { backgroundColor: colors.primarySoft },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  statusSubtitle: { color: colors.textSecondary, fontSize: 11.5 },
  clearBtn: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 10, height: 28, justifyContent: 'center', width: 28 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillPrimary: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  pillPrimaryText: { color: colors.primary, fontSize: 12.5, fontWeight: '700' },
  pillSecondary: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  pillSecondaryText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '600' },
  mapWrap: { gap: 8 },
  mapHint: { color: colors.textMuted, fontSize: 11.5 },
  error: { color: colors.danger, fontSize: 12 },
});
