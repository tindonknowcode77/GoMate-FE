import { useEffect, useState } from 'react';
import { apiBaseUrl, getSession } from '../services/api';
import { usePortalText } from './usePortalText';
import { Icon } from './GoMatePortal';

export default function VerificationDocumentPreview({ file, metadata, applicationId, revision, kind = 'primary' }) {
  const t = usePortalText();
  const [preview, setPreview] = useState(null), [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const mime = file?.type || metadata?.mime;
  const name = file?.name || metadata?.name;
  const isImage = ['image/png', 'image/jpeg'].includes(mime);
  const isPdf = mime === 'application/pdf';
  const canPreview = isImage || isPdf;
  const source = file || `${applicationId}:${kind}:${revision}:${name}:${mime}`;

  useEffect(() => {
    let alive = true, objectUrl;
    const controller = new AbortController();
    const token = getSession()?.accessToken;
    setPreview(null);
    setError('');
    if (!canPreview || (!file && !applicationId)) return () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), 15000);
    void (async () => {
      let blob = file;
      if (!blob) {
        const response = await fetch(
          `${apiBaseUrl}/portal/applications/${encodeURIComponent(applicationId)}/document${kind === 'supplemental' ? '?kind=supplemental' : ''}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' }
        );
        if (!response.ok) throw Error('Không tải được tài liệu.');
        const contentType = response.headers.get('content-type')?.split(';')[0];
        if (!['image/png', 'image/jpeg', 'application/pdf'].includes(contentType)) throw Error('Định dạng tài liệu không hợp lệ.');
        blob = await response.blob();
      }
      if (!alive || getSession()?.accessToken !== token) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ url: objectUrl, name, source, isPdf });
    })().catch(() => {
      if (alive) setError(isPdf ? 'Không tải được bản xem trước PDF.' : 'Không tải được ảnh tài liệu.');
    }).finally(() => clearTimeout(timeout));
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, applicationId, kind, canPreview, isPdf, mime, name, source, retry]);

  if (!name) return null;
  return (
    <div className="gm-document-preview">
      {canPreview ? (
        error ? (
          <div role="alert">
            <span>{t(error)}</span>
            <button type="button" className="gm-text-action" onClick={() => setRetry(value => value + 1)}>{t('Thử lại')}</button>
          </div>
        ) : preview?.source === source ? (
          isPdf ? (
            <div style={{ width: '100%', display: 'grid', gap: 8 }}>
              <iframe
                src={preview.url}
                title={name}
                style={{ width: '100%', height: 360, border: '1px solid #E2E8F0', borderRadius: 10, background: '#FFF' }}
              />
              <a href={preview.url} target="_blank" rel="noreferrer" className="gm-text-action">
                {t('Mở PDF trong tab mới ↗')}
              </a>
            </div>
          ) : (
            <a href={preview.url} target="_blank" rel="noreferrer" aria-label={t('Xem ảnh tài liệu') + ': ' + name}>
              <img
                src={preview.url}
                alt={t('Ảnh tài liệu') + ': ' + name}
                onError={() => { setPreview(null); setError('Không tải được ảnh tài liệu.'); }}
              />
            </a>
          )
        ) : (
          <span role="status">{t(isPdf ? 'Đang tải bản xem trước PDF…' : 'Đang tải ảnh tài liệu…')}</span>
        )
      ) : (
        <span className="gm-document-pdf"><Icon name="upload" size={24} /><strong>FILE</strong></span>
      )}
      <span className="gm-document-name">{name}</span>
      {isImage && preview && <small>{t('Nhấn ảnh để xem kích thước đầy đủ.')}</small>}
    </div>
  );
}
