import { useRef, useState } from 'react';
import { Icon } from './GoMatePortal';
import { downloadFormTemplate, readFormWorkbook } from './formExcel';
import './form-excel.css';

export default function FormExcelTools({ kind, onImport, options, disabled = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const run = async action => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (reason) { setError(reason.message || 'Không thể đọc Excel. Vui lòng kiểm tra file mẫu.'); } finally { setBusy(false); }
  };
  return <div className="gm-excel-tools" aria-busy={busy}>
    <div className="gm-excel-toolbar">
      <span className="gm-excel-label">Excel</span>
      <div className="gm-excel-actions">
        <button className="gm-excel-button" type="button" aria-label="Tải Excel mẫu" disabled={busy || disabled} onClick={() => void run(() => downloadFormTemplate(kind))}><Icon name="download" size={15} />Tải mẫu</button>
        <button className="gm-excel-button gm-excel-button--primary" type="button" disabled={busy || disabled} onClick={() => input.current?.click()}><Icon name="upload" size={15} />{busy ? 'Đang xử lý…' : 'Nhập Excel'}</button>
        <details className="gm-excel-demo">
          <summary>Demo <span aria-hidden="true">⌄</span></summary>
          <div className="gm-excel-menu">
            {[1, 2].map(index => <a key={index} href={`/demo-excel/${kind}-${index}.xlsx`} download onClick={event => { event.currentTarget.closest('details').open = false; }}><Icon name="download" size={14} />Mẫu demo {index}</a>)}
          </div>
        </details>
      </div>
      <input ref={input} type="file" hidden aria-label="Nhập file Excel" accept=".xlsx" disabled={busy || disabled} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (file) void run(async () => {
          if (!/\.xlsx$/i.test(file.name) || file.size === 0 || file.size > 10 * 1024 * 1024) throw Error('Chọn file .xlsx hợp lệ, tối đa 10 MB.');
          const data = await readFormWorkbook(kind, await file.arrayBuffer(), options);
          await onImport(data);
          setNotice(`Đã nhập ${file.name}`);
        });
      }} />
    </div>
    {error && <p role="alert" className="gm-excel-feedback gm-excel-feedback--error">{error}</p>}
    {notice && <p role="status" className="gm-excel-feedback">{notice}</p>}
  </div>;
}
