const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { existsSync, mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium } = require('playwright');
const beRoot = resolve(__dirname, '../../GoMate-BE'), beRequire = createRequire(beRoot + '/package.json');
const be = name => import(pathToFileURL(beRoot + '/src/' + name + '.js').href);

(async () => {
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  const sharp = beRequire('sharp');
  const [{ createApp }, { readConfig }, { createClient, initializeDatabase }, { createAuthRepository }, { hashPassword }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/auth/password'].map(be));
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('verification_documents_ui') }));
  let server, browser;
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-verification-documents-'));
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db);
    const auth = createAuthRepository(db), passwordHash = await hashPassword('Secure123!');
    for (const role of ['user', 'admin']) {
      const user = await auth.createUser({ name: role, email: `${role}@example.com`, passwordHash });
      await db.collection('users').updateOne({ id: user.id }, { $set: { role, email_verified: true } });
    }
    server = createApp(readConfig({}), { authRepository: auth }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const owner = await browser.newPage({ viewport: { width: 1360, height: 900 } }), admin = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    const errors = []; for (const page of [owner, admin]) page.on('pageerror', error => errors.push(error.message));
    const login = async (page, role) => { await page.goto(base + '/portal'); await page.getByLabel('Email', { exact: true }).fill(`${role}@example.com`); await page.getByLabel('Mật khẩu', { exact: true }).fill('Secure123!'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.locator('.gm-sidebar').waitFor(); };
    await login(owner, 'user');
    const fields = { 'Tên doanh nghiệp': 'CÔNG TY TNHH KIỂM THỬ GIẤY PHÉP', 'Trang web công ty (không bắt buộc)': 'https://example.com/company', 'Địa chỉ chi tiết': '12 Nguyễn Huệ, TP. Hồ Chí Minh', 'Số giấy chứng nhận': 'CERT-98765', 'Họ và tên người đại diện': 'Nguyễn Văn An', 'Chức vụ': 'Giám đốc', 'Email liên hệ': 'contact@example.com', 'Số điện thoại': '0901234567' };
    for (const [label, value] of Object.entries(fields)) await owner.getByLabel(label, { exact: true }).fill(value);
    await owner.getByLabel('Ngành', { exact: true }).selectOption('Cà phê, trà và đồ uống');
    const buffer = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#c8e6d8' } }).png().toBuffer();
    const upload = owner.locator('.gm-license-upload').first();
    const assertViewport = async () => {
      const layout = await owner.evaluate(() => {
        const rect = document.querySelector('.gm-connected').getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: innerHeight, scroll: document.scrollingElement.scrollTop, covered: !!document.elementFromPoint(innerWidth / 2, innerHeight - 12)?.closest('.gm-connected') };
      });
      assert.equal(layout.top, 0); assert.equal(layout.bottom, layout.height); assert.equal(layout.scroll, 0); assert.equal(layout.covered, true);
    };
    await upload.scrollIntoViewIfNeeded();
    let chooserEvent = owner.waitForEvent('filechooser'); await upload.click(); await (await chooserEvent).setFiles([]);
    await assertViewport();
    chooserEvent = owner.waitForEvent('filechooser'); await upload.click(); await (await chooserEvent).setFiles({ name: 'license.png', mimeType: 'image/png', buffer });
    await owner.locator('.gm-verification-form .gm-document-preview img').waitFor();
    await owner.waitForFunction(() => document.querySelector('.gm-verification-form .gm-document-preview img')?.naturalWidth === 800);
    await assertViewport();
    // A different image with the same filename must replace the old thumbnail.
    const replacement = await sharp(buffer).resize(600, 300).png().toBuffer();
    await owner.getByLabel('Hồ sơ xác minh', { exact: true }).setInputFiles({ name: 'license.png', mimeType: 'image/png', buffer: replacement });
    await owner.waitForFunction(() => document.querySelector('.gm-verification-form .gm-document-preview img')?.naturalWidth === 600);
    await owner.getByLabel('Tài liệu bổ sung (không bắt buộc)', { exact: true }).setInputFiles({ name: 'additional.png', mimeType: 'image/png', buffer });
    await owner.waitForFunction(() => [...document.querySelectorAll('.gm-verification-form .gm-document-preview img')].length === 2 && [...document.querySelectorAll('.gm-verification-form .gm-document-preview img')].every(img => img.complete && img.naturalWidth > 0));
    await assertViewport(); await owner.screenshot({ path: join(artifacts, 'owner-selected-images.png') });
    await owner.getByRole('button', { name: 'Gửi hồ sơ xác minh', exact: true }).click(); await owner.getByText('Chờ duyệt', { exact: true }).waitFor();
    await owner.reload();
    await owner.waitForFunction(() => document.querySelectorAll('.gm-verification-summary img').length === 2 && [...document.querySelectorAll('.gm-verification-summary img')].every(img => img.complete && img.naturalWidth > 0));
    await login(admin, 'admin');
    await admin.locator('.gm-admin-review-table').getByRole('button').first().click();
    const dialog = admin.getByRole('dialog'); await dialog.waitFor();
    for (const value of [...Object.values(fields), 'Việt Nam', 'Doanh nghiệp', 'Cà phê, trà và đồ uống', 'license.png', 'additional.png']) assert.ok((await dialog.innerText()).includes(value), `Missing submitted information: ${value}`);
    await admin.waitForFunction(() => document.querySelectorAll('[role="dialog"] .gm-document-preview img').length === 2 && [...document.querySelectorAll('[role="dialog"] .gm-document-preview img')].every(img => img.complete && img.naturalWidth > 0));
    await admin.screenshot({ path: join(artifacts, 'admin-complete-application.png') });
    await dialog.locator('.gm-document-preview img').last().scrollIntoViewIfNeeded();
    await admin.screenshot({ path: join(artifacts, 'admin-document-thumbnails.png') });
    await dialog.getByLabel('Ghi chú duyệt', { exact: true }).fill('Vui lòng cập nhật ảnh rõ hơn.');
    const reviewed = admin.waitForResponse(response => response.url().includes('/api/portal/applications/') && response.request().method() === 'PATCH');
    await dialog.getByRole('button', { name: 'Từ chối hồ sơ', exact: true }).click(); assert.equal((await reviewed).status(), 200);
    await owner.reload();
    await owner.getByRole('button', { name: 'Gửi lại hồ sơ', exact: true }).waitFor();
    const resubmitted = await sharp(buffer).resize(420, 210).png().toBuffer();
    await owner.getByLabel('Hồ sơ xác minh', { exact: true }).setInputFiles({ name: 'license.png', mimeType: 'image/png', buffer: resubmitted });
    await owner.getByRole('button', { name: 'Gửi lại hồ sơ', exact: true }).click(); await owner.getByText('Chờ duyệt', { exact: true }).waitFor();
    await owner.waitForFunction(() => document.querySelector('.gm-verification-summary img')?.naturalWidth === 420);
    await admin.reload(); await admin.locator('.gm-admin-review-table').getByRole('button').first().click();
    await admin.waitForFunction(() => document.querySelector('[role="dialog"] .gm-document-preview img')?.naturalWidth === 420);
    await admin.setViewportSize({ width: 390, height: 844 });
    await dialog.locator('.gm-document-preview img').last().scrollIntoViewIfNeeded();
    await admin.screenshot({ path: join(artifacts, 'admin-mobile-documents.png') });
    await owner.setViewportSize({ width: 390, height: 844 }); await assertViewport();
    assert.equal(await owner.evaluate(() => document.querySelector('.gm-connected').scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS picker selection/cancel without document scrolling or blank viewport; local/replaced/persisted private images; Admin sees every submitted field and both thumbnails. Artifacts:', artifacts);
  } finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await client.close(); await mongo.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
