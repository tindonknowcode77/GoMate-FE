import * as Location from 'expo-location';
import { Platform } from 'react-native';
export type Coordinates = { latitude: number; longitude: number };
export function validCoordinates(value: unknown): value is Coordinates {
  const point = value as Coordinates | undefined;
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
}
export async function currentCoordinates(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Chưa được cấp quyền vị trí. Bạn có thể chọn điểm trên bản đồ hoặc bật quyền trong cài đặt.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Dịch vụ vị trí đang tắt. Bật Vị trí trong cài đặt thiết bị rồi thử lại.');
  // A recent fix avoids waiting for another GPS fix, including on emulators.
  const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 }).catch(() => null);
  if (cached && validCoordinates(cached.coords)) return { latitude: cached.coords.latitude, longitude: cached.coords.longitude };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const unavailable = Platform.OS === 'android'
    ? 'Chưa nhận được vị trí. Nếu dùng Android Emulator, mở Extended controls → Location → Set location rồi thử lại. Bạn cũng có thể chọn trên bản đồ.'
    : 'Chưa nhận được vị trí. Kiểm tra dịch vụ vị trí rồi thử lại hoặc chọn trên bản đồ.';
  try {
    const position = await Promise.race([
      // High accuracy includes Android's GPS provider; Balanced can wait for a
      // network fix even when the emulator is already supplying GPS coordinates.
      Location.getCurrentPositionAsync({ accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced, mayShowUserSettingsDialog: true }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(unavailable)), 12000); }),
    ]);
    if (!validCoordinates(position.coords)) throw new Error(unavailable);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    throw new Error(unavailable);
  } finally { clearTimeout(timeout); }
}
