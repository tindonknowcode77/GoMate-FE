import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePortalText } from './usePortalText';

const NoticeContext = createContext(null);

export function PortalNotifications({ children }) {
  const t = usePortalText();
  const [notices, setNotices] = useState([]);
  const timers = useRef(new Map());
  const sequence = useRef(0);
  const dismiss = useCallback(id => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotices(current => current.filter(notice => notice.id !== id));
  }, []);
  const notify = useCallback((message, tone = 'success') => {
    if (!message) return;
    const id = ++sequence.current;
    setNotices(current => [...current, { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), tone === 'error' ? 10000 : 6000));
  }, [dismiss]);
  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);
  return <NoticeContext.Provider value={notify}>{children}{createPortal(
    <div className="gm-action-notices" aria-label={t('Thông báo thao tác')}>
      {notices.map(notice => <div key={notice.id} className={`gm-action-notice gm-action-notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
        <span>{t(notice.message)}</span><button type="button" aria-label={t('Đóng thông báo')} onClick={() => dismiss(notice.id)}>×</button>
      </div>)}
    </div>, document.body,
  )}</NoticeContext.Provider>;
}

export function usePortalNotice() {
  const notify = useContext(NoticeContext);
  if (!notify) throw new Error('PortalNotifications is required');
  return notify;
}
