import type { ActivityFilters } from '../screens/FilterScreen';

export const MAX_RADIUS_SLIDER = 50;
export function normalizeSearchRadius<T extends { distance: number; radiusEnabled: boolean }>(filters: T): T {
  const distance = filters.radiusEnabled === false ? MAX_RADIUS_SLIDER : Math.max(1, Math.min(MAX_RADIUS_SLIDER, Math.round(filters.distance) || 10));
  return { ...filters, distance, radiusEnabled: distance < MAX_RADIUS_SLIDER };
}
export const radiusLabel = (distance: number) => distance >= MAX_RADIUS_SLIDER ? '50 km+' : `${distance} km`;
export const radiusLimitKm = (filters: Pick<ActivityFilters, 'radiusEnabled' | 'distance'>) => filters.radiusEnabled && filters.distance < MAX_RADIUS_SLIDER ? filters.distance : undefined;
export const requiresSearchPoint = (filters: Pick<ActivityFilters, 'radiusEnabled' | 'distance' | 'sort'>) => radiusLimitKm(filters) !== undefined || filters.sort === 'nearest';
export function withinSearchRadius(activity: { distanceKm?: number | null }, filters: Pick<ActivityFilters, 'radiusEnabled' | 'distance'>) {
  const limit = radiusLimitKm(filters);
  return limit === undefined || (typeof activity.distanceKm === 'number' && Number.isFinite(activity.distanceKm) && activity.distanceKm >= 0 && activity.distanceKm <= limit);
}

function isoDate(value: string) { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); return match ? `${match[3]}-${match[2]}-${match[1]}` : ''; }
export function activityQuery(filters?: ActivityFilters) {
  if (!filters) return '';
  const query = new URLSearchParams();
  query.set('sort', filters.sort || 'recommended');
  if (filters.organizerType && filters.organizerType !== 'all') query.set('organizerType', filters.organizerType);
  for (const key of ['province', 'district', 'ward'] as const) if (filters[key] && filters[key] !== 'Tất cả') query.set(key, filters[key]!);
  if (filters.coordinates && requiresSearchPoint(filters)) {
    query.set('lat', String(filters.coordinates.latitude)); query.set('lng', String(filters.coordinates.longitude));
    const limit = radiusLimitKm(filters);
    if (limit !== undefined) query.set('distanceKm', String(limit));
  }
  if (filters.categories.length) query.set('categories', filters.categories.join(','));
  if (filters.minBudget) query.set('minCost', String(filters.minBudget));
  if (filters.maxBudget < 2000000) query.set('maxCost', String(filters.maxBudget));
  if (filters.dateFrom) query.set('dateFrom', isoDate(filters.dateFrom));
  if (filters.dateTo) query.set('dateTo', isoDate(filters.dateTo));
  if (filters.fromTime) query.set('fromTime', filters.fromTime);
  if (filters.toTime) query.set('toTime', filters.toTime);
  if (filters.availableDays.length) query.set('days', filters.availableDays.map(value => value === 'CN' ? 7 : Number(value.slice(1)) - 1).join(','));
  if (filters.minimumCapacity) query.set('minParticipants', String(filters.minimumCapacity));
  if (filters.maximumCapacity) query.set('maxParticipants', String(filters.maximumCapacity));
  const preferences = filters.preferences;
  if (preferences.minAge) query.set('minAge', String(preferences.minAge));
  if (preferences.maxAge) query.set('maxAge', String(preferences.maxAge));
  if (preferences.genders[0]) query.set('gender', preferences.genders[0]);
  if (preferences.languages[0]) query.set('language', preferences.languages[0]);
  if (preferences.religions[0]) query.set('religion', preferences.religions[0]);
  if (preferences.alcohol !== 'any') query.set('alcohol', preferences.alcohol);
  if (preferences.dressCode) query.set('dressCode', preferences.dressCode);
  return query.toString();
}
