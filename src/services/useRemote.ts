import { useCallback, useEffect, useRef, useState } from 'react';

export function useRemote<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState(() => loader);
  const generation = useRef(0);
  const pending = useRef<{ loader: () => Promise<T>; task: Promise<void>; followup?: Promise<void> } | null>(null);
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
    if (!background) setLoading(true); setError('');
    const task = (async () => {
      try { const result = await loader(); if (current === generation.current) setData(result); }
      catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu'); }
      finally { if (current === generation.current) { setLoadedFor(() => loader); setLoading(false); } }
    })();
    pending.current = { loader, task };
    void task.finally(() => { if (pending.current?.task === task) pending.current = null; });
    return task;
  }, [loader]);
  const invalidate = useCallback(() => { generation.current++; pending.current = null; }, []);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => { clearTimeout(timer); invalidate(); };
  }, [reload, invalidate]);
  return { data, setData, loading: loading || loadedFor !== loader, error, reload };
}
