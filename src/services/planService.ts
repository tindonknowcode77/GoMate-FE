import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, apiBaseUrl, getSession } from './api';
import type { ActivityDto } from './activityApi';

export type ItineraryStep = { id: string; date: string; time: string; title: string; place: string; note: string };
export type PlanFile = { id: string; name: string; size: number; mimeType: string };
export type PlanAttachment = { name: string; base64: string };
export type PlanDraft = { itinerary: ItineraryStep[]; planLink: string; planAttachment?: PlanAttachment | null; planFile?: PlanFile | null };
export function safePlanLink(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }

const PLAN_ACCEPT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
];
const PLAN_EXT_RE = /\.(pdf|docx?|xlsx?|png|jpe?g|webp)$/i;

export async function pickPlanFile(): Promise<PlanAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: PLAN_ACCEPT_TYPES, multiple: false, copyToCacheDirectory: true, base64: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!PLAN_EXT_RE.test(asset.name) || asset.name.length > 120 || (asset.size ?? 0) > 10 * 1024 * 1024) {
    throw new Error('Chọn tệp PDF, Word, Excel hoặc ảnh (.png/.jpg/.webp), tối đa 10 MB.');
  }
  let base64 = asset.base64?.split(',').pop();
  if (!base64 && asset.uri.startsWith('data:')) base64 = asset.uri.split(',')[1];
  if (!base64 && Platform.OS !== 'web') { const { File } = await import('expo-file-system'); base64 = await new File(asset.uri).base64(); }
  if (!base64 || base64.length > 14000000) throw new Error('Không đọc được tệp hoặc tệp lớn hơn 10 MB.');
  return { name: asset.name, base64 };
}

export async function downloadPlanFile(activityId: string, file: PlanFile) {
  const url = `${apiBaseUrl}/activities/${encodeURIComponent(activityId)}/plan-file?version=${encodeURIComponent(file.id)}`;
  const headers = { Authorization: `Bearer ${getSession()?.accessToken || ''}` };
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Không tải được tệp. Tải lại kế hoạch và thử lại.');
    const blob = await response.blob(), href = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = href; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 30000);
  } else {
    const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
    if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị chưa hỗ trợ mở/chia sẻ tệp.');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const downloaded = await File.downloadFileAsync(url, new File(Paths.cache, `${file.id}.${ext}`), { headers, idempotent: true });
    await Sharing.shareAsync(downloaded.uri, { mimeType: file.mimeType });
  }
}

export async function saveActivityPlan(activityId: string, version: number, draft: PlanDraft) {
  return (await api<{ activity: ActivityDto }>(`/activities/${encodeURIComponent(activityId)}/plan`, { method: 'PATCH', body: JSON.stringify({ version, itinerary: draft.itinerary, planLink: draft.planLink, ...(draft.planAttachment !== undefined ? { planAttachment: draft.planAttachment } : {}) }) })).activity;
}
