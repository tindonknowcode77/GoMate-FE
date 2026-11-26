import { getSession, subscribeMutation, subscribeSession } from './api';

export type CacheEntry<T = unknown> = {
  value: T;
  updatedAt: number;
  staleAt: number;
  tags: string[];
};

const MAX_ENTRIES = 250;
const cache = new Map<string, CacheEntry>();
const clearListeners = new Set<() => void>();
const staleListeners = new Set<(tags?: string[]) => void>();
let activeSessionKey = sessionIdentity();

function sessionIdentity() {
  const current = getSession();
  return current ? `${current.user.id}:${current.accessToken}` : 'guest';
}

function ensureSessionScope() {
  const current = sessionIdentity();
  if (current !== activeSessionKey) {
    activeSessionKey = current;
    cache.clear();
    clearListeners.forEach(listener => listener());
  }
}

export function onCacheCleared(listener: () => void) {
  clearListeners.add(listener);
  return () => { clearListeners.delete(listener); };
}

export function onCacheStale(listener: (tags?: string[]) => void) {
  staleListeners.add(listener);
  return () => { staleListeners.delete(listener); };
}

export function clearRemoteCache() {
  activeSessionKey = sessionIdentity();
  cache.clear();
  clearListeners.forEach(listener => listener());
}

export function getCached<T>(key: string): { value: T; fresh: boolean; updatedAt: number } | null {
  ensureSessionScope();
  const entry = cache.get(key);
  if (!entry) return null;
  // Refresh LRU order on read.
  cache.delete(key);
  cache.set(key, entry);
  return { value: entry.value as T, fresh: Date.now() < entry.staleAt, updatedAt: entry.updatedAt };
}

export function setCached<T>(key: string, value: T, options: { staleTimeMs?: number; tags?: string[] } = {}) {
  ensureSessionScope();
  const now = Date.now();
  const staleTimeMs = options.staleTimeMs ?? 15000;
  const tags = options.tags ?? [];
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, updatedAt: now, staleAt: now + staleTimeMs, tags });
}

export function updateCached<T>(key: string, updater: (prev: T) => T, options?: { staleTimeMs?: number; tags?: string[] }) {
  ensureSessionScope();
  const entry = cache.get(key);
  if (!entry) return;
  const next = updater(entry.value as T);
  const now = Date.now();
  cache.set(key, {
    value: next,
    updatedAt: now,
    staleAt: options?.staleTimeMs !== undefined ? now + options.staleTimeMs : entry.staleAt,
    tags: options?.tags ?? entry.tags,
  });
}

export function evictCacheKey(key: string) {
  ensureSessionScope();
  cache.delete(key);
}

