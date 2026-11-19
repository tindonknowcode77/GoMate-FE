import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import AdminRevenueAnalytics from './AdminRevenueAnalytics';
import './admin-business-workspace.css';

type Resource = 'posts' | 'activities' | 'conversations';
type HistoryItem = {
  id: string; title?: string; copy?: string; status?: string; type?: string; createdAt?: string;
  startsAt?: string; endsAt?: string; startedAt?: string; completedAt?: string; cancelledAt?: string;
  memberCount?: number; messageCount?: number; reviewNote?: string;
  updates?: { type: string; createdAt?: string }[]; history?: { type: string; createdAt?: string }[];
};
type HistoryResult = { items: HistoryItem[]; hasMore: boolean; total: number };
type Message = { id: string; senderName?: string; kind?: string; text?: string; createdAt?: string; attachments?: { name: string; kind: string }[] };
type MessageResult = { items: Message[]; hasMore: boolean; nextCursor: string | null };
const date = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const statusKeys: Record<string, string> = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', published: 'Published', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled', withdrawn: 'Withdrawn', deleted: 'Deleted', publishing: 'Publishing', 'pending-review': 'Pending review' };
const eventKeys: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', started: 'Started', completed: 'Completed', cancelled: 'Cancelled', withdrawn: 'Withdrawn', deleted: 'Deleted', 'details-updated': 'Details updated', 'plan-updated': 'Plan updated', 'schedule-confirmed': 'Schedule confirmed' };
type Text = (key: string) => string;

function ConversationMessages({ businessId, conversation, t, onBack }: { businessId: string; conversation: HistoryItem; t: Text; onBack: () => void }) {
  const [query, setQuery] = useState(''), [before, setBefore] = useState<string | undefined>();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; data?: MessageResult; error?: string }>({ key: '' });
  const key = `${businessId}:${conversation.id}:${query}:${before || ''}:${retry}`, loading = state.key !== key;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query, limit: '30' }); if (before) params.set('before', before);
      api<MessageResult>(`/portal/admin/businesses/${encodeURIComponent(businessId)}/conversations/${encodeURIComponent(conversation.id)}/messages?${params}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
        .catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [businessId, conversation.id, query, before, key]);
  return <section className="gm-business-messages">
    <header className="gm-business-history-heading"><button type="button" className="gm-btn gm-btn--secondary" onClick={onBack}>{t('Back to conversations')}</button><h4>{conversation.title || t('Conversation')}</h4></header>
    <p className="gm-live-muted">{t('Read-only review. Participant read status is unchanged.')}</p>
    <label className="gm-field"><span>{t('Search message content')}</span><input className="gm-simple-input" value={query} maxLength={120} onChange={event => { setQuery(event.target.value); setBefore(undefined); }} /></label>
    {loading ? <p role="status">{t('Loading messages')}</p> : state.error ? <p role="alert">{state.error} <button type="button" className="gm-btn gm-btn--secondary" onClick={() => setRetry(value => value + 1)}>{t('Retry')}</button></p> : <>
      {!state.data?.items.length && <p>{t('No messages found')}</p>}
      <ol className="gm-business-message-list">{[...(state.data?.items ?? [])].reverse().map(message => <li key={message.id}><header><strong>{message.senderName || t('System message')}</strong><time>{date(message.createdAt)}</time></header><p>{message.text || (message.attachments?.length ? t('Attachment message') : t('System message'))}</p>{message.attachments?.map((file, index) => <small key={index}>{t('Attachment')}: {file.name}</small>)}</li>)}</ol>
      <div className="gm-live-actions"><button type="button" className="gm-btn gm-btn--secondary" disabled={!state.data?.hasMore} onClick={() => setBefore(state.data?.nextCursor || undefined)}>{t('Older messages')}</button><button type="button" className="gm-btn gm-btn--secondary" onClick={() => { setBefore(undefined); setRetry(value => value + 1); }}>{t('Latest messages')}</button></div>
    </>}
  </section>;
}

function ResourceHistory({ businessId, resource, t }: { businessId: string; resource: Resource; t: Text }) {
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [conversation, setConversation] = useState<HistoryItem | null>(null);
  const [state, setState] = useState<{ key: string; data?: HistoryResult; error?: string }>({ key: '' });
  const key = `${businessId}:${resource}:${query}:${page}:${retry}`, loading = state.key !== key;
  useEffect(() => {
    if (conversation) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<HistoryResult>(`/portal/admin/businesses/${encodeURIComponent(businessId)}/history/${resource}?${new URLSearchParams({ q: query, page: String(page) })}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
        .catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [businessId, resource, query, page, key, conversation]);
  if (conversation) return <ConversationMessages key={`${businessId}:${conversation.id}`} businessId={businessId} conversation={conversation} t={t} onBack={() => setConversation(null)} />;
  return <div className="gm-business-history-list">
    <div className="gm-business-history-tools"><label className="gm-field"><span>{t(resource === 'conversations' ? 'Search conversations' : 'Search history')}</span><input className="gm-simple-input" value={query} maxLength={120} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label><button type="button" className="gm-btn gm-btn--secondary" disabled={loading} onClick={() => setRetry(value => value + 1)}>{t('Refresh')}</button></div>
    {resource === 'conversations' && <p className="gm-live-muted">{t('Business activity groups and direct chats of the business account. Admin access is logged.')}</p>}
    {loading ? <p role="status">{t('Loading history')}</p> : state.error ? <p role="alert">{state.error} <button type="button" className="gm-btn gm-btn--secondary" onClick={() => setRetry(value => value + 1)}>{t('Retry')}</button></p> : <>
      {!state.data?.items.length && <p>{t('No history found')}</p>}
      {state.data?.items.map(item => <article className="gm-business-history-card" key={item.id}><header><h4>{item.title || t('Conversation')}</h4><span className="gm-business-history-status">{resource === 'conversations' ? t(item.type === 'group' ? 'Activity group' : 'Direct conversation') : t(statusKeys[item.status || ''] || 'Updated')}</span></header><small>{date(item.createdAt)}</small>
        {item.copy && <p>{item.copy}</p>}{item.reviewNote && <p>{t('Review note')}: {item.reviewNote}</p>}
        {resource === 'activities' && <dl><div><dt>{t('Activity time')}</dt><dd>{date(item.startsAt)} – {date(item.endsAt)}</dd></div><div><dt>{t('Participants')}</dt><dd>{item.memberCount ?? 0}</dd></div>{item.startedAt && <div><dt>{t('Started')}</dt><dd>{date(item.startedAt)}</dd></div>}{item.completedAt && <div><dt>{t('Completed')}</dt><dd>{date(item.completedAt)}</dd></div>}{item.cancelledAt && <div><dt>{t('Cancelled')}</dt><dd>{date(item.cancelledAt)}</dd></div>}</dl>}
        {(item.updates?.length || item.history?.length) ? <details><summary>{t('Change history')}</summary><ul>{(item.updates || item.history || []).map((event, index) => <li key={index}>{t(eventKeys[event.type] || 'Updated')} · {date(event.createdAt)}</li>)}</ul></details> : null}
        {resource === 'conversations' && <div className="gm-live-actions"><span>{item.messageCount ?? 0} {t('messages')}</span><button type="button" className="gm-btn gm-btn--secondary" onClick={() => setConversation(item)}>{t('View messages')}</button></div>}
      </article>)}
      <div className="gm-business-history-pagination"><button type="button" className="gm-btn gm-btn--secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('Previous page')}</button><span>{page} / {Math.max(1, Math.ceil((state.data?.total ?? 0) / 20))} · {state.data?.total ?? 0} {t('entries')}</span><button type="button" className="gm-btn gm-btn--secondary" disabled={!state.data?.hasMore} onClick={() => setPage(value => value + 1)}>{t('Next page')}</button></div>
    </>}
  </div>;
}

