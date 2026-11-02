import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/LocalizedText';
import { api, apiBaseUrl, getSession, persistSession } from '../services/api';
import type { Session } from '../services/api';
import { colors } from '../theme';
import type { StaffWorkspaceScreenProps } from './StaffWorkspaceScreen';

function staffPortalUrl() {
  try {
    const configuredUrl = process.env.EXPO_PUBLIC_STAFF_PORTAL_URL?.trim();
    const origin = new URL(configuredUrl || apiBaseUrl).origin;
    return new URL('/staff', origin).toString();
  } catch {
    return '';
  }
}

export function StaffWorkspaceScreen({ onBack, onLogout }: StaffWorkspaceScreenProps) {
  const url = useMemo(() => staffPortalUrl(), []);
  const [staffSession, setStaffSession] = useState<Session | null>(null);
  const [accessError, setAccessError] = useState('');
  const [pageError, setPageError] = useState('');
  const [checking, setChecking] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    void api<{ role: string }>('/portal/me').then(user => {
      if (!alive) return;
      if (user.role !== 'staff') {
        setAccessError('Tài khoản này không có quyền mở giao diện Staff.');
        return;
      }
      const session = getSession();
      if (!session) {
        setAccessError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      if (!url) {
        setAccessError('Chưa cấu hình địa chỉ website GoMate cho giao diện Staff.');
        return;
      }
      setStaffSession(session);
      setAccessError('');
    }).catch(reason => {
      if (alive) setAccessError(reason instanceof Error ? reason.message : 'Không xác minh được quyền Staff.');
    }).finally(() => {
      if (alive) setChecking(false);
    });
    return () => { alive = false; };
  }, [reloadKey, url]);

  const allowedOrigin = useMemo(() => {
    try { return new URL(url).origin; }
    catch { return ''; }
  }, [url]);
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    if (!['gomate:logout', 'gomate:session-invalidated'].includes(event.nativeEvent.data)) return;
    void persistSession(null).finally(onLogout);
  };
  const allowNavigation = (request: { url: string }) => {
    try {
      const target = new URL(request.url);
      const staffRoute = target.origin === allowedOrigin && target.pathname.startsWith('/staff');
      const staffDownload = request.url.startsWith(`blob:${allowedOrigin}/`);
      return staffRoute || staffDownload;
    } catch {
      return false;
    }
  };

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader title="GoMate Staff" onBack={onBack} />
    {checking ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text>Đang xác minh quyền Staff…</Text></View>
      : accessError ? <View style={styles.center}><Text accessibilityRole="alert" style={styles.error}>{accessError}</Text><View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => { setChecking(true); setAccessError(''); setReloadKey(value => value + 1); }}><Text style={styles.action}>Thử lại</Text></Pressable><Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.action}>Quay lại hồ sơ</Text></Pressable></View></View>
        : staffSession ? <View style={styles.content}>
          {pageLoading && <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text>Đang mở không gian Staff…</Text></View>}
          {pageError ? <View style={styles.pageError}><Text accessibilityRole="alert" style={styles.error}>{pageError}</Text><Pressable accessibilityRole="button" onPress={() => { setPageError(''); setReloadKey(value => value + 1); }}><Text style={styles.action}>Tải lại</Text></Pressable></View>
            : <WebView key={reloadKey} source={{ uri: url }} style={styles.webview} originWhitelist={['http://*', 'https://*']} javaScriptEnabled domStorageEnabled incognito injectedJavaScriptObject={{ gomateSession: staffSession }} onShouldStartLoadWithRequest={allowNavigation} onMessage={handleMessage} onLoadStart={() => { setPageLoading(true); setPageError(''); }} onLoadEnd={() => setPageLoading(false)} onError={event => { setPageLoading(false); setPageError(event.nativeEvent.description || 'Không tải được giao diện Staff.'); }} onHttpError={event => { if (event.nativeEvent.statusCode >= 400) { setPageLoading(false); setPageError(`Website Staff trả về lỗi ${event.nativeEvent.statusCode}.`); } }} />}
        </View> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1 },
  webview: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center', padding: 24 },
  loading: { alignItems: 'center', backgroundColor: colors.surface, flexDirection: 'row', gap: 10, left: 0, padding: 12, position: 'absolute', right: 0, top: 0, zIndex: 1 },
  pageError: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 24 },
  action: { color: colors.primary, fontWeight: '700' },
});
