import type { Coordinates } from './locationService';

// Great-circle distance between the searching user's GPS and the event pin.
export function distanceBetweenKm(origin: Coordinates, destination: Coordinates): number | null {
  if (![origin, destination].every(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180)) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(destination.latitude - origin.latitude);
  const longitude = radians(destination.longitude - origin.longitude);
  const a = Math.min(1, Math.max(0, Math.sin(latitude / 2) ** 2 + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) * Math.sin(longitude / 2) ** 2));
  return 6378.137 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
