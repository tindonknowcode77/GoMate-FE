import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { watchUserUpdates } from './chatEvents';

export function useLiveRefresh(reload: (background?: boolean, fresh?: boolean) => Promise<void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let connected = false, disposed = false, timer: ReturnType<typeof setTimeout>, debounce: ReturnType<typeof setTimeout>;
    const visible = () => AppState.currentState !== 'background' && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
    const refresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { if (!disposed && visible()) void reload(true, true); }, 150);
    };
    const stop = watchUserUpdates(refresh, value => { connected = value; });
    const fallback = async () => {
      if (!connected && visible()) await reload(true);
      if (!disposed) timer = setTimeout(() => void fallback(), 30000);
    };
    timer = setTimeout(() => void fallback(), 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; stop(); clearTimeout(timer); clearTimeout(debounce); subscription.remove(); if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh); };
  }, [reload, enabled]);
}
