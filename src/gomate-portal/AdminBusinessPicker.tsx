import { useEffect, useState } from 'react';
import { api } from '../services/api';
import './admin-business-workspace.css';

export type BusinessOption = { id: string; company: string; status: string };
type Directory = { items: BusinessOption[]; hasMore: boolean; total: number };
type Props = { value: BusinessOption | null; onChange: (business: BusinessOption | null) => void; t: (key: string) => string };

export default function AdminBusinessPicker({ value, onChange, t }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; data?: Directory; error?: string }>({ key: '' });
  const key = `${query}:${page}:${retry}`, loading = state.key !== key;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<Directory>(`/portal/admin/business-directory?${new URLSearchParams({ q: query, page: String(page) })}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
        .catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, key]);
  const items = loading ? [] : state.data?.items ?? [];
  const options = value && !items.some(item => item.id === value.id) ? [value, ...items] : items;
  return <section className="gm-panel gm-business-report-picker">
    <div><h3>{t('Financial report scope')}</h3></div>
    <label className="gm-field"><span>{t('Search businesses')}</span><input className="gm-simple-input" value={query} maxLength={120} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
    <label className="gm-field"><span>{t('Report business')}</span><select className="gm-simple-input" value={value?.id || ''} onChange={event => onChange(options.find(item => item.id === event.target.value) || null)}><option value="">{t('All businesses')}</option>{options.map(item => <option key={item.id} value={item.id}>{item.company}</option>)}</select></label>
    {loading && <p role="status">{t('Loading businesses')}</p>}
    {!loading && state.error && <p role="alert">{state.error} <button type="button" className="gm-btn gm-btn--secondary" onClick={() => setRetry(value => value + 1)}>{t('Retry')}</button></p>}
    {!loading && !state.error && <div className="gm-live-actions"><button className="gm-btn gm-btn--secondary" type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('Previous page')}</button><span>{page} · {state.data?.total ?? 0} {t('businesses')}</span><button className="gm-btn gm-btn--secondary" type="button" disabled={!state.data?.hasMore} onClick={() => setPage(value => value + 1)}>{t('Next page')}</button></div>}
  </section>;
}
