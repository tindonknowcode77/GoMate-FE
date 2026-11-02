import { useEffect, useState } from 'react';
import GoMatePortal from './gomate-portal/ConnectedPortal';
import { LanguageProvider } from './i18n/LanguageContext';
import { setSession } from './services/api';
import type { Session } from './services/api';

type WebViewBridgeWindow = Window & { ReactNativeWebView?: { injectedObjectJson?: () => string } };

async function initializeEmbeddedStaffSession() {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/staff')) return;
  const bridge = (window as WebViewBridgeWindow).ReactNativeWebView;
  if (!bridge?.injectedObjectJson) return;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const injected = bridge.injectedObjectJson();
      const session = injected ? (JSON.parse(injected).gomateSession as Session | undefined) : undefined;
      if (session && typeof session.accessToken === 'string' && typeof session.user?.id === 'string') {
        setSession(session);
        return;
      }
    } catch { /* Wait for the WebView bridge to provide the session object. */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export default function PortalEntry() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void initializeEmbeddedStaffSession().finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  if (!ready) return <main className="portal-auth">Đang mở không gian Staff…</main>;
  return <LanguageProvider><GoMatePortal /></LanguageProvider>;
}
