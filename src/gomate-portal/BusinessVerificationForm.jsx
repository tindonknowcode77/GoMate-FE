import { useEffect, useState } from 'react';
import VerificationDocumentPreview from './VerificationDocumentPreview';
import { api } from '../services/api';
import { usePortalText } from './usePortalText';
import { Icon, PillButton, StatusPill } from './GoMatePortal';

const fieldStyle = 'gm-simple-input';
const fileHelp = 'Chỉ hỗ trợ tệp JPEG, PNG, PDF và JPG. Dung lượng mỗi tệp tối đa 10 MB. Tệp PDF tối đa 30 trang.';
function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}
function Upload({ label, file, existing, applicationId, revision, kind, required, onChange }) {
  const t = usePortalText();
  const [error, setError] = useState('');
  return <div><label className="gm-upload-field gm-license-upload"><span>{t(label)}</span>
    <input aria-label={t(label)} type="file" accept=".jpeg,.jpg,.png,.pdf,image/jpeg,image/png,application/pdf" required={required} onChange={event => {
      const selected = event.target.files?.[0];
      if (selected && (selected.size > 10 * 1024 * 1024 || selected.size === 0 || !/\.(pdf|png|jpe?g)$/i.test(selected.name) || !['application/pdf','image/png','image/jpeg'].includes(selected.type))) {
        event.target.value = ''; onChange(null); setError('Vui lòng chọn JPEG, PNG, PDF hoặc JPG hợp lệ, tối đa 10 MB.'); return;
      }
      setError(''); onChange(selected || null);
    }} />
    <span className="gm-upload-box"><span className="gm-upload-icon"><Icon name="upload" size={18} /></span><strong>{file?.name || existing?.name || t('Tải lên')}</strong><small>{t(fileHelp)}</small></span>
  </label><VerificationDocumentPreview file={file} metadata={existing} applicationId={applicationId} revision={revision} kind={kind} />{error && <p className="gm-form-error" role="alert">{t(error)}</p>}</div>;
}
export default function BusinessVerificationForm({ application, setApplication, document, setDocument, supplementalDocument, setSupplementalDocument, currentApplication, busy, onSubmit }) {
  const t = usePortalText();
  const [industries, setIndustries] = useState([]), [optionsError, setOptionsError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setOptionsError('');
    void api('/portal/options').then(result => {
      if (alive) {
        if (!result.businessIndustries?.length) { setOptionsError('Không tải được danh sách ngành. Vui lòng thử lại.'); return; }
        setIndustries(result.businessIndustries);
      }
    }).catch(() => { if (alive) setOptionsError('Không tải được danh sách ngành. Vui lòng thử lại.'); });
    return () => { alive = false; };
  }, [retry]);
  const patch = key => event => setApplication(value => ({ ...value, [key]: event.target.value }));
  const editable = !currentApplication || currentApplication.status === 'rejected';
  const identityLocked = Boolean(currentApplication?.certificateNumber);
  return <section className="gm-panel gm-live-panel gm-verification-panel">
    <div className="gm-panel-heading"><div><span className="gm-eyebrow">{t('HỒ SƠ ĐỐI TÁC')}</span><h3>{t('Hồ sơ xác minh doanh nghiệp')}</h3></div>
      {currentApplication && <StatusPill tone={currentApplication.status === 'rejected' ? 'red' : currentApplication.status === 'approved' ? 'green' : 'orange'}>{t(currentApplication.status === 'approved' ? 'Đã duyệt' : currentApplication.status === 'rejected' ? 'Cần cập nhật' : 'Chờ duyệt')}</StatusPill>}
    </div>
    {currentApplication && <div className="gm-verification-summary"><strong>{currentApplication.company}</strong><span>{t(currentApplication.category)}{currentApplication.website ? ` · ${currentApplication.website}` : ''}</span>
      {currentApplication.reviewNote && <p>{currentApplication.reviewNote}</p>}
      <dl><div><dt>{t('Loại tài khoản')}</dt><dd>{t(currentApplication.accountType === 'individual' ? 'Cá nhân' : 'Doanh nghiệp')}</dd></div>
        <div><dt>{t('Quốc gia/Khu vực')}</dt><dd>{t('Việt Nam')}</dd></div>
        <div><dt>{t('Số giấy chứng nhận')}</dt><dd>{currentApplication.certificateNumber || currentApplication.taxId}</dd></div>
        <div><dt>{t('Địa chỉ')}</dt><dd>{currentApplication.address}</dd></div>
        <div><dt>{t('Người đại diện')}</dt><dd>{currentApplication.representativeName} · {currentApplication.representativeTitle}</dd></div>
        <div><dt>{t('Liên hệ')}</dt><dd>{currentApplication.representativeEmail} · {currentApplication.representativePhone}</dd></div>
        <div><dt>{t('Tài liệu xác minh')}</dt><dd><VerificationDocumentPreview metadata={currentApplication.license} applicationId={currentApplication.id} revision={currentApplication.version} /></dd></div>
        {currentApplication.supplementalLicense && <div><dt>{t('Tài liệu bổ sung')}</dt><dd><VerificationDocumentPreview metadata={currentApplication.supplementalLicense} applicationId={currentApplication.id} revision={currentApplication.version} kind="supplemental" /></dd></div>}
      </dl></div>}
    {editable && <form className="gm-auth-form gm-verification-form" onSubmit={onSubmit}>
      <div className="gm-verification-section-title"><span>01</span><strong>{t('Thông tin doanh nghiệp')}</strong></div>
      <fieldset className="gm-account-types" disabled={identityLocked}><legend>{t('Loại tài khoản')}</legend>{[['business','Doanh nghiệp'],['individual','Cá nhân']].map(([value,label]) => <label key={value}><input type="radio" name="accountType" value={value} checked={application.accountType === value} onChange={patch('accountType')} />{t(label)}</label>)}</fieldset>
      <p className="gm-verification-help">{t(application.accountType === 'individual' ? 'Dành cho cá nhân đăng ký hoạt động dưới hình thức hộ kinh doanh. Tải giấy chứng nhận đăng ký hộ kinh doanh để xác minh.' : 'Dành cho công ty, tổ chức. Tải giấy chứng nhận đăng ký doanh nghiệp hoặc giấy phép thành lập công ty để xác minh.')}</p>
      <Field label="Quốc gia/Khu vực"><select aria-label={t('Quốc gia/Khu vực')} className={fieldStyle} value={application.country} disabled onChange={patch('country')}><option value="VN">{t('Việt Nam')}</option></select></Field>
      <Field label="Tên doanh nghiệp"><input aria-describedby="gm-company-help" className={fieldStyle} autoComplete="organization" minLength={2} maxLength={150} value={application.company} required onChange={patch('company')} placeholder={t('Theo đúng giấy phép kinh doanh')} /></Field>
      <p id="gm-company-help" className="gm-verification-help">{t('Tên doanh nghiệp bạn nhập ở đây và trên tài liệu xác minh phải trùng khớp hoàn toàn. Không thể thay đổi tên doanh nghiệp sau khi hoàn tất xác minh.')}</p>
      <Field label="Trang web công ty (không bắt buộc)"><input type="url" className={fieldStyle} autoComplete="url" maxLength={500} value={application.website} onChange={patch('website')} placeholder="https://" /></Field>
      <Field label="Ngành"><select aria-label={t('Ngành')} className={fieldStyle} value={application.category} required onChange={patch('category')} disabled={!industries.length}><option value="">{t('Chọn một ngành')}</option>{application.category && !industries.includes(application.category) && <option value="" disabled>{t('Vui lòng chọn lại ngành')}</option>}{industries.map(industry => <option key={industry} value={industry}>{t(industry)}</option>)}</select></Field>
      {optionsError && <div role="alert" className="gm-form-error">{t(optionsError)} <button type="button" className="gm-text-action" onClick={() => setRetry(value => value + 1)}>{t('Thử lại')}</button></div>}
      <Field label="Địa chỉ chi tiết"><textarea aria-label={t('Địa chỉ chi tiết')} className={fieldStyle + ' gm-textarea'} maxLength={500} value={application.address} required onChange={patch('address')} placeholder={t('Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố')} /></Field>
      <div className="gm-verification-section-title"><span>02</span><strong>{t('Tài liệu xác minh')}</strong></div>
      <p className="gm-verification-help">{t('Bằng chứng nhận dạng: giấy chứng nhận đăng ký doanh nghiệp, giấy phép thành lập công ty hoặc giấy chứng nhận đăng ký hộ kinh doanh.')}</p>
      <Upload label="Hồ sơ xác minh" file={document} existing={currentApplication?.license} applicationId={currentApplication?.id} revision={currentApplication?.version} required={!currentApplication?.license} onChange={setDocument} />
      <Field label="Số giấy chứng nhận"><input aria-describedby="gm-certificate-help" className={fieldStyle} minLength={2} maxLength={60} value={application.certificateNumber} required readOnly={identityLocked} onChange={patch('certificateNumber')} placeholder={t('Vui lòng nhập số giấy chứng nhận chính xác.')} /></Field>
      <p id="gm-certificate-help" className="gm-verification-help">{t('Hãy đảm bảo rằng số bạn nhập ở đây giống với số trên tài liệu. Bạn không thể thay đổi số này sau khi gửi.')}</p>
      <Upload label="Tài liệu bổ sung (không bắt buộc)" file={supplementalDocument} existing={currentApplication?.supplementalLicense} applicationId={currentApplication?.id} revision={currentApplication?.version} kind="supplemental" onChange={setSupplementalDocument} />
      <div className="gm-verification-section-title"><span>03</span><strong>{t('Người đại diện')}</strong></div>
      <div className="gm-field-grid"><Field label="Họ và tên người đại diện"><input className={fieldStyle} autoComplete="name" maxLength={120} value={application.representativeName} required onChange={patch('representativeName')} /></Field><Field label="Chức vụ"><input className={fieldStyle} maxLength={80} value={application.representativeTitle} required onChange={patch('representativeTitle')} placeholder={t('Ví dụ: Giám đốc')} /></Field></div>
      <div className="gm-field-grid"><Field label="Email liên hệ"><input className={fieldStyle} type="email" autoComplete="email" value={application.representativeEmail} required onChange={patch('representativeEmail')} /></Field><Field label="Số điện thoại"><input className={fieldStyle} type="tel" autoComplete="tel" value={application.representativePhone} required onChange={patch('representativePhone')} /></Field></div>
      <PillButton type="submit" disabled={busy || !industries.includes(application.category)}>{t(busy ? 'Đang gửi...' : currentApplication ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ xác minh')}</PillButton>
    </form>}
  </section>;
}
