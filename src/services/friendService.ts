import { api, post } from './api';
import { allPages } from './activityApi';
export type Friend = { id: string; name: string; username: string; location: string; avatarUrl: string | null; distanceKm?: number; nearbyUpdatedAt?: string | null; friendshipId?: string; friendshipStatus?: 'pending' | 'accepted' | 'declined'; incoming?: boolean };
export type NearbyPresence = { enabled: boolean; latitude?: number; longitude?: number; updatedAt?: string };
export const listFriends = () => allPages<Friend>('/friends');
export const listFriendRequests = () => allPages<Friend>('/friends/requests');
export const searchPeople = async (query: string) => (await api<{ items: Friend[] }>(`/friends/search?q=${encodeURIComponent(query)}`)).items;
export const getNearbyStatus = async () => (await api<{ presence: NearbyPresence }>('/friends/nearby/status')).presence;
export const updateNearbyPresence = async (body: { enabled: boolean; latitude?: number; longitude?: number }) =>
  (await api<{ presence: NearbyPresence }>('/friends/nearby/presence', { method: 'PUT', body: JSON.stringify(body) })).presence;
export const scanNearbyPeople = async (point: { latitude: number; longitude: number }, radiusKm = 10) =>
  (await api<{ items: Friend[] }>(`/friends/nearby?lat=${point.latitude}&lng=${point.longitude}&radiusKm=${radiusKm}`)).items;
export const requestFriend = (userId: string) => post('/friends/requests', { userId });
export const decideFriend = (id: string, status: 'accepted' | 'declined') => api(`/friends/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const removeFriend = (id: string) => api(`/friends/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getFriendship = async (id: string) => (await api<{ friendship: { id?: string; status: string; incoming?: boolean } }>(`/friends/${encodeURIComponent(id)}`)).friendship;
