import { useFeedbackState } from '../services/feedback';
import { RouteMap } from './RouteMap';
import { PlacePicker } from './PlacePicker';
import { getMapsConfig, MapsConfig } from '../services/mapsService';
import { getCached, setCached } from '../services/remoteCache';
import { useRemote } from '../services/useRemote';
import { useEvent } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from './LocalizedText';
import { ScreenHeader } from './ScreenHeader';
import { ChatMessage } from '../services/chatService';
import { attachmentUrl, ChatAttachment, chatHeaders, ChatLocation, downloadChatFile, evictProtectedMediaUri, fileSize, getCachedAttachmentUri, resolveProtectedMediaUri, sharedContent, SharedKind, uploadChatFile } from '../services/chatContent';
import { colors, layout } from '../theme';

export function ChatAttachmentPanel({ conversationId, disabled, remaining, onFile, onLocation, onBusyChange, open, onClose, height }: { open: boolean; onClose: () => void; height: number; conversationId: string; disabled: boolean; remaining: number; onFile: (file: ChatAttachment) => void; onLocation: (location: ChatLocation) => void; onBusyChange: (busy: boolean) => void }) {
  const config = useRemote<MapsConfig | null>(getMapsConfig, null, true, {
    cacheKey: 'maps-config',
    staleTimeMs: 5 * 60 * 1000,
    tags: ['static'],
  });
  const [placePicker, setPlacePicker] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useFeedbackState('');
  const lock = useRef(false);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  const choose = async (kind: 'media' | 'camera' | 'file' | 'location' | 'place') => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      if (kind === 'place') { onClose(); setPlacePicker(true); }
      else if (kind === 'location') {
        const Location = await import('expo-location');
        if ((await Location.requestForegroundPermissionsAsync()).status !== 'granted') throw new Error('Cho phép truy cập vị trí để chia sẻ điểm hiện tại.');
        const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        onLocation({ latitude: point.coords.latitude, longitude: point.coords.longitude, label: 'Vị trí hiện tại' });
      } else if (!remaining) throw new Error('Mỗi tin nhắn tối đa 4 tệp.');
      else if (kind === 'file') {
        const Picker = await import('expo-document-picker');
        const result = await Picker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, base64: false });
        if (result.canceled) return;
        if (result.assets.length > remaining) throw new Error(`Bạn có thể thêm ${remaining} tệp nữa.`);
        for (const asset of result.assets) onFile(await uploadChatFile(conversationId, asset));
      } else {
        const Picker = await import('expo-image-picker');
        if (kind === 'camera' && !(await Picker.requestCameraPermissionsAsync()).granted) throw new Error('Cho phép truy cập camera để chụp ảnh.');
        // iOS needs library permission when exporting an original video.
        if (kind === 'media' && Platform.OS === 'ios' && !(await Picker.requestMediaLibraryPermissionsAsync()).granted) throw new Error('Cho phép truy cập thư viện để gửi ảnh/video.');
        const result = kind === 'camera' ? await Picker.launchCameraAsync({ quality: 0.85 }) : await Picker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
        if (result.canceled) return;
        if (result.assets.length > remaining) throw new Error(`Bạn có thể thêm ${remaining} tệp nữa.`);
        for (const asset of result.assets) onFile(await uploadChatFile(conversationId, { uri: asset.uri, name: asset.fileName || (asset.type === 'video' ? 'video.mp4' : 'photo.jpg'), mimeType: asset.mimeType, size: asset.fileSize, file: asset.file }));
      }
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thêm được nội dung.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const choices = [
    { kind: 'media', icon: 'images-outline', label: 'Ảnh / video' }, { kind: 'camera', icon: 'camera-outline', label: 'Chụp ảnh' },
    { kind: 'file', icon: 'document-attach-outline', label: 'Tệp' }, { kind: 'location', icon: 'location-outline', label: 'Vị trí hiện tại' },
    ...(config.data?.placesEnabled ? [{ kind: 'place', icon: 'search-outline', label: 'Địa điểm' }] : []),
  ] as { kind: 'media' | 'camera' | 'file' | 'location' | 'place'; icon: 'images-outline' | 'camera-outline' | 'document-attach-outline' | 'location-outline' | 'search-outline'; label: string }[];
  return <>{open && <View accessibilityLabel="Bảng đính kèm" style={{ height, backgroundColor: colors.surfaceMuted, borderTopWidth: 1, borderTopColor: colors.border }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12, maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }}><View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 4 }}>{choices.map(item => <Pressable accessibilityRole="button" accessibilityLabel={item.kind === 'place' ? 'Tìm địa điểm để chia sẻ' : item.label} key={item.kind} disabled={disabled || busy} onPress={() => void choose(item.kind)} style={{ flex: 1, alignItems: 'center', gap: 10, paddingVertical: 16 }}><View style={styles.choiceIcon}><Ionicons name={item.icon} size={25} color={colors.primary} /></View><Text style={{ textAlign: 'center', fontSize: 11 }}>{item.label}</Text></Pressable>)}</View>{busy && <ActivityIndicator color={colors.primary} />}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</ScrollView></View>}{placePicker && <PlacePicker onClose={() => setPlacePicker(false)} onSelect={place => { onLocation({ ...place.point, label: place.title.slice(0, 160) }); setPlacePicker(false); }} />}</>;

}

