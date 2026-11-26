import { SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { evictCacheKey, getCached, setCached } from './remoteCache';

export type RemoteOptions = {
  cacheKey?: string;
  staleTimeMs?: number;
  tags?: string[];
  revalidateOnMount?: boolean;
};

const DEFAULT_STALE_TIME_MS = 15000;

function readCache<T>(cacheKey?: string) {
  if (!cacheKey || typeof getCached !== 'function') return null;
  return getCached<T>(cacheKey);
}

export function useRemote<T>(loader: () => Promise<T>, initial: T, enabled = true, options?: RemoteOptions) {
  const cacheKey = options?.cacheKey;
  const staleTimeMs = options?.staleTimeMs ?? DEFAULT_STALE_TIME_MS;
  const revalidateOnMount = options?.revalidateOnMount ?? false;
  const tagsKey = options?.tags?.join('\u0000') ?? '';

  const initialHit = readCache<T>(cacheKey);
  const [data, setDataState] = useState<T>(() => (initialHit ? initialHit.value : initial));
  const [dataFor, setDataFor] = useState(() => loader);
  const [loading, setLoading] = useState(() => !initialHit);
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState(() => loader);
  const generation = useRef(0);
  const loadedRef = useRef<(() => Promise<T>) | null>(initialHit ? loader : null);
  const pending = useRef<{ loader: () => Promise<T>; task: Promise<void>; followup?: Promise<void> } | null>(null);

  const setData = useCallback((value: SetStateAction<T>) => {
    const tags = tagsKey ? tagsKey.split('\u0000') : undefined;
    setDataState(prev => {
      const next = typeof value === 'function' ? (value as (current: T) => T)(prev) : value;
      if (cacheKey && typeof setCached === 'function') {
        setCached(cacheKey, next, { staleTimeMs, tags });
      }
      return next;
    });
  }, [cacheKey, staleTimeMs, tagsKey]);

  const reload = useCallback(function reloadRemote(background = false, fresh = false): Promise<void> {
    if (pending.current?.loader === loader) {
      if (background && !fresh) return pending.current.task;
      // A user action may have committed a write after this GET started.
      // Queue one fresh read; background ticks simply join the current request.
      const queuedFor = generation.current;
      pending.current.followup ??= pending.current.task.then(() => { if (generation.current === queuedFor) return reloadRemote(background, fresh); });
      return pending.current.followup;
    }
    const current = ++generation.current;
    const tags = tagsKey ? tagsKey.split('\u0000') : undefined;
    if (!background) setLoading(true);
    if (!background) setError('');
    const task = (async () => {
      try {
        const result = await loader();
        if (current === generation.current) {
          setDataState(result);
          setDataFor(() => loader);
          setError('');
          loadedRef.current = loader;
          if (cacheKey && typeof setCached === 'function') {
            setCached(cacheKey, result, { staleTimeMs, tags });
          }
        }
      } catch (reason) {
        const status = (reason as { status?: number } | null)?.status;
        const revoked = status === 401 || status === 403 || status === 404;
        if (revoked && cacheKey && typeof evictCacheKey === 'function') evictCacheKey(cacheKey);
        if (current === generation.current) {
          if (!background || revoked || loadedRef.current !== loader) {
            setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu');
          }
        }
      } finally {
        if (current === generation.current) {
          setLoadedFor(() => loader);
          setLoading(false);
        }
      }
    })();
    pending.current = { loader, task };
    void task.finally(() => { if (pending.current?.task === task) pending.current = null; });
    return task;
  }, [loader, cacheKey, staleTimeMs, tagsKey]);

  const invalidate = useCallback(() => { generation.current++; pending.current = null; }, []);

  useEffect(() => {
    if (!enabled) return;
    const cached = readCache<T>(cacheKey);
    if (cached) {
      loadedRef.current = loader;
      const timer = setTimeout(() => {
        setDataState(cached.value);
        setDataFor(() => loader);
        setLoadedFor(() => loader);
        setLoading(false);
        setError('');
        if (!cached.fresh || revalidateOnMount) void reload(true);
      }, 0);
      return () => { clearTimeout(timer); invalidate(); };
    }
    const hasCurrentData = loadedRef.current === loader;
    const timer = setTimeout(() => void reload(hasCurrentData), 0);
    return () => { clearTimeout(timer); invalidate(); };
  }, [reload, invalidate, enabled, cacheKey, loader, revalidateOnMount]);

  const renderHit = dataFor !== loader ? readCache<T>(cacheKey) : null;
  const effectiveData = renderHit ? renderHit.value : data;
  const effectiveDataIsCurrent = dataFor === loader || Boolean(renderHit);
  const effectiveLoading = enabled && !renderHit && (loading || loadedFor !== loader);

  return { data: effectiveData, setData, dataIsCurrent: effectiveDataIsCurrent, loading: effectiveLoading, error, reload };
}
