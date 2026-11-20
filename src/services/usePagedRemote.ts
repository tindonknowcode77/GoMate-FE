import { useCallback, useRef, useState } from 'react';
import { useRemote } from './useRemote';

export type RemotePage<T> = { items: T[]; hasMore: boolean; total: number; unreadCount?: number };

// Append-only pagination: loading more fetches only page N+1 instead of refetching pages 1..N.
export function usePagedRemote<T extends { id: string }>(loadPage: (page: number) => Promise<RemotePage<T>>, enabled = true) {
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const loadFirst = useCallback(async () => {
    pageRef.current = 1;
    if (!enabled) return { items: [], hasMore: false, total: 0 };
    return loadPage(1);
  }, [loadPage, enabled]);
  const remote = useRemote<RemotePage<T>>(loadFirst, { items: [], hasMore: false, total: 0 });
  const loadMore = useCallback(async () => {
    if (!enabled || remote.loading || loadingMore || !remote.data.hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const next = await loadPage(nextPage);
      pageRef.current = nextPage;
      remote.setData(prev => ({
        ...next,
        items: [...new Map([...prev.items, ...next.items].map(item => [item.id, item])).values()],
      }));
    } catch {
      // Keep already loaded items intact if a load-more request fails.
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, loadPage, loadingMore, remote]);
  return { ...remote, loadingMore, loadMore };
}