function useProtectedSource(conversationId: string, file: ChatAttachment) {
  const cacheKey = `${conversationId}:${file.id}`;
  const initial = file.localUri || getCachedAttachmentUri(conversationId, file.id);
  const [uri, setUri] = useState(initial), [error, setError] = useFeedbackState(''), [retry, setRetry] = useState(0);
  const url = attachmentUrl(conversationId, file.id);
  useEffect(() => {
    const existing = retry === 0 ? (file.localUri || getCachedAttachmentUri(conversationId, file.id)) : '';
    if (existing) {
      if (existing !== uri) queueMicrotask(() => setUri(existing));
      return;
    }
    let alive = true;
    void resolveProtectedMediaUri(url, cacheKey, file.mimeType, file.name)
      .then(localUri => { if (alive) { setUri(localUri); setError(''); } })
      .catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'Không tải được nội dung.'); });
    return () => { alive = false; };
  }, [url, cacheKey, file.localUri, file.id, file.mimeType, file.name, conversationId, uri, retry, setError]);
  return {
    uri,
    error,
    retry: () => {
      evictProtectedMediaUri(cacheKey);
      setUri('');
      setError('');
      setRetry(value => value + 1);
    },
  };
}

function VideoPlayer({ uri }: { uri: string }) {
  const isLocal = uri.startsWith('file:') || uri.startsWith('blob:') || uri.startsWith('content:');
  const player = useVideoPlayer(isLocal ? { uri } : { uri, headers: chatHeaders() });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  return <View style={{ gap: 10 }}><VideoView player={player} style={{ width: '100%', height: 250 }} nativeControls fullscreenOptions={{ enable: true }} />{status === 'loading' && <ActivityIndicator color={colors.primary} />}{status === 'error' && <Text accessibilityRole="alert" style={styles.error}>Không phát được video này. Bạn có thể tải tệp để mở trên thiết bị.</Text>}</View>;
}
function SharedFile({ conversationId, file, mine = false }: { conversationId: string; file: ChatAttachment; mine?: boolean }) {
  const previewable = file.kind === 'image' || file.kind === 'video';
  // Fetch media only when a preview is rendered, not for ordinary file rows.
  return previewable ? <MediaFile conversationId={conversationId} file={file} mine={mine} /> : <DownloadFile conversationId={conversationId} file={file} />;
}
function DownloadFile({ conversationId, file }: { conversationId: string; file: ChatAttachment }) {
  const [busy, setBusy] = useState(false), [error, setError] = useFeedbackState('');
  const download = async () => { if (busy) return; setBusy(true); setError(''); try { await downloadChatFile(conversationId, file); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được tệp.'); } finally { setBusy(false); } };
  return <View><Pressable accessibilityRole="button" accessibilityLabel={`Tải ${file.name}`} disabled={busy} onPress={() => void download()} style={styles.file}><Ionicons name={file.kind === 'audio' ? 'musical-notes-outline' : 'document-text-outline'} color={colors.primary} size={24} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={{ color: colors.text, fontWeight: '600' }}>{file.name}</Text><Text style={styles.caption}>{fileSize(file.size)}</Text></View>{busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="download-outline" size={20} color={colors.primary} />}</Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}
function MediaFile({ conversationId, file, mine = false }: { conversationId: string; file: ChatAttachment; mine?: boolean }) {
  const source = useProtectedSource(conversationId, file), [open, setOpen] = useState(false), [nativeError, setNativeError] = useState(false);
  return <View style={{ gap: 6 }}>
    {source.uri && !nativeError ? (
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${file.name}`} onPress={() => setOpen(true)}>
        {file.kind === 'image' ? (
          <Image onError={() => setNativeError(true)} source={{ uri: source.uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.video]}>
            <Ionicons name="play-circle" size={48} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Xem video</Text>
          </View>
        )}
      </Pressable>
    ) : source.error || nativeError ? (
      <Pressable onPress={() => { setNativeError(false); source.retry(); }} style={[styles.retryPill, mine && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Ionicons name="refresh-outline" size={16} color={mine ? colors.white : colors.danger} />
        <Text style={{ color: mine ? colors.white : colors.danger, fontSize: 12, fontWeight: '600' }}>Không tải được ảnh/video · Thử lại</Text>
      </Pressable>
    ) : (
      <View style={[styles.photo, styles.loadingMedia]}>
        <ActivityIndicator color={mine ? colors.white : colors.primary} />
      </View>
    )}
    {file.kind === 'video' && <DownloadFile conversationId={conversationId} file={file} />}
    <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={file.kind === 'image' ? 'Ảnh đã chia sẻ' : 'Video đã chia sẻ'} onBack={() => setOpen(false)} />
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
          {file.kind === 'image' ? <Image source={{ uri: source.uri }} style={{ width: '100%', height: '82%' }} resizeMode="contain" /> : open && source.uri ? <VideoPlayer uri={source.uri} /> : null}
          <DownloadFile conversationId={conversationId} file={file} />
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

export function ChatMessageContent({ item, kind, mine = false }: { item: ChatMessage; kind?: SharedKind; mine?: boolean }) {
  const [error, setError] = useFeedbackState(''), [locationOpen, setLocationOpen] = useState(false);
  const open = (url: string) => { setError(''); void Linking.openURL(url).catch(() => setError('Không mở được liên kết.')); };
  const files = (item.attachments ?? []).filter(file => !kind || (kind === 'media' ? file.kind !== 'file' : kind === 'files' ? file.kind === 'file' : false));
  return <View style={{ gap: 8 }}>{files.map(file => <SharedFile key={file.id} conversationId={item.conversationId} file={file} mine={mine} />)}{item.location && (!kind || kind === 'locations') && <Pressable accessibilityRole="button" accessibilityLabel="Mở vị trí trên bản đồ" onPress={() => setLocationOpen(true)} style={styles.file}><View style={styles.choiceIcon}><Ionicons name="location" size={27} color={colors.primary} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ fontWeight: '700', color: colors.text }}>{item.location.label || 'Vị trí đã chia sẻ'}</Text><Text style={{ color: colors.primary, fontSize: 12 }}>Mở bản đồ ↗</Text></View></Pressable>}{(!kind || kind === 'links') && (item.links ?? []).map(url => <Pressable key={url} accessibilityRole="link" onPress={() => open(url)}><Text numberOfLines={3} style={{ color: mine ? '#FFFFFF' : colors.primary, textDecorationLine: 'underline', fontSize: 13 }}>{url}</Text></Pressable>)}{error ? <Text style={styles.error}>{error}</Text> : null}{locationOpen && item.location && <Modal visible animationType="slide" onRequestClose={() => setLocationOpen(false)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title={item.location.label || 'Vị trí đã chia sẻ'} onBack={() => setLocationOpen(false)} /><ScrollView contentContainerStyle={styles.library}><RouteMap point={item.location} /></ScrollView></SafeAreaView></Modal>}</View>;
}

export function SharedChatLibrary({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  type LibraryCache = { items: ChatMessage[]; cursor: string | null };
  const cacheKeyFor = (tab: SharedKind) => `shared-chat:${conversationId}:${tab}`;
  const [kind, setKind] = useState<SharedKind>('media');
  const initialCache = getCached<LibraryCache>(cacheKeyFor('media'));
  const [items, setItems] = useState<ChatMessage[]>(() => initialCache?.value.items ?? []);
  const [cursor, setCursor] = useState<string | null>(() => initialCache?.value.cursor ?? null);
  const [busy, setBusy] = useState(() => !initialCache);
  const [error, setError] = useFeedbackState(''), [retry, setRetry] = useState(0);
  const pageLock = useRef(false), generation = useRef(0);
  useEffect(() => {
    let alive = true;
    const current = ++generation.current;
    const key = `shared-chat:${conversationId}:${kind}`;
    const cached = retry === 0 ? getCached<LibraryCache>(key) : null;
    if (cached?.fresh) return () => { alive = false; };
    void sharedContent(conversationId, kind).then(page => {
      if (alive && current === generation.current) {
        setItems(page.items);
        setCursor(page.nextCursor);
        setCached<LibraryCache>(key, { items: page.items, cursor: page.nextCursor }, { staleTimeMs: 30000, tags: [`conversation:${conversationId}`, 'conversations'] });
      }
    }).catch(reason => { if (alive && current === generation.current && !cached) setError(reason.message); }).finally(() => { if (alive && current === generation.current) setBusy(false); });
    return () => { alive = false; };
  }, [conversationId, kind, retry, setError]);
  const more = async () => {
    if (pageLock.current || busy || !cursor) return;
    pageLock.current = true;
    const current = generation.current;
    setBusy(true); setError('');
    try {
      const page = await sharedContent(conversationId, kind, cursor);
      if (current === generation.current) {
        setItems(rows => {
          const merged = [...new Map([...rows, ...page.items].map(item => [item.id, item])).values()];
          setCached<LibraryCache>(cacheKeyFor(kind), { items: merged, cursor: page.nextCursor }, { staleTimeMs: 30000, tags: [`conversation:${conversationId}`, 'conversations'] });
          return merged;
        });
        setCursor(page.nextCursor);
      }
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'Không tải được nội dung.'); }
    finally { pageLock.current = false; if (current === generation.current) setBusy(false); }
  };
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView testID="shared-chat-library" style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Nội dung đã chia sẻ" onBack={onClose} /><View style={styles.libraryTabs}>{([['media', 'Ảnh / video'], ['files', 'Tệp'], ['links', 'Liên kết'], ['locations', 'Vị trí']] as const).map(([key, label]) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: key === kind }} key={key} onPress={() => { if (key !== kind) { generation.current++; const hit = getCached<LibraryCache>(cacheKeyFor(key)); setBusy(!hit); setItems(hit?.value.items ?? []); setCursor(hit?.value.cursor ?? null); setError(''); setKind(key); } }} style={[styles.libraryTab, key === kind && { backgroundColor: colors.primarySoft }]}><Text style={{ color: key === kind ? colors.primary : colors.textMuted, fontSize: 12 }}>{label}</Text></Pressable>)}</View><ScrollView contentContainerStyle={styles.library}>{!busy && !error && !items.length && <View style={styles.empty}><Ionicons name="albums-outline" size={36} color={colors.primary} /><Text>Chưa có nội dung trong mục này.</Text></View>}{items.map(item => <View key={item.id} style={styles.libraryItem}><Text style={styles.caption}>{item.senderName} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text><ChatMessageContent item={item} kind={kind} /></View>)}{busy && <ActivityIndicator color={colors.primary} />}{error ? <><Text style={styles.error}>{error}</Text><Pressable onPress={() => { if (cursor) void more(); else { setBusy(true); setError(''); setRetry(value => value + 1); } }}><Text style={{ color: colors.primary }}>Thử lại</Text></Pressable></> : null}{cursor && !busy && !error && <Pressable onPress={() => void more()} style={styles.libraryTab}><Text style={{ color: colors.primary }}>Xem thêm</Text></Pressable>}</ScrollView></SafeAreaView></Modal>;
}
const styles = StyleSheet.create({
  plus: { width: 40, height: 45, justifyContent: 'center', alignItems: 'center' }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(24,18,45,.3)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 18, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, title: { fontWeight: '700', fontSize: 17, flex: 1 }, caption: { color: colors.textMuted, fontSize: 11 }, choices: { flexDirection: 'row', gap: 8 }, choice: { flex: 1, alignItems: 'center', gap: 10, paddingVertical: 12 }, choiceIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, status: { flexDirection: 'row', gap: 12, alignItems: 'center' }, error: { color: colors.danger, fontSize: 12, paddingVertical: 8 }, file: { backgroundColor: '#F5F2FF', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, photo: { width: 220, height: 180, borderRadius: 14, backgroundColor: colors.surfaceMuted }, loadingMedia: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(108,71,255,0.12)' }, retryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF0F0' }, video: { backgroundColor: '#EDE7FF', alignItems: 'center', justifyContent: 'center', gap: 10 }, libraryTabs: { flexDirection: 'row', justifyContent: 'space-around', padding: 10, gap: 4 }, libraryTab: { padding: 12, borderRadius: 14, alignItems: 'center' }, library: { padding: 18, gap: 18, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' }, libraryItem: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, empty: { padding: 40, alignItems: 'center', gap: 16 },
});
