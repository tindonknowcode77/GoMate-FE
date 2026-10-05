export type Credentials = { email: string; password: string };
export type Session = {
  accessToken: string;
  user: { id: string; name: string; email: string };
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

let session: Session | null = null;
export const getSession = () => session;

async function request<T>(path: string, body: object): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
  if (!base) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_BASE_URL trong .env.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${base}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new ApiError(data?.error || 'Yêu cầu thất bại. Vui lòng thử lại.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  } finally { clearTimeout(timeout); }
}

export const register = (data: Credentials & { name: string }) => request('register', data);
export const verifyEmail = (email: string, code: string) => request('verify-email', { email, code });
export const resendVerification = (email: string) => request('resend-verification', { email });
export async function login(data: Credentials) {
  const result = await request<Session>('login', data);
  if (!result?.accessToken || !result.user) throw new Error('Phản hồi đăng nhập không hợp lệ.');
  session = result;
  return result;
}
export async function logout() {
  try { await request('logout', {}); }
  catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  session = null;
}
