import type { ChatMessage } from './chatService';

export type OutgoingMessage = ChatMessage & { delivery?: 'sending' | 'failed'; deliveryError?: string };
const identity = (row: ChatMessage) => row.clientMessageId
  ? JSON.stringify([row.conversationId, row.senderId, row.clientMessageId]) : row.id;

// REST acknowledgements, socket echoes and history can arrive in any order.
export function mergeChatMessages(current: OutgoingMessage[], incoming: OutgoingMessage[]) {
  const rows = new Map(current.map(row => [identity(row), row]));
  for (const row of incoming) {
    const key = identity(row), existing = rows.get(key);
    if (existing && !existing.delivery && row.delivery) continue;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => {
    if (!!a.delivery !== !!b.delivery) return a.delivery ? 1 : -1;
    return a.delivery ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id) : a.id.localeCompare(b.id);
  });
}

export function createChatOutbox(conversationId: string, senderId: string, deliver: (row: OutgoingMessage) => Promise<ChatMessage>) {
  let rows: OutgoingMessage[] = [], sequence = 0, accessible = true;
  const listeners = new Set<() => void>(), pending = new Set<string>();
  const publish = (next: OutgoingMessage[]) => { rows = next; listeners.forEach(listener => listener()); };
  const merge = (incoming: OutgoingMessage[]) => { if (accessible) publish(mergeChatMessages(rows, incoming)); };
  const send = async (row: OutgoingMessage) => {
    if (!accessible || pending.has(row.clientMessageId)) return;
    pending.add(row.clientMessageId);
    merge([{ ...row, delivery: 'sending', deliveryError: undefined }]);
    try { merge([await deliver(row)]); }
    catch (reason) {
      // A socket echo proves delivery even if the HTTP response was lost.
      publish(rows.map(value => identity(value) === identity(row) && value.delivery
        ? { ...value, delivery: 'failed', deliveryError: reason instanceof Error ? reason.message : 'Chưa gửi được tin nhắn' } : value));
    } finally { pending.delete(row.clientMessageId); }
  };
  return {
    getSnapshot: () => rows,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    merge,
    setAccessible(value: boolean) { accessible = value; if (!value) publish([]); },
    enqueue(content: Pick<ChatMessage, 'text' | 'attachments' | 'location'>) {
      const clientMessageId = `message-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`;
      void send({ ...content, id: `local-${clientMessageId}`, conversationId, senderId, clientMessageId, createdAt: new Date().toISOString(), kind: 'message', delivery: 'sending' });
    },
    retry(clientMessageId: string) {
      const row = rows.find(value => value.senderId === senderId && value.clientMessageId === clientMessageId && value.delivery === 'failed');
      if (row) void send(row);
    },
  };
}
