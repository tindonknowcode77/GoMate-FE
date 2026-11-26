import { Platform } from 'react-native';
import { api, apiBaseUrl, ApiError, getSession, subscribeSession } from './api';
import type { HistoryPage } from './chatService';

export type ChatAttachment = { id: string; name: string; size: number; mimeType: string; kind: 'image' | 'video' | 'audio' | 'file'; localUri?: string };
export type ChatLocation = { latitude: number; longitude: number; label: string };
export type SharedKind = 'media' | 'files' | 'links' | 'locations';
export const attachmentUrl = (conversationId: string, id: string) => `${apiBaseUrl}/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(id)}`;
export const chatHeaders = () => ({ Authorization: `Bearer ${getSession()?.accessToken || ''}` });
export const sharedContent = (id: string, kind: SharedKind, before?: string) => api<HistoryPage>(`/conversations/${encodeURIComponent(id)}/shared?kind=${kind}&limit=30${before ? `&before=${before}` : ''}`);
export const locationUrl = (location: ChatLocation) => `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
export const fileSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const mediaUriCache = new Map<string, string>();
const pendingMediaLoads = new Map<string, Promise<string>>();

subscribeSession(() => {
  if (Platform.OS === 'web' && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    for (const uri of mediaUriCache.values()) {
      if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    }
  }
  mediaUriCache.clear();
  pendingMediaLoads.clear();
});

export function rememberAttachmentUri(conversationId: string, attachmentId: string, uri: string) {
  if (uri) mediaUriCache.set(`${conversationId}:${attachmentId}`, uri);
}

export function getCachedAttachmentUri(conversationId: string, attachmentId: string) {
  return mediaUriCache.get(`${conversationId}:${attachmentId}`) || '';
}

export function evictProtectedMediaUri(cacheKey: string) {
  const existing = mediaUriCache.get(cacheKey);
  if (existing && Platform.OS === 'web' && existing.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(existing);
  }
  mediaUriCache.delete(cacheKey);
}

function extensionForMime(mimeType?: string, fallbackName?: string) {
  const fromName = fallbackName?.match(/(\.[a-zA-Z0-9]{1,8})$/)?.[1];
  if (fromName) return fromName.toLowerCase();
  if (!mimeType) return '.bin';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('quicktime')) return '.mov';
  if (mimeType.includes('webm')) return '.webm';
  return '.bin';
}

export function resolveProtectedMediaUri(url: string, cacheKey: string, mimeType?: string, filename?: string): Promise<string> {
  const cached = mediaUriCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const existing = pendingMediaLoads.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    const headers = chatHeaders();
    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Không tải được nội dung.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      mediaUriCache.set(cacheKey, objectUrl);
      return objectUrl;
    }
    const { File, Paths } = await import('expo-file-system');
    const safeKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-64);
    const ext = extensionForMime(mimeType, filename);
    const destination = new File(Paths.cache, `gm-media-${safeKey}${ext}`);
    const downloaded = await File.downloadFileAsync(url, destination, { headers, idempotent: true });
    mediaUriCache.set(cacheKey, downloaded.uri);
    return downloaded.uri;
  })();

  pendingMediaLoads.set(cacheKey, task);
  void task.finally(() => {
    if (pendingMediaLoads.get(cacheKey) === task) pendingMediaLoads.delete(cacheKey);
  });
  return task;
}

export async function uploadChatFile(conversationId: string, asset: { uri: string; name: string; mimeType?: string; size?: number; file?: File }) {
  if ((asset.size ?? 0) > 10 * 1024 * 1024) throw new Error('Mỗi tệp tối đa 10 MB.');
  const url = `${apiBaseUrl}/conversations/${encodeURIComponent(conversationId)}/attachments`;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 120000);
  try {
    if (Platform.OS === 'web') {
      const body = new FormData();
      const blob = asset.file ?? await (await fetch(asset.uri)).blob();
      if (blob.size > 10 * 1024 * 1024) throw new Error('Mỗi tệp tối đa 10 MB.');
      body.append('file', blob, asset.name);
      const response = await fetch(url, { method: 'POST', headers: chatHeaders(), body, signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(payload?.error || 'Chưa tải được tệp.', response.status);
      const attachment = payload.attachment as ChatAttachment;
      const previewUri = asset.uri || URL.createObjectURL(blob);
      rememberAttachmentUri(conversationId, attachment.id, previewUri);
      return { ...attachment, localUri: previewUri };
    }
    const { File, UploadType } = await import('expo-file-system');
    const nativeFile = new File(asset.uri);
    const result = await nativeFile.upload(url, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: asset.mimeType || 'application/octet-stream',
      headers: chatHeaders(),
      signal: controller.signal,
    });
    let payload: { attachment?: ChatAttachment; error?: string } | null = null;
    try { payload = JSON.parse(result.body); } catch { payload = null; }
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(payload?.error || 'Chưa tải được tệp.', result.status);
    }
    if (!payload?.attachment) throw new Error('Chưa tải được tệp.');
    rememberAttachmentUri(conversationId, payload.attachment.id, asset.uri);
    return { ...payload.attachment, localUri: asset.uri };
  } finally { clearTimeout(timer); }
}

export async function downloadChatFile(conversationId: string, file: ChatAttachment) {
  const url = attachmentUrl(conversationId, file.id), headers = chatHeaders();
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Không tải được tệp. Kiểm tra quyền truy cập và thử lại.');
    const href = URL.createObjectURL(await response.blob()), anchor = document.createElement('a');
    anchor.href = href; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 30000);
  } else {
    const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
    if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị chưa hỗ trợ chia sẻ tệp.');
    const name = file.name.replace(/[^\p{L}\p{N}._-]/gu, '_');
    const downloaded = await File.downloadFileAsync(url, new File(Paths.cache, `${file.id}-${name}`), { headers, idempotent: true });
    await Sharing.shareAsync(downloaded.uri, { mimeType: file.mimeType });
  }
}
