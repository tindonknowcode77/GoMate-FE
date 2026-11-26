type ApiUrlOptions = {
  configuredUrl?: string;
  development: boolean;
  platform: string;
  hostUri?: string | null;
  webOrigin?: string;
};

export function resolveApiBaseUrl({ configuredUrl, development, platform, hostUri, webOrigin }: ApiUrlOptions): string {
  const nativeHost = (url: URL) => {
    // Android Emulator's loopback belongs to Android, not the development PC.
    // Keep explicit remote/LAN URLs untouched (physical devices use a LAN URL).
    if (development && platform === 'android' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.hostname = '10.0.2.2';
    return url.toString().replace(/\/$/, '');
  };
  const explicit = configuredUrl?.trim();
  if (explicit) {
    try { return nativeHost(new URL(explicit)); }
    catch { if (platform === 'web' || !explicit.startsWith('/')) return explicit.replace(/\/$/, ''); }
    // Relative same-origin web configuration cannot be used by native fetch.
  }

  if (development) {
    const source = platform === 'web' ? webOrigin : hostUri;
    if (source) {
      try {
        const url = new URL(source.includes('://') ? source : `http://${source}`);
        // API runs beside Metro, rather than on Metro's port.
        url.protocol = 'http:';
        url.port = '3000';
        url.pathname = '/api';
        url.search = '';
        url.hash = '';
        return nativeHost(url);
      } catch { /* Fall back when the development host is unavailable. */ }
    }
  }

  if (platform === 'web') return '/api';
  return `http://${platform === 'android' ? '10.0.2.2' : 'localhost'}:3000/api`;
}
