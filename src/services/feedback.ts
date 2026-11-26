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
  const [state, setState] = useState({ value: initial as unknown as Value, revision: 0 });
  const alive = useRef(true);
  const shownRevision = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const setFeedback: Dispatch<SetStateAction<Value>> = useCallback(next => {
    if (!alive.current) return;
    // React may replay an updater during render. Keep it free of notifications.
    setState(previous => ({
      value: typeof next === 'function' ? (next as (prev: Value) => Value)(previous.value) : next,
      revision: previous.revision + 1,
    }));
  }, []);
  useEffect(() => {
    if (shownRevision.current === state.revision) return;
    shownRevision.current = state.revision;
    if (typeof state.value === 'string' && state.value.trim()) {
      const text = state.value.trim();
      const isProfileIssue = /hồ sơ|bổ sung thông tin|điều kiện nhóm|điều kiện hoạt động/i.test(text);
      showFeedbackModal(isProfileIssue && profileRedirectHandler ? {
        title: 'Cần bổ sung thông tin hồ sơ',
        message: text,
        actionLabel: 'Bổ sung thông tin ngay',
        onAction: () => profileRedirectHandler?.(),
      } : { message: text });
    }
  }, [state]);
  return [state.value, setFeedback] as const;
}
