import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityMap } from './ActivityMap';
import { Text } from './LocalizedText';
import { Coordinates, currentCoordinates, distanceKmBetween } from '../services/locationService';
import { directionsUrl, DirectionsMode } from '../services/mapsService';
import { colors } from '../theme';

export function RouteMap({ point }: { point: Coordinates }) {
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState<Coordinates | undefined>();
  const [locating, setLocating] = useState(false);

  const locateMe = async () => {
    setLocating(true);
    setError('');
    try {
      const gps = await currentCoordinates();
      setOrigin(gps);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lấy được vị trí GPS hiện tại.');
    } finally {
      setLocating(false);
    }
  };

  const open = async (mode: DirectionsMode) => {
    setError('');
    try {
      let currentOrigin = origin;
      if (!currentOrigin) {
        try {
          currentOrigin = await currentCoordinates();
          setOrigin(currentOrigin);
        } catch {
          // Proceed without origin if permission not granted
        }
      }
      await Linking.openURL(directionsUrl(point, currentOrigin, mode));
    } catch {
      setError('Chưa mở được Google Maps. Vui lòng thử lại.');
    }
  };

  const distanceKm = origin ? distanceKmBetween(origin, point) : null;

  return (
    <View style={{ gap: 12 }}>
      <ActivityMap point={point} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ color: colors.textSecondary }}>
          {distanceKm !== null ? `Cách vị trí GPS của bạn ~${distanceKm} km` : 'Chỉ đường bằng Google Maps'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={locating}
          onPress={() => void locateMe()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="locate" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
            {locating ? 'Đang định vị...' : origin ? 'Cập nhật GPS của tôi' : 'Đo khoảng cách từ GPS'}
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {([['DRIVE', 'Ô tô', 'car-outline'], ['MOTORCYCLE', 'Xe máy', 'bicycle-outline'], ['WALK', 'Đi bộ', 'walk-outline']] as const).map(([mode, label, icon]) => (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={`Chỉ đường: ${label}`}
            onPress={() => void open(mode)}
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.primarySoft }}
          >
            <Ionicons name={icon} color={colors.primary} size={20} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
