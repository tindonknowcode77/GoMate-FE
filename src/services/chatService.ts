import type { ChatAttachment, ChatLocation } from './chatContent';
import { api, post } from './api';
import { allPages } from './activityApi';
export type ChatMessage = { id: string; conversationId: string; senderId: string; senderName?: string; kind?: 'message' | 'update' | 'system'; eventId?: string; text: string; attachments?: ChatAttachment[]; location?: ChatLocation | null; links?: string[]; clientMessageId: string; createdAt: string };
export type Conversation = { id: string; type: 'direct' | 'group'; name: string; activityTitle: string; activityId?: string; participantIds?: string[]; lastMessage: ChatMessage | null; lastReadMessageId?: string | null; unreadCount: number; messageCount: number; avatarUrl?: string | null; hostId?: string; memberCount?: number; activityStatus?: 'published' | 'in-progress' | 'completed' | 'expired' | 'cancelled'; scheduleConfirmedAt?: string | null; startsAt?: string; createdAt?: string };
export const listConversations = () => allPages<Conversation>('/conversations');
export const listConversationPage = (page: number, filters: { q?: string; type?: 'group' | 'direct'; unread?: boolean } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.type) params.set('type', filters.type);
  if (filters.unread) params.set('unread', 'true');
  return api<{ items: Conversation[]; hasMore: boolean; total: number }>(`/conversations?${params}`);
};
export const getUnreadMessageCount = async () => (await api<{ unreadCount: number }>('/conversations/unread-count')).unreadCount;
export const getConversation = async (id: string) => (await api<{ conversation: Conversation }>(`/conversations/${encodeURIComponent(id)}`)).conversation;
export const createConversation = async (target: { type: 'direct'; userId: string } | { type: 'group'; activityId: string }) => (await post<{ conversation: Conversation }>('/conversations', target)).conversation;
export type HistoryPage = { items: ChatMessage[]; hasMore: boolean; nextCursor: string | null };
export const chatHistory = (id: string, before?: string) => api<HistoryPage>(`/conversations/${encodeURIComponent(id)}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ''}`);
export const chatSince = (id: string, after: string) => api<HistoryPage>(`/conversations/${encodeURIComponent(id)}/messages?limit=100&after=${encodeURIComponent(after)}`);
export async function catchUpChat(id: string, after: string, active: () => boolean = () => true) {
  const items: ChatMessage[] = [];
  let cursor = after;
  while (active()) {
    const page = await chatSince(id, cursor);
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor || !page.items.length) break;
    cursor = page.nextCursor;
  }
  return items;
}
export const sendChatMessage = async (id: string, text: string, clientMessageId: string, content: { attachmentIds?: string[]; location?: ChatLocation | null } = {}) => (await post<{ message: ChatMessage }>(`/conversations/${encodeURIComponent(id)}/messages`, { text, clientMessageId, ...content })).message;
export const markChatRead = (id: string, messageId: string) => api(`/conversations/${encodeURIComponent(id)}/read?summary=false`, { method: 'PATCH', body: JSON.stringify({ messageId }) });
