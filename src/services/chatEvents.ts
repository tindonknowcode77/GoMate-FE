import { io } from 'socket.io-client';
import { apiBaseUrl, expireSession, getSession, subscribeSession } from './api';
import type { Conversation } from './chatService';

// One WebSocket per signed-in app, shared by chat, inbox and unread badges.
const socket = io(apiBaseUrl.replace(/\/api\/?$/, ''), {
  autoConnect: false, transports: ['websocket'],
  auth: callback => callback({ token: getSession()?.accessToken }),
  reconnectionDelay: 1000, reconnectionDelayMax: 15000,
});
let consumers = 0;
let activeToken = getSession()?.accessToken;
subscribeSession(() => {
  const token = getSession()?.accessToken;
  if (token === activeToken) return;
  activeToken = token; socket.disconnect(); if (consumers && token) socket.connect();
});
socket.on('session.revoked', expireSession);
function retain() {
  consumers++;
  if (getSession() && !socket.connected) socket.connect();
  return () => { if (--consumers === 0) socket.disconnect(); };
}

export function watchUserUpdates(onUpdate: () => void, onStatus: (connected: boolean) => void = () => {}) {
  let connectedOnce = socket.connected;
  const connected = () => { onStatus(true); if (connectedOnce) onUpdate(); connectedOnce = true; };
  const disconnected = () => onStatus(false);
  socket.on('connect', connected).on('disconnect', disconnected).on('connect_error', disconnected);
  socket.on('user.updated', onUpdate).on('user.reconcile', onUpdate);
  const release = retain();
  if (socket.connected) onStatus(true);
  return () => {
    socket.off('connect', connected).off('disconnect', disconnected).off('connect_error', disconnected);
    socket.off('user.updated', onUpdate).off('user.reconcile', onUpdate); release();
  };
}

export function isSocketConnected() {
  return socket.connected;
}

export function watchConversation(id: string, onUpdate: (snapshot?: Conversation) => void, onStatus: (connected: boolean) => void, onMessage?: (message: unknown) => void) {
  const connected = () => {
    socket.emit('conversation.subscribe', id, (result: { ok?: boolean }) => {
      onStatus(Boolean(result?.ok)); if (!result?.ok) onUpdate();
    });
  };
  const updated = (snapshot: Conversation) => { if (snapshot.id === id) onUpdate(snapshot); };
  const incoming = (payload: { conversationId?: string; message?: unknown }) => { if (payload?.conversationId === id && payload.message && onMessage) onMessage(payload.message); };
  const revoked = (event: { id: string }) => { if (event.id === id) { onStatus(false); onUpdate(); } };
  const disconnected = () => onStatus(false);
  socket.on('connect', connected).on('disconnect', disconnected).on('connect_error', disconnected);
  socket.on('conversation.updated', updated).on('conversation.revoked', revoked).on('conversation.error', revoked);
  if (onMessage) socket.on('chat.message', incoming);
  const release = retain();
  if (socket.connected) connected();
  return () => {
    socket.emit('conversation.unsubscribe', id);
    socket.off('connect', connected).off('disconnect', disconnected).off('connect_error', disconnected);
    socket.off('conversation.updated', updated).off('conversation.revoked', revoked).off('conversation.error', revoked);
    if (onMessage) socket.off('chat.message', incoming);
    release();
  };
}
