import { useRef, useState } from 'react';
import { Icon } from './GoMatePortal';
import { downloadFormTemplate, readFormWorkbook } from './formExcel';
import './form-excel.css';

export default function FormExcelTools({ kind, onImport, options, disabled = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [issues, setIssues] = useState([]);
  const run = async action => {
    setBusy(true); setError(''); setNotice(''); setIssues([]);
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
          const { issues: skipped, ...data } = await readFormWorkbook(kind, await file.arrayBuffer(), options);
          const hasValues = kind === 'verification' ? Object.keys(data.application).length > 0 || data.documents.some(Boolean)
            : kind === 'post' ? Object.keys(data.promo).length > 0 || data.groups.some(group => Object.keys(group).some(key => key !== 'excelRow'))
              : Object.keys(data).length > 0;
          if (hasValues) await onImport(data);
          setIssues(skipped);
          setNotice(hasValues ? `Đã điền các trường hợp lệ từ ${file.name}. Chưa gửi hoặc lưu form.` : 'Không có dữ liệu hợp lệ để điền. Form được giữ nguyên.');
        });
      }} />
    </div>
    {error && <p role="alert" className="gm-excel-feedback gm-excel-feedback--error">{error}</p>}
    {notice && <p role="status" className="gm-excel-feedback">{notice}</p>}
    {issues.length > 0 && <div role="alert" className="gm-excel-feedback gm-excel-feedback--error">
      <p className="gm-excel-issues-heading">Đã bỏ qua {issues.length} mục bên dưới. Các trường lỗi hoặc trống giữ nguyên giá trị trên form.</p>
      <div className="gm-excel-issues-scroll" tabIndex={0} role="region" aria-label="Chi tiết các ô Excel bị bỏ qua">
        <table className="gm-excel-issues"><thead><tr><th scope="col">Sheet / ô</th><th scope="col">Trường</th><th scope="col">Lý do</th></tr></thead>
          <tbody>{issues.map((item, index) => <tr key={index}><td>{item.sheet}{item.cell ? `!${item.cell}` : ''}</td><td>{item.field}</td><td>{item.message}</td></tr>)}</tbody>
        </table>
      </div>
    </div>}
  </div>;
}
