import { useCallback, useEffect, useRef, useState } from 'react';
import { RemoteOptions, useRemote } from './useRemote';

export type RemotePage<T> = { items: T[]; hasMore: boolean; total: number; unreadCount?: number; page?: number };

// Append-only pagination: loading more fetches only page N+1 instead of refetching pages 1..N.
export function usePagedRemote<T extends { id: string }>(loadPage: (page: number) => Promise<RemotePage<T>>, enabled = true, options?: RemoteOptions) {
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const generation = useRef(0);
  const morePending = useRef(false);
  useEffect(() => () => { generation.current++; morePending.current = false; }, [loadPage, enabled]);
  const loadFirst = useCallback(async () => {
    generation.current++; morePending.current = false; setLoadingMore(false);
    pageRef.current = 1;
    const first = await loadPage(1);
    return { ...first, page: 1 };
  }, [loadPage]);
  // Pause off-screen requests without deleting the page already on screen.
  const remote = useRemote<RemotePage<T>>(loadFirst, { items: [], hasMore: false, total: 0 }, enabled, options);
  const loadMore = useCallback(async () => {
    if (!enabled || remote.loading || morePending.current || !remote.data.hasMore) return;
    morePending.current = true;
    const current = generation.current;
    setLoadingMore(true);
    try {
      const nextPage = (remote.data.page ?? pageRef.current) + 1;
      const next = await loadPage(nextPage);
      if (current !== generation.current) return;
      pageRef.current = nextPage;
      remote.setData(prev => current !== generation.current ? prev : ({
        ...next,
        page: nextPage,
        items: [...new Map([...prev.items, ...next.items].map(item => [item.id, item])).values()],
      }));
    } catch {
      // Keep already loaded items intact if a load-more request fails.
    } finally {
      if (current === generation.current) { morePending.current = false; setLoadingMore(false); }
    }
  }, [enabled, loadPage, remote]);
  return { ...remote, data: remote.dataIsCurrent ? remote.data : { items: [], hasMore: false, total: 0 }, loadingMore, loadMore };
}
