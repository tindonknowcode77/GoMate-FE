import * as Location from 'expo-location';
export type Coordinates = { latitude: number; longitude: number };
export function validCoordinates(value: unknown): value is Coordinates {
  const point = value as Coordinates | undefined;
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
}
export function distanceKmBetween(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}
export async function currentCoordinates(): Promise<Coordinates> {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        });
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      // Fallback to expo-location if browser geolocation fails
    }
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Chưa được cấp quyền vị trí. Bạn có thể chọn điểm trên bản đồ hoặc bật quyền trong cài đặt.');
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Chưa lấy được GPS. Thử lại ngoài trời hoặc chọn trên bản đồ.')), 20000); }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } finally { clearTimeout(timeout); }
}
