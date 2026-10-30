import { useRef, useState } from 'react';
import { getSession, login, post, verifyEmail } from '../services/api';
import { AuthShell, Icon, Logo, PillButton } from './GoMatePortal';
import { usePortalText } from './usePortalText';

export default function PortalAuth({ onAuthenticated, initialError }) {
  const t = usePortalText();
  const [stage, setStage] = useState(getSession()?.user.emailVerified === false ? 'verify' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(getSession()?.user.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (reason) { setError(reason.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const changeStage = next => { setStage(next); setError(''); setNotice(''); setCode(''); setPassword(''); setConfirm(''); };
  const submit = event => {
    event.preventDefault();
    void run(async () => {
      if (stage === 'register') {
        if (password !== confirm) throw Error('Mật khẩu xác nhận chưa khớp.');
        const result = await post('/auth/register', { name: name.trim(), email: email.trim(), password });
        setPassword(''); setConfirm(''); setStage('verify');
        setNotice(result.verificationSent ? 'Đã tạo tài khoản. Kiểm tra email để nhận mã xác minh.' : 'Đã tạo tài khoản nhưng chưa gửi được email. Vui lòng thử gửi lại mã.');
      } else if (stage === 'verify') {
        await verifyEmail(email, code);
        await onAuthenticated();
      } else {
        const result = await login(email, password);
        setPassword('');
        if (!result.user.emailVerified) { setStage('verify'); setNotice('Xác minh email để tiếp tục đăng ký doanh nghiệp.'); }
        else await onAuthenticated();
      }
    });
  };
  const registering = stage === 'register', verifying = stage === 'verify';
  return <div className="gomate-portal gm-connected"><AuthShell asideTitle={t('Kết nối doanh nghiệp với cộng đồng.')} asideText={t('Tạo sự kiện, chia sẻ ưu đãi và cùng GoMate mang đến những trải nghiệm đáng nhớ.')}>
    <div className="gm-auth-panel gm-partner-auth"><Logo />
      <div className="gm-auth-heading"><span className="gm-eyebrow">GOMATE PARTNERS</span><h2>{t(registering ? 'Đăng ký tài khoản doanh nghiệp' : verifying ? 'Xác minh email' : 'Đăng nhập portal')}</h2><p>{t(registering ? 'Tạo tài khoản người đại diện. Sau khi xác minh email, bạn có thể gửi hồ sơ đăng ký doanh nghiệp.' : verifying ? 'Nhập mã 6 số được gửi đến email của bạn để tiếp tục.' : 'Quản lý doanh nghiệp, sự kiện và ưu đãi của bạn trên GoMate.')}</p></div>
      <form className="gm-auth-form" onSubmit={submit}>
        {registering && <label className="gm-field"><span>{t('Tên người đại diện')}</span><input className="gm-simple-input" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>}
        <label className="gm-field"><span>{t('Email')}</span><input className="gm-simple-input" type="email" autoComplete="username" required maxLength={254} readOnly={verifying} value={email} onChange={event => setEmail(event.target.value)} /></label>
        {verifying ? <label className="gm-field"><span>{t('Mã xác minh')}</span><input className="gm-simple-input" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /></label> : <label className="gm-field"><span>{t('Mật khẩu')}</span><input className="gm-simple-input" type="password" aria-label={t('Mật khẩu')} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 6 : 1} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />{registering && <small>{t('Từ 6 đến 128 ký tự.')}</small>}</label>}
        {registering && <label className="gm-field"><span>{t('Xác nhận mật khẩu')}</span><input className="gm-simple-input" type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} /></label>}
        {error && <div className="gm-form-error" role="alert">{t(error)}</div>}
        {notice && <div className="gm-live-muted" role="status">{t(notice)}</div>}
        <PillButton type="submit" disabled={busy} icon={registering ? 'business' : verifying ? 'shield' : 'arrow'}>{t(busy ? 'Đang xử lý…' : registering ? 'Tạo tài khoản doanh nghiệp' : verifying ? 'Xác minh và tiếp tục' : 'Đăng nhập')}</PillButton>
      </form>
      {verifying && <button className="gm-auth-text-button" disabled={busy} onClick={() => void run(async () => { await post('/auth/resend-verification', { email: email.trim() }); setNotice('Nếu tài khoản cần xác minh, mã sẽ được gửi đến email. Vui lòng chờ 60 giây trước khi gửi lại.'); })}>{t('Gửi lại mã xác minh')}</button>}
      <div className="gm-partner-signup"><p>{t(stage === 'login' ? 'Doanh nghiệp chưa có tài khoản?' : 'Đã có tài khoản GoMate?')}</p><PillButton variant="secondary" disabled={busy} onClick={() => changeStage(stage === 'login' ? 'register' : 'login')}>{t(stage === 'login' ? 'Đăng ký tài khoản doanh nghiệp' : 'Quay lại đăng nhập')}</PillButton></div>
      {registering && <p className="gm-live-muted gm-partner-note">{t('Tài khoản chỉ có quyền doanh nghiệp sau khi hồ sơ được GoMate phê duyệt.')}</p>}
      <footer className="gm-partner-footer"><a href="/demo"><Icon name="play" />{t('Khám phá bản demo')}</a><div className="gm-partner-app"><span><Icon name="download" />{t('Tải ứng dụng GoMate')}</span><small>{t('Chưa có bản tải về. Bạn có thể sử dụng bản web.')}</small><a href="/">{t('Mở app GoMate trên web')}<Icon name="external" size={15} /></a></div></footer>
    </div>
  </AuthShell></div>;
}