export default function AdminBusinessWorkspace({ businessId, company }: { businessId: string; company: string }) {
  const { translate: t } = useLanguage();
  const [tab, setTab] = useState<Resource | 'finance'>('posts');
  return <section className="gm-business-inspection" aria-label={t('Business records')}>
    <h4>{t('Business records')}</h4>
    <div className="gm-business-history-tabs" role="tablist" aria-label={t('Business records')}>{(['posts', 'activities', 'conversations', 'finance'] as const).map(value => <button type="button" role="tab" id={`business-${businessId}-${value}`} aria-controls={`business-${businessId}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} key={value} onClick={() => setTab(value)} onKeyDown={event => {
      const order = ['posts', 'activities', 'conversations', 'finance'] as const;
      const index = order.indexOf(value);
      const next = event.key === 'ArrowRight' ? (index + 1) % order.length : event.key === 'ArrowLeft' ? (index + order.length - 1) % order.length : event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); setTab(order[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{t({ posts: 'Business posts', activities: 'Activity history', conversations: 'Conversation history', finance: 'Financial report' }[value])}</button>)}</div>
    <div id={`business-${businessId}-panel`} role="tabpanel" aria-labelledby={`business-${businessId}-${tab}`}>
      {tab === 'finance' ? <AdminRevenueAnalytics key={businessId} businessId={businessId} company={company} t={t} /> : <ResourceHistory key={`${businessId}:${tab}`} businessId={businessId} resource={tab} t={t} />}
    </div>
  </section>;
}
