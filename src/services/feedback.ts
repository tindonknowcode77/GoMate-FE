import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export type FeedbackPayload = { message: string; title?: string; actionLabel?: string; onAction?: () => void; onDismiss?: () => void };
type Listener = (payload: FeedbackPayload | null) => void;
const listeners = new Set<Listener>();
let profileRedirectHandler: (() => void) | undefined;

export function setProfileRedirectHandler(handler?: () => void) { profileRedirectHandler = handler; }
export function subscribeFeedback(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function showFeedbackModal(payload: FeedbackPayload) {
  for (const listener of listeners) listener(payload);
}

export function promptProfileCompletion(message: string, onDismiss?: () => void) {
  showFeedbackModal({
    title: 'Cần bổ sung thông tin hồ sơ',
    message,
    actionLabel: 'Bổ sung thông tin ngay',
    onAction: () => profileRedirectHandler?.(),
    onDismiss,
  });
}

export function useFeedbackState<T extends string | undefined>(initial: T) {
  type Value = T extends string ? string : string | undefined;
  const [value, setValue] = useState<Value>(initial as unknown as Value);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const setFeedback: Dispatch<SetStateAction<Value>> = useCallback(next => {
    if (!alive.current) return;
    setValue(previous => {
      const resolved = typeof next === 'function' ? (next as (prev: Value) => Value)(previous) : next;
      if (typeof resolved === 'string' && resolved.trim()) {
        const text = resolved.trim();
        const isProfileIssue = /hồ sơ|bổ sung thông tin|điều kiện nhóm|điều kiện hoạt động/i.test(text);
        showFeedbackModal(isProfileIssue && profileRedirectHandler ? {
          title: 'Cần bổ sung thông tin hồ sơ',
          message: text,
          actionLabel: 'Bổ sung thông tin ngay',
          onAction: () => profileRedirectHandler?.(),
        } : { message: text });
      }
      return resolved;
    });
  }, []);
  return [value, setFeedback] as const;
}
