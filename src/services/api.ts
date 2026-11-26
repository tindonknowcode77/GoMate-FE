import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { resolveApiBaseUrl } from './apiUrl';
import * as SecureStore from 'expo-secure-store';

export const apiBaseUrl = resolveApiBaseUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  development: __DEV__,
  platform: Platform.OS,
  hostUri: Constants.expoConfig?.hostUri,
  webOrigin: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined,
});

export type Session = { accessToken: string; user: { id: string; name: string; email: string; emailVerified?: boolean } };
const sessionKey = 'gomate.session';
function restoreSession(): Session | null {
  if (Platform.OS !== 'web') return null;
  try {
    const value = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    return value && typeof value.accessToken === 'string' && typeof value.user?.id === 'string' ? value : null;
  } catch { return null; }
}
let session: Session | null = restoreSession();
let generation = 0;
let storageQueue: Promise<void> = Promise.resolve();
let onUnauthorized: (() => void) | undefined;
export const getSession = () => session;
const sessionListeners = new Set<() => void>();
export function subscribeSession(listener: () => void) { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; }
export const setSession = (value: Session | null) => { session = value; generation++;
  sessionListeners.forEach(listener => listener());
  if (Platform.OS === 'web') try {
    if (value) localStorage.setItem(sessionKey, JSON.stringify(value)); else localStorage.removeItem(sessionKey);
  } catch { /* Storage can be disabled by the browser. */ }
  else {
    storageQueue = storageQueue.catch(() => {}).then(() => value ? SecureStore.setItemAsync(sessionKey, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }) : SecureStore.deleteItemAsync(sessionKey));
    void storageQueue.catch(() => {});
  }
};
export async function persistSession(value: Session | null) {
  setSession(value);
  try { await storageQueue; }
  catch (reason) { if (value && session === value) setSession(null); throw reason; }
}
export async function initializeSession() {
  if (Platform.OS === 'web') return;
  const current = generation;
  await storageQueue.catch(() => {});
  const stored = await SecureStore.getItemAsync(sessionKey);
  if (current !== generation) return;
  let value: Session | null = null;
  try { value = JSON.parse(stored || 'null'); } catch { /* Discard damaged data. */ }
  if (!value || typeof value.accessToken !== 'string' || typeof value.user?.id !== 'string') { await persistSession(null); return; }
  session = value;
  sessionListeners.forEach(listener => listener());
  // MainApp checks the restored session against BE; network failure keeps a retry path.
}
export const setUnauthorizedHandler = (handler?: () => void) => { onUnauthorized = handler; };
export function expireSession() { setSession(null); onUnauthorized?.(); }
if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== sessionKey && event.key !== null) return;
  session = restoreSession(); generation++;
  sessionListeners.forEach(listener => listener());
  if (!session) onUnauthorized?.();
});

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

const pendingGets = new Map<string, Promise<unknown>>();
const mutationListeners = new Set<(path: string, method: string) => void>();
export function subscribeMutation(listener: (path: string, method: string) => void) {
  mutationListeners.add(listener);
  return () => { mutationListeners.delete(listener); };
}
export function api<T>(path: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    pendingGets.clear();
    return request<T>(path, options).then(result => {
      pendingGets.clear();
      mutationListeners.forEach(listener => listener(path, method));
      return result;
    }, reason => {
      pendingGets.clear();
      throw reason;
    });
  }
  if (options.signal || options.headers || options.body) return request<T>(path, options);
  const key = JSON.stringify([session?.accessToken ?? '', path, options]);
  const existing = pendingGets.get(key);
  if (existing) return existing as Promise<T>;
  const task = request<T>(path, options);
  pendingGets.set(key, task);
  const clear = () => { if (pendingGets.get(key) === task) pendingGets.delete(key); };
  void task.then(clear, clear);
  return task;
}

async function request<T>(path: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const token = session?.accessToken;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? (typeof options.body === 'string' && options.body.length > 100000 ? 90000 : 30000));
  try {
    const send = () => fetch(`${apiBaseUrl}${path}`, {
      ...options, cache: options.cache ?? 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    let response: Response;
    try { response = await send(); }
    catch (reason) {
      // A stale native connection can fail before a response. Retry reads once
      // inside the same timeout budget; never replay a mutation or HTTP error.
      if ((options.method ?? 'GET').toUpperCase() !== 'GET' || controller.signal.aborted || token !== session?.accessToken) throw reason;
      await new Promise(resolve => setTimeout(resolve, 250));
      if (controller.signal.aborted || token !== session?.accessToken) throw reason;
      response = await send();
    }
    if (token !== session?.accessToken) throw new ApiError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.', 409);
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => null);
    if (token !== session?.accessToken) throw new ApiError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.', 409);
    if (!response.ok) {
      if (response.status === 401 && token && session?.accessToken === token) { setSession(null); onUnauthorized?.(); }
      throw new ApiError(payload?.error || `Yêu cầu thất bại (${response.status})`, response.status, payload?.code);
    }
    if (payload === null) throw new Error('Không tải được dữ liệu. Vui lòng thử lại.');
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')
      ? 'Kết nối quá thời gian. Vui lòng thử lại.'
      : 'Không thể kết nối. Kiểm tra mạng và thử lại.');
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}

export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export async function login(email: string, password: string) {
  const result = await post<Session>('/auth/login', { email: email.trim(), password, rememberMe: true });
  await persistSession(result);
  return result;
}
export async function verifyEmail(email: string, code: string) {
  const result = await post<Session>('/auth/verify-email', { email: email.trim(), code });
  await persistSession(result);
  return result;
}
export async function logout() {
  try { await post<void>('/auth/logout', {}); } finally { await persistSession(null); }
}