export function evictCacheByPrefix(prefix: string) {
  ensureSessionScope();
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function markCacheStale(tags?: string[]) {
  ensureSessionScope();
  const tagSet = tags?.length ? new Set(tags) : null;
  for (const entry of cache.values()) {
    if (!tagSet) {
      if (!entry.tags.includes('static')) entry.staleAt = 0;
      continue;
    }
    if (entry.tags.some(tag => tagSet.has(tag))) entry.staleAt = 0;
  }
  staleListeners.forEach(listener => listener(tags));
}

export function tagsForMutation(rawPath: string, method: string): string[] | null {
  const path = rawPath.split('?')[0];
  // Read-like POST endpoints or passive feedback do not invalidate app caches.
  if (path.startsWith('/maps/')) return [];
  if (path === '/me/match-feedback') return [];
  // Ensuring a conversation exists is idempotent; do not flush unrelated screens.
  if (path === '/conversations' && method === 'POST') return ['conversations'];
  const convRead = /^\/conversations\/([^/]+)\/read$/.exec(path);
  if (convRead) return ['conversations', 'unread-messages', `conversation:${decodeURIComponent(convRead[1])}`];
  const convMsg = /^\/conversations\/([^/]+)\//.exec(path);
  if (convMsg) return ['conversations', 'unread-messages', `conversation:${decodeURIComponent(convMsg[1])}`];

  const actJoin = /^\/activities\/([^/]+)\/join-requests/.exec(path);
  if (actJoin) {
    const id = decodeURIComponent(actJoin[1]);
    return [`activity:${id}`, `requests:${id}`, `members:${id}`, `manage:${id}`, 'my-requests', 'activity-counts', 'activities', 'discovery', 'home', 'my-activities', 'search', 'favorites'];
  }
  const actMember = /^\/activities\/([^/]+)\/(members|leave-requests)/.exec(path);
  if (actMember) {
    const id = decodeURIComponent(actMember[1]);
    return [`activity:${id}`, `members:${id}`, `manage:${id}`, 'activities', 'my-activities', 'home', 'activity-counts', 'discovery', 'search', 'conversations'];
  }
  const actAttendance = /^\/activities\/([^/]+)\/attendance/.exec(path);
  if (actAttendance) {
    const id = decodeURIComponent(actAttendance[1]);
    return [`activity:${id}`, `manage:${id}`, `progress:${id}`, `summary:${id}`, 'attendance-history', 'profile'];
  }
  const actUpdates = /^\/activities\/([^/]+)\/updates/.exec(path);
  if (actUpdates) {
    const id = decodeURIComponent(actUpdates[1]);
    return [`progress:${id}`, `activity:${id}`, 'conversations'];
  }
  const actMemories = /^\/activities\/([^/]+)\/memories/.exec(path);
  if (actMemories) {
    const id = decodeURIComponent(actMemories[1]);
    return [`summary:${id}`, `activity:${id}`];
  }
  const actPlan = /^\/activities\/([^/]+)\/plan/.exec(path);
  if (actPlan) {
    const id = decodeURIComponent(actPlan[1]);
    return [`activity:${id}`, `manage:${id}`, `progress:${id}`];
  }
  const actInv = /^\/activities\/([^/]+)\/invitations/.exec(path);
  if (actInv) {
    const id = decodeURIComponent(actInv[1]);
    return ['invitations', `activity:${id}`, `members:${id}`, 'activities', 'my-activities', 'home', 'notifications', 'conversations'];
  }
  const actMatch = /^\/activities(?:\/([^/]+))?/.exec(path);
  if (actMatch) {
    const id = actMatch[1] ? decodeURIComponent(actMatch[1]) : '';
    return ['activities', 'my-activities', 'home', 'manage', 'activity-counts', 'discovery', 'search', 'favorites', 'conversations', ...(id ? [`activity:${id}`, `manage:${id}`, `progress:${id}`, `summary:${id}`, `members:${id}`, `requests:${id}`] : [])];
  }

  if (path.startsWith('/community/notifications')) return ['notifications', 'unread-notifications', 'home'];
  if (path.startsWith('/community/ratings')) return ['ratings', 'summary', 'reviews', 'profile'];
  if (path.startsWith('/community/settings')) return ['settings'];
  if (path.startsWith('/community/blocks')) return ['blocks', 'friends', 'friendship', 'conversations', 'activities', 'discovery'];
  if (path.startsWith('/community/reports') || path.startsWith('/community/attendance/complaints')) return ['reports', 'attendance-history'];
  if (path.startsWith('/friends')) return ['friends', 'friendship', 'notifications'];
  if (path.startsWith('/me/favorites')) return ['favorites', 'match-preferences'];
  if (path.startsWith('/me/match-preferences')) return ['match-preferences', 'discovery'];
  if (path.startsWith('/profile/me')) return ['profile'];
  if (path.startsWith('/payments')) return ['wallet', 'payment-info', 'manage', 'activity-counts'];
  const portalGroup = /^\/portal\/groups\/([^/]+)/.exec(path);
  if (portalGroup) {
    const id = decodeURIComponent(portalGroup[1]);
    return [`manage:${id}`, `activity:${id}`, `members:${id}`, 'manage', 'payment-info'];
  }
  return null;
}

subscribeSession(() => {
  ensureSessionScope();
});

subscribeMutation((path, method) => {
  const tags = tagsForMutation(path, method);
  if (tags === null) markCacheStale();
  else if (tags.length > 0) markCacheStale(tags);
});
