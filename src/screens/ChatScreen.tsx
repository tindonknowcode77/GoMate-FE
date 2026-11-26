import { ChatAttachmentPanel, ChatMessageContent, SharedChatLibrary } from '../components/ChatContent';
import { useFeedbackState } from '../services/feedback';
import { ChatAttachment, ChatLocation } from '../services/chatContent';
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlockUserButton } from '../components/BlockUserButton';
import { ChatHeaderActions } from '../components/ChatHeaderActions';
import { Text } from '../components/LocalizedText';
import { addActivityUpdate } from '../services/activityApi';
import { imageUrl } from '../services/profileService';
import { ChatMessage, chatHistory, catchUpChat, Conversation, getConversation, markChatRead, sendChatMessage } from '../services/chatService';
import { watchConversation } from '../services/chatEvents';
import { ApiError, getSession } from '../services/api';
import { createChatOutbox } from '../services/chatOutbox';
import { evictChatSession, getOrCreateChatSession, updateChatSession } from '../services/chatCache';
import { colors, layout } from '../theme';

const CHAT_REVALIDATE_WINDOW_MS = 5000;

export function ChatScreen({ conversation, onBack, error, embedded = false, refreshKey = 0, activityId, isHost = false }: { refreshKey?: number; embedded?: boolean; error?: string; conversation: Conversation; onBack: () => void; activityId?: string; isHost?: boolean }) {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]), [location, setLocation] = useState<ChatLocation | null>(null), [library, setLibrary] = useState(false), [preparing, setPreparing] = useState(false);
  const [attachmentPanel, setAttachmentPanel] = useState(false), [keyboardHeight, setKeyboardHeight] = useState(260), [inputHeight, setInputHeight] = useState(44);
  const [updateModal, setUpdateModal] = useState(false), [updateText, setUpdateText] = useState(''), [updateBusy, setUpdateBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => { const subscription = Keyboard.addListener('keyboardDidShow', event => setKeyboardHeight(Math.max(210, Math.min(event.endCoordinates.height, 320)))); return () => subscription.remove(); }, []);
  const [blocked, setBlocked] = useState(conversation.activityStatus === 'cancelled'), [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');
  const sessionToken = getSession()?.accessToken ?? '', senderId = getSession()?.user.id ?? '';
  const chatSession = useMemo(() => {
    const deliver = (row: Parameters<Parameters<typeof createChatOutbox>[2]>[0]) => {
      if ((getSession()?.accessToken ?? '') !== sessionToken) return Promise.reject(new Error('Phiên đăng nhập đã thay đổi.'));
      return sendChatMessage(row.conversationId, row.text, row.clientMessageId, { attachmentIds: row.attachments?.map(file => file.id), location: row.location });
    };
    if (typeof getOrCreateChatSession === 'function') {
      return getOrCreateChatSession(conversation, senderId, sessionToken, deliver);
    }
    return {
      conversationId: conversation.id,
      senderId,
      sessionToken,
      outbox: createChatOutbox(conversation.id, senderId, deliver),
      meta: conversation,
      cursor: null as string | null,
      latestSeenId: '',
      lastReadId: conversation.lastReadMessageId ?? '',
      initialized: false,
      lastSyncedAt: 0,
    };
    // Keyed by conversation.id + session identity so cached outbox & history survive tab switches and re-entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, senderId, sessionToken]);
  const outbox = chatSession.outbox;
  const messages = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot, outbox.getSnapshot), merge = outbox.merge;
  const [loading, setLoading] = useState(() => !chatSession.initialized), [loadError, setLoadError] = useState(''), [sendError, setSendError] = useFeedbackState('');
  const [meta, setMeta] = useState(() => chatSession.meta), [cursor, setCursor] = useState<string | null>(() => chatSession.cursor), [olderLoading, setOlderLoading] = useState(false);
  const draftLock = useRef(false), scroll = useRef<ScrollView>(null), follow = useRef(true);
  useEffect(() => { draftLock.current = false; }, [message, attachments, location]);
  const latestSeen = useRef({ conversationId: conversation.id, id: chatSession.latestSeenId, initialized: chatSession.initialized });
  const incomingHintId = conversation.lastMessage?.id ?? '';
  useEffect(() => {
    if (latestSeen.current.conversationId !== conversation.id) {
      latestSeen.current = { conversationId: conversation.id, id: chatSession.latestSeenId, initialized: chatSession.initialized };
      setMeta(chatSession.meta);
      setCursor(chatSession.cursor);
      setLoading(!chatSession.initialized);
    }
    let alive = true, polling = false, lastRead = chatSession.lastReadId, connected = false, queued = false;
    let pendingSnapshot: Conversation | undefined;
    const poll = async (snapshot?: Conversation) => {
      if (snapshot) pendingSnapshot = snapshot;
      if (polling) { queued = true; return; }
      polling = true;
      const supplied = pendingSnapshot; pendingSnapshot = undefined;
      try {
        // Metadata and history are independent: start both network reads together on cold load.
        const initialHistory = !latestSeen.current.initialized;
        const historyTask = initialHistory ? chatHistory(conversation.id).then(page => {
          // A slow summary must not hide already-authorized message history.
          if (alive) { merge(page.items); setCursor(page.nextCursor); setLoading(false); }
          if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { cursor: page.nextCursor });
          return page;
        }) : null;
        const [fresh, firstPage] = await Promise.all([supplied ?? getConversation(conversation.id), historyTask]);
        if (!alive) return;
        if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { meta: fresh, lastSyncedAt: Date.now() });
        setMeta(fresh); setBlocked(fresh.activityStatus === 'cancelled'); outbox.setAccessible(true);
        const freshLastId = fresh.lastMessage?.id ?? '';
        const upToDate = latestSeen.current.initialized && freshLastId === latestSeen.current.id && (!latestSeen.current.id || latestSeen.current.id === lastRead || latestSeen.current.id === fresh.lastReadMessageId);
        if (upToDate) { setLoadError(''); return; }
        let rows: ChatMessage[];
        if (!initialHistory && latestSeen.current.id) {
          rows = freshLastId === latestSeen.current.id ? [] : await catchUpChat(conversation.id, latestSeen.current.id, () => alive);
        } else {
          const page = firstPage ?? await chatHistory(conversation.id);
          rows = page.items;
          if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { cursor: page.nextCursor });
          if (alive) setCursor(page.nextCursor);
        }
        if (!alive) return;
        if (rows.length) merge(rows);
        setLoadError('');
        const newest = rows.reduce((id, row) => row.id > id ? row.id : id, latestSeen.current.id);
        latestSeen.current.id = newest; latestSeen.current.initialized = true;
        if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { latestSeenId: newest, initialized: true, lastSyncedAt: Date.now() });
        if (newest && newest !== lastRead && newest !== fresh.lastReadMessageId) {
          const previousRead = lastRead; lastRead = newest;
          if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { lastReadId: newest });
          // Read receipts must not hold the conversation in its loading state.
          void markChatRead(conversation.id, newest).catch(() => {
            if (alive && lastRead === newest) {
              lastRead = previousRead;
              if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { lastReadId: previousRead });
            }
          });
        }
      } catch (reason) {
        if (alive) {
          setLoadError(reason instanceof Error ? reason.message : 'Không tải được tin nhắn');
          const revoked = reason instanceof ApiError && [401, 403, 404].includes(reason.status);
          if (revoked) {
            setBlocked(true);
            outbox.setAccessible(false);
            if (typeof evictChatSession === 'function') evictChatSession(conversation.id);
          }
        }
      }
      finally { polling = false; if (alive) { setLoading(false); if (queued) { queued = false; void poll(); } } }
    };
    const isFreshWarmCache = chatSession.initialized && retry === 0 && refreshKey === 0
      && (Date.now() - chatSession.lastSyncedAt) < CHAT_REVALIDATE_WINDOW_MS
      && (!incomingHintId || incomingHintId === chatSession.latestSeenId);
    if (!isFreshWarmCache) void poll();
    const stop = watchConversation(
      conversation.id,
      snapshot => { if (alive) void poll(snapshot); },
      value => {
        const wasDisconnected = !connected;
        connected = value;
        if (alive && value && wasDisconnected && latestSeen.current.initialized) void poll();
      },
      incoming => {
        if (!alive) return;
        const msg = incoming as ChatMessage;
        merge([msg]);
        if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { lastSyncedAt: Date.now() });
        // Only completed history reads advance the catch-up cursor; a live echo
        // may arrive before older missed messages have been recovered.
      }
    );
    const timer = setInterval(() => { if (!connected) void poll(); }, 3000);
    return () => { alive = false; clearInterval(timer); stop(); };
  }, [conversation.id, chatSession, incomingHintId, merge, outbox, retry, refreshKey]);
  const send = () => {
    const clean = message.trim();
    if ((!clean && !attachments.length && !location) || draftLock.current || blocked || loading || preparing) return;
    if (clean.length > 4000) { setSendError('Tin nhắn tối đa 4000 ký tự.'); return; }
    draftLock.current = true;
    follow.current = true;
    outbox.enqueue({ text: clean, attachments, location });
    setMessage(''); setAttachments([]); setLocation(null); setSendError('');
  };
  const older = async () => {
    if (!cursor || olderLoading) return;
    setOlderLoading(true); follow.current = false;
    try {
      const page = await chatHistory(conversation.id, cursor);
      merge(page.items);
      if (typeof updateChatSession === 'function') updateChatSession(conversation.id, { cursor: page.nextCursor });
      setCursor(page.nextCursor);
    }
    catch (reason) { setLoadError(reason instanceof Error ? reason.message : 'Không tải được tin cũ'); }
    finally { setOlderLoading(false); }
  };
  const dayLabel = (value: string) => {
    const date = new Date(value), now = new Date(), yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === now.toDateString() ? 'Hôm nay' : date.toDateString() === yesterday.toDateString() ? 'Hôm qua' : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const resolvedActivityId = activityId || meta.activityId || '';
  const postQuickUpdate = async () => {
    const clean = updateText.trim();
    if (!resolvedActivityId || !clean || updateBusy) return;
    setUpdateBusy(true);
    try {
      await addActivityUpdate(resolvedActivityId, clean);
      setUpdateText('');
      setUpdateModal(false);
      setRetry(v => v + 1);
    } catch (reason) {
      setSendError(reason instanceof Error ? reason.message : 'Không đăng được cập nhật.');
    } finally {
      setUpdateBusy(false);
    }
  };
  return <SafeAreaView style={styles.safe} edges={embedded ? [] : ['top', 'bottom', 'left', 'right']}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    {!embedded && <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} hitSlop={12}><Ionicons name="chevron-back" color={colors.text} size={27} /></Pressable>{meta.avatarUrl ? <Image source={{ uri: imageUrl(meta.avatarUrl) }} style={styles.avatar} /> : <View style={[styles.avatar, styles.fallback]}><Text style={{ color: colors.primary, fontWeight: '800' }}>{meta.name.slice(0, 1).toUpperCase()}</Text></View>}<View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={styles.headerName}>{meta.name}</Text><Text style={styles.caption}>Trò chuyện riêng</Text></View><ChatHeaderActions sharePath={`/app/messages/chat/${conversation.id}`} onShared={() => setLibrary(true)} onRefresh={() => setRetry(value => value + 1)} /></View>}{!embedded && meta.type === 'direct' && meta.participantIds?.find(id => id !== getSession()?.user.id) && <View style={{ paddingHorizontal: 18, backgroundColor: colors.surface }}><BlockUserButton userId={meta.participantIds.find(id => id !== getSession()?.user.id)!} onBlocked={onBack} /></View>}
    {loadError || error ? <View style={styles.errorBar}><Ionicons name="cloud-offline-outline" size={18} color={colors.danger} /><Text accessibilityRole="alert" style={{ color: colors.danger, flex: 1, fontSize: 12 }}>{loadError || error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable></View> : null}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[styles.messages, !messages.length && { justifyContent: 'center' }]} onContentSizeChange={() => { if (follow.current) scroll.current?.scrollToEnd({ animated: true }); }} onScroll={event => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; follow.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 100; }} scrollEventThrottle={100} keyboardShouldPersistTaps="handled">
      {cursor && <Pressable accessibilityRole="button" disabled={olderLoading} onPress={() => void older()} style={styles.older}><Text style={styles.link}>{olderLoading ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}</Text></Pressable>}
      {loading && !messages.length ? <ActivityIndicator color={colors.primary} /> : !messages.length && !loadError ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={32} color={colors.primary} /></View><Text style={styles.emptyTitle}>{meta.type === 'group' ? 'Bắt đầu trò chuyện' : 'Một lời chào, thêm một kết nối'}</Text><Text style={styles.emptyNote}>{meta.type === 'group' ? 'Gửi lời chào tới các thành viên trong nhóm.' : 'Gửi tin nhắn để bắt đầu trò chuyện.'}</Text></View> : null}
      {messages.map((item, index) => {
        const mine = item.senderId === getSession()?.user.id;
        const previous = messages[index - 1], newDay = !previous || dayLabel(previous.createdAt) !== dayLabel(item.createdAt);
        const newSender = newDay || previous?.senderId !== item.senderId;
        return <Fragment key={JSON.stringify([item.senderId, item.clientMessageId || item.id])}>{newDay && <View style={styles.day}><Text style={styles.dayText}>{dayLabel(item.createdAt)}</Text></View>}{item.kind === 'system' ? <View style={styles.systemCard}><Ionicons name="megaphone-outline" size={16} color={colors.primary} /><Text style={styles.systemCardText}>{item.text}</Text></View> : <View style={[styles.messageRow, mine && { justifyContent: 'flex-end' }]}>{!mine && meta.type === 'group' && <View style={[styles.senderAvatar, !newSender && { opacity: 0 }]}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{(item.senderName || 'T').slice(0, 1).toUpperCase()}</Text></View>}<View style={[styles.bubble, mine ? styles.mine : styles.theirs, !newSender && { marginTop: -5 }]}>{!mine && meta.type === 'group' && newSender && <Text style={styles.senderName}>{item.senderName || 'Thành viên'}</Text>}{item.kind === 'update' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: mine ? 'rgba(255,255,255,0.22)' : colors.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 }}><Ionicons name="megaphone-outline" size={12} color={mine ? colors.white : colors.primary} /><Text style={{ fontSize: 10, fontWeight: '700', color: mine ? colors.white : colors.primary }}>Cập nhật từ Host</Text></View>}<ChatMessageContent item={item} mine={mine} />{item.text ? <Text selectable style={[styles.messageText, mine && { color: colors.white }]}>{item.text}</Text> : null}<View style={styles.messageMeta}><Text style={[styles.messageTime, mine && { color: colors.whiteMuted }]}>{new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>{mine && (item.delivery === 'sending' ? <Text style={{ color: colors.whiteMuted, fontSize: 10 }}>Đang gửi…</Text> : item.delivery === 'failed' ? <Pressable accessibilityRole="button" accessibilityLabel="Thử gửi lại tin nhắn" disabled={blocked} onPress={() => outbox.retry(item.clientMessageId)}><Text style={{ color: colors.white, fontSize: 11, fontWeight: '700' }}>Chưa gửi · Thử lại</Text></Pressable> : <Ionicons name="checkmark" size={12} color={colors.whiteMuted} />)}</View></View></View>}</Fragment>;
      })}
    </ScrollView>
    {sendError ? <Text accessibilityRole="alert" style={styles.sendError}>{sendError}</Text> : null}
    {resolvedActivityId && !blocked && isHost && (
      <View style={styles.groupQuickBar}>
        <Pressable accessibilityRole="button" onPress={() => setUpdateModal(true)} style={styles.quickPill}>
          <Ionicons name="megaphone-outline" size={15} color={colors.primary} />
          <Text style={styles.quickPillText}>Đăng cập nhật</Text>
        </Pressable>
      </View>
    )}
    {attachments.length || location ? <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'center', paddingTop: 6, paddingRight: 6 }}>{attachments.map(file => file.kind === 'image' && file.localUri ? (
      <View key={file.id} style={styles.draftThumbWrap}>
        <Image source={{ uri: file.localUri }} style={styles.draftThumb} resizeMode="cover" />
        <Pressable accessibilityLabel={`Bỏ ảnh ${file.name}`} disabled={preparing} onPress={() => setAttachments(rows => rows.filter(row => row.id !== file.id))} style={styles.draftThumbRemove}>
          <Ionicons name="close" color={colors.white} size={14} />
        </Pressable>
      </View>
    ) : (
      <View key={file.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, backgroundColor: colors.primarySoft }}><Ionicons name={file.kind === 'image' ? 'image-outline' : file.kind === 'video' ? 'videocam-outline' : 'document-attach-outline'} color={colors.primary} size={18} /><Text numberOfLines={1} style={{ maxWidth: 145, fontSize: 12 }}>{file.name}</Text><Pressable accessibilityLabel={`Bỏ tệp ${file.name}`} disabled={preparing} onPress={() => setAttachments(rows => rows.filter(row => row.id !== file.id))}><Ionicons name="close-circle" color={colors.primary} size={20} /></Pressable></View>
    ))}</ScrollView>{location && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ionicons name="location" color={colors.primary} size={20} /><Text style={{ flex: 1, fontSize: 12 }}>{location.label || 'Vị trí hiện tại'}</Text><Pressable accessibilityLabel="Bỏ vị trí" disabled={preparing} onPress={() => setLocation(null)}><Ionicons name="close-circle" size={20} color={colors.primary} /></Pressable></View>}</View> : null}
    <View style={styles.composerWrap}><View style={styles.composer}><View style={styles.inputWrap}><TextInput ref={inputRef} accessibilityLabel="Tin nhắn" multiline numberOfLines={1} maxLength={4000} editable={!blocked} value={message} onChangeText={setMessage} onFocus={() => setAttachmentPanel(false)} onContentSizeChange={event => setInputHeight(Math.max(44, Math.min(110, event.nativeEvent.contentSize.height)))} placeholder={blocked ? 'Bạn không còn quyền gửi tin trong nhóm này' : 'Nhắn gì đó...'} placeholderTextColor={colors.textMuted} style={[styles.input, { height: message ? inputHeight : 44 }]} /></View><Pressable accessibilityRole="button" accessibilityLabel={attachmentPanel ? 'Đóng đính kèm' : 'Thêm ảnh, tệp hoặc vị trí'} accessibilityState={{ expanded: attachmentPanel }} disabled={blocked || loading || preparing} onPress={() => { if (attachmentPanel) { setAttachmentPanel(false); inputRef.current?.focus(); } else { inputRef.current?.blur(); Keyboard.dismiss(); setAttachmentPanel(true); } }} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={attachmentPanel ? 'close' : 'add'} size={27} color={colors.primary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" disabled={loading || blocked || preparing || (!message.trim() && !attachments.length && !location)} onPress={() => void send()} style={[styles.send, (loading || blocked || preparing || (!message.trim() && !attachments.length && !location)) && { opacity: 0.45 }]}><Ionicons name="arrow-up" color={colors.white} size={25} /></Pressable></View><ChatAttachmentPanel open={attachmentPanel} height={keyboardHeight} onClose={() => setAttachmentPanel(false)} conversationId={conversation.id} disabled={blocked || loading} remaining={4 - attachments.length} onFile={file => setAttachments(rows => [...rows, file])} onLocation={setLocation} onBusyChange={setPreparing} /></View>

    {library && <SharedChatLibrary conversationId={conversation.id} onClose={() => setLibrary(false)} />}
    <Modal transparent animationType="fade" visible={updateModal} onRequestClose={() => setUpdateModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Đăng cập nhật nổi bật cho nhóm</Text>
          <TextInput
            value={updateText}
            onChangeText={setUpdateText}
            placeholder="Ví dụ: Cả nhóm tập trung ở cổng B lúc 8h30 nhé!"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 84, color: colors.text, backgroundColor: colors.background }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <Pressable onPress={() => setUpdateModal(false)} style={{ paddingHorizontal: 14, paddingVertical: 10 }}><Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Hủy</Text></Pressable>
            <Pressable disabled={updateBusy || !updateText.trim()} onPress={() => void postQuickUpdate()} style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, opacity: updateBusy || !updateText.trim() ? 0.5 : 1 }}><Text style={{ color: colors.white, fontWeight: '700' }}>{updateBusy ? 'Đang gửi...' : 'Đăng ngay'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3FC' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }, avatar: { width: 42, height: 42, borderRadius: 21 }, fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, headerName: { fontSize: 17, fontWeight: '800', color: colors.text }, caption: { fontSize: 12, color: colors.textMuted }, link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  messages: { flexGrow: 1, padding: 16, paddingBottom: 24, gap: 12, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }, messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%', minWidth: 74 }, mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 }, theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#EDEAF5' }, messageText: { color: colors.text, fontSize: 15, lineHeight: 23 }, messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 5 }, messageTime: { fontSize: 10, color: colors.textMuted }, senderAvatar: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#E7E0FA', alignItems: 'center', justifyContent: 'center' }, senderName: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }, day: { alignSelf: 'center', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#EAE5F4', marginVertical: 8 }, dayText: { fontSize: 11, color: '#81758D', fontWeight: '600' }, systemCard: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, marginVertical: 4, maxWidth: '92%' }, systemCardText: { color: colors.primary, fontSize: 12, fontWeight: '700', flexShrink: 1, lineHeight: 18 }, groupQuickBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2, backgroundColor: colors.surface, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }, quickPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, quickPillText: { color: colors.primary, fontSize: 12, fontWeight: '700' }, older: { alignSelf: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  empty: { alignItems: 'center', padding: 28, gap: 14 }, emptyIcon: { padding: 22, borderRadius: 40, backgroundColor: '#EAE4FC' }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }, emptyNote: { color: colors.textMuted, fontSize: 13, lineHeight: 21, textAlign: 'center' }, errorBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 9, backgroundColor: colors.matchSoft }, sendError: { color: colors.danger, paddingHorizontal: 18, paddingVertical: 8, fontSize: 12 }, draftThumbWrap: { position: 'relative', width: 72, height: 72 }, draftThumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.surfaceMuted }, draftThumbRemove: { position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,23,42,0.78)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.surface }, composerWrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }, composer: { flexDirection: 'row', gap: 9, padding: 12, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center', alignItems: 'flex-end' }, inputWrap: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 23, paddingHorizontal: 15 }, input: { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', borderWidth: 0, minHeight: 44, maxHeight: 110, paddingVertical: 11, lineHeight: 22, textAlignVertical: 'center', fontSize: 14, color: colors.text }, send: { backgroundColor: colors.primary, width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
