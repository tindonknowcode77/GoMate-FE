import { getSession } from './api';
import { createChatOutbox, OutgoingMessage } from './chatOutbox';
import { ChatMessage, Conversation } from './chatService';
import { onCacheCleared, onCacheStale } from './remoteCache';

export type ChatOutboxStore = ReturnType<typeof createChatOutbox>;

export type CachedChatSession = {
  conversationId: string;
  senderId: string;
  sessionToken: string;
  outbox: ChatOutboxStore;
  meta: Conversation;
  cursor: string | null;
  latestSeenId: string;
  lastReadId: string;
  initialized: boolean;
  lastSyncedAt: number;
};

const MAX_CHAT_SESSIONS = 40;
const MAX_GROUP_CONVERSATIONS = 100;

let activeOwner = sessionKey();
const chatSessions = new Map<string, CachedChatSession>();
const groupConversations = new Map<string, Conversation>();

function sessionKey() {
  const session = getSession();
  return session ? `${session.user.id}:${session.accessToken}` : 'guest';
}

function ensureSession() {
  const current = sessionKey();
  if (current !== activeOwner) {
    activeOwner = current;
    chatSessions.forEach(entry => entry.outbox.setAccessible(false));
    chatSessions.clear();
    groupConversations.clear();
  }
}

if (typeof onCacheCleared === 'function') {
  onCacheCleared(() => {
    activeOwner = sessionKey();
    chatSessions.forEach(entry => entry.outbox.setAccessible(false));
    chatSessions.clear();
    groupConversations.clear();
  });
}

if (typeof onCacheStale === 'function') {
  onCacheStale(tags => {
    if (!tags || tags.includes('conversations')) {
      markChatSessionStale();
      return;
    }
    for (const tag of tags) {
      if (tag.startsWith('conversation:')) {
        markChatSessionStale(tag.slice('conversation:'.length));
      }
    }
  });
}

export function clearChatCache() {
  activeOwner = sessionKey();
  chatSessions.forEach(entry => entry.outbox.setAccessible(false));
  chatSessions.clear();
  groupConversations.clear();
}

export function getCachedGroupConversation(activityId: string): Conversation | null {
  ensureSession();
  const hit = groupConversations.get(activityId);
  if (!hit) return null;
  groupConversations.delete(activityId);
  groupConversations.set(activityId, hit);
  return hit;
}

export function setCachedGroupConversation(activityId: string, conversation: Conversation) {
  ensureSession();
  if (groupConversations.has(activityId)) groupConversations.delete(activityId);
  else if (groupConversations.size >= MAX_GROUP_CONVERSATIONS) {
    const oldest = groupConversations.keys().next().value;
    if (oldest !== undefined) groupConversations.delete(oldest);
  }
  groupConversations.set(activityId, conversation);
}

export function evictCachedGroupConversation(activityId?: string, conversationId?: string) {
  ensureSession();
  if (activityId) groupConversations.delete(activityId);
  if (conversationId) {
    for (const [key, value] of [...groupConversations.entries()]) {
      if (value.id === conversationId) groupConversations.delete(key);
    }
  }
}

export function getOrCreateChatSession(
  conversation: Conversation,
  senderId: string,
  sessionToken: string,
  deliver: (row: OutgoingMessage) => Promise<ChatMessage>
): CachedChatSession {
  ensureSession();
  const existing = chatSessions.get(conversation.id);
  if (existing && existing.senderId === senderId && existing.sessionToken === sessionToken) {
    // Refresh LRU order and update lightweight summary fields if caller brought fresher metadata.
    chatSessions.delete(conversation.id);
    chatSessions.set(conversation.id, existing);
    const incomingLastId = conversation.lastMessage?.id ?? '';
    const existingLastId = existing.meta.lastMessage?.id ?? '';
    if (incomingLastId && incomingLastId > existingLastId) {
      existing.meta = { ...existing.meta, ...conversation };
    }
    return existing;
  }
  if (existing) {
    existing.outbox.setAccessible(false);
    chatSessions.delete(conversation.id);
  }
  if (chatSessions.size >= MAX_CHAT_SESSIONS) {
    const oldest = chatSessions.keys().next().value;
    if (oldest !== undefined) chatSessions.delete(oldest);
  }
  const created: CachedChatSession = {
    conversationId: conversation.id,
    senderId,
    sessionToken,
    outbox: createChatOutbox(conversation.id, senderId, deliver),
    meta: conversation,
    cursor: null,
    latestSeenId: '',
    lastReadId: conversation.lastReadMessageId ?? '',
    initialized: false,
    lastSyncedAt: 0,
  };
  chatSessions.set(conversation.id, created);
  return created;
}

export function updateChatSession(
  conversationId: string,
  patch: Partial<Pick<CachedChatSession, 'meta' | 'cursor' | 'latestSeenId' | 'lastReadId' | 'initialized' | 'lastSyncedAt'>>
) {
  ensureSession();
  const entry = chatSessions.get(conversationId);
  if (!entry) return;
  Object.assign(entry, patch);
}

export function evictChatSession(conversationId: string) {
  ensureSession();
  const existing = chatSessions.get(conversationId);
  if (existing) {
    existing.outbox.setAccessible(false);
    chatSessions.delete(conversationId);
  }
  evictCachedGroupConversation(undefined, conversationId);
}

export function markChatSessionStale(conversationId?: string) {
  ensureSession();
  if (conversationId) {
    const entry = chatSessions.get(conversationId);
    if (entry) entry.lastSyncedAt = 0;
    return;
  }
  for (const entry of chatSessions.values()) {
    entry.lastSyncedAt = 0;
  }
}
