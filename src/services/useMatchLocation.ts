import { useEffect, useRef, useState } from 'react';
import { Coordinates, currentCoordinates } from './locationService';

// ~50m tolerance so stationary GPS jitter does not thrash Match filters or refetch discovery.
const COORD_EPSILON = 0.00045;
function sameLocation(a: Coordinates | null, b: Coordinates) {
  return Boolean(a && Math.abs(a.latitude - b.latitude) < COORD_EPSILON && Math.abs(a.longitude - b.longitude) < COORD_EPSILON);
}

// Refresh on Match entry, sharing an in-flight fix across navigation and
// StrictMode effect replays. Reuse already-acquired coordinates immediately on
// re-entry while refreshing GPS silently in the background.
export function useMatchLocation(enabled: boolean) {
  const pending = useRef<Promise<Coordinates> | null>(null);
  const [result, setResult] = useState<{ coordinates: Coordinates | null; error: string; done: boolean }>({ coordinates: null, error: '', done: false });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const timer = setTimeout(() => {
      pending.current ??= currentCoordinates();
      const task = pending.current;
      setResult(previous => ({ ...previous, error: '', done: Boolean(previous.coordinates) }));
      void task.then(coordinates => {
        if (pending.current === task) pending.current = null;
        if (alive) {
          setResult(previous => ({
            coordinates: sameLocation(previous.coordinates, coordinates) ? previous.coordinates : coordinates,
            error: '',
            done: true,
          }));
        }
      }, reason => {
        if (pending.current === task) pending.current = null;
        if (alive) {
          setResult(previous => previous.coordinates
            ? { ...previous, error: '', done: true }
            : { coordinates: null, error: reason instanceof Error ? reason.message : 'Chưa lấy được vị trí. Bạn có thể chọn trong bộ lọc.', done: true });
        }
      });
    }, 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [enabled]);
  return { ...result, loading: enabled && !result.done };
}
