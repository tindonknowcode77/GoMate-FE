const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { existsSync, mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium, expect } = require('playwright/test');
const beRoot = resolve(__dirname, '../../GoMate-BE'), beRequire = createRequire(beRoot + '/package.json');
const be = name => import(pathToFileURL(beRoot + '/src/' + name + '.js').href);

(async () => {
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  const [{ createApp }, { readConfig }, { createClient, initializeDatabase }, { createAuthRepository }, { hashToken, newToken }, { createActivityRepository }, { createChatRepository }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/auth/token', 'modules/activities/repository', 'modules/chat/repository'].map(be));
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('finance_browser') }));
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-finance-')); let server, browser;
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db); const auth = createAuthRepository(db), users = [], sessions = [];
    for (let i = 0; i < 3; i++) {
      const user = await auth.createUser({ name: 'Finance UI ' + i, email: `finance-ui${i}@example.com`, passwordHash: 'unused' }); users.push(user);
      await db.collection('users').updateOne({ id: user.id }, { $set: { role: i === 0 ? 'admin' : 'user', email_verified: true, birthDate: '2000-01-01', gender: 'male', location: 'Ho Chi Minh', bio: 'Test profile', interests: ['Workshop'], languages: ['Vietnamese'] } });
      const token = newToken(); await auth.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) }); sessions.push({ accessToken: token, user: { ...user, emailVerified: true } });
    }
    await db.collection('business_applications').insertOne({ id: 'finance-ui-business', ownerId: users[1].id, company: 'Finance Demo Company', status: 'approved' });
    for (const [id, title] of [['refund-ui', 'Workshop hoàn cọc'], ['payout-ui', 'Workshop giải ngân']]) await db.collection('activities').insertOne({ id, title, hostId: users[1].id, hostName: users[1].name, organizerType: 'business', status: 'published', version: 1, startsAt: new Date(Date.now() + 4 * 86400000), endsAt: new Date(Date.now() + 4 * 86400000 + 7200000), depositAmount: 50000, memberCount: 2, maxParticipants: 10, categories: ['Workshop'], location: 'Ho Chi Minh', joinRequests: [{ userId: users[2].id, status: 'approved' }] });
    server = createApp(readConfig({}), { authRepository: auth, activityRepository: createActivityRepository(db), chatRepository: createChatRepository(db) }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (who, path, method = 'GET', body) => {
      const response = await fetch(base + '/api' + path, { method, headers: { Authorization: 'Bearer ' + sessions[who].accessToken, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return result;
    };
    const refund = (await call(2, '/payments/create-qr', 'POST', { activityId: 'refund-ui' })).payment;
    const payoutPayment = (await call(2, '/payments/create-qr', 'POST', { activityId: 'payout-ui' })).payment;
    await auth.payments.confirmPayment(payoutPayment.id, { method: 'admin-bank-reconciliation', confirmedBy: users[0].id, amount: 50000, transactionRef: 'UI-INCOMING-PAYOUT-001', evidence: 'Bank statement checked for browser fixture' });
    const start = new Date(Date.now() - 5 * 86400000), end = new Date(Date.now() - 4 * 86400000);
    await db.collection('activities').updateOne({ id: 'payout-ui' }, { $set: { startsAt: start, endsAt: end, completedAt: end, status: 'completed' } });
    await db.collection('finance_escrows').updateOne({ _id: 'payout-ui' }, { $set: { 'lots.$[].startsAt': start, 'lots.$[].endsAt': end, 'lots.$[].cancelBefore': start } });
    await auth.finance.confirmParticipation(payoutPayment.id, users[2].id, 'attended');
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const errors = [];
    const pageFor = async (i, mobile = false) => {
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, timezoneId: 'Asia/Ho_Chi_Minh' }); page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), sessions[i]);
      await page.route('https://img.vietqr.io/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>' }));
      return page;
    };
    const member = await pageFor(2, true), admin = await pageFor(0), owner = await pageFor(1);
    const nav = (page, name) => page.locator('.gm-sidebar-nav').getByRole('button', { name, exact: true }).click();
    await member.goto(base + '/#/app/profile/wallet'); await member.getByText('Ví & tiền cọc', { exact: true }).waitFor();
    await member.getByRole('button', { name: 'Mở mã thanh toán', exact: true }).click(); await member.getByText('Thanh toán VietQR', { exact: true }).waitFor();
    await member.getByText('Tôi đã chuyển khoản xong', { exact: true }).click(); await member.getByText('Đã báo chuyển khoản. Chờ ngân hàng hoặc admin đối soát.', { exact: true }).waitFor();
    assert.equal((await auth.payments.findPaymentById(refund.id)).status, 'pending');
    await member.getByRole('button', { name: 'Đóng thanh toán', exact: true }).click();
    await member.getByRole('button', { name: 'Thêm ngân hàng', exact: true }).click();
    await member.getByLabel('Số tài khoản nhận hoàn', { exact: true }).fill('0901234567'); await member.getByLabel('Chủ tài khoản nhận hoàn', { exact: true }).fill('DEMO MEMBER');
    await member.getByRole('button', { name: 'Lưu ngân hàng', exact: true }).click(); await member.getByText('Đã lưu tài khoản nhận hoàn tiền.', { exact: true }).waitFor();
    await admin.goto(base + '/portal'); await nav(admin, 'Tài chính & doanh thu'); await admin.getByText(refund.orderCode, { exact: true }).waitFor();
    await admin.locator('.gm-finance tbody tr').filter({ hasText: refund.orderCode }).getByRole('button', { name: 'Đối soát tiền vào', exact: true }).click();
    const dialog = admin.getByRole('dialog');
    await dialog.getByLabel('Mã giao dịch tiền vào', { exact: true }).fill('UI-REFUND-INCOMING-001'); await dialog.getByLabel('Bằng chứng đối soát ngân hàng', { exact: true }).fill('Đã kiểm tra sao kê tiền vào đúng tài khoản và nội dung'); await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    await member.reload(); await member.getByRole('button', { name: 'Yêu cầu hoàn cọc', exact: true }).first().waitFor();
    // The early workshop is the only full-refund item; use its enclosing card.
    await member.getByText('Workshop hoàn cọc', { exact: true }).locator('..').locator('..').getByRole('button', { name: 'Yêu cầu hoàn cọc', exact: true }).click();
    await member.getByLabel('Lý do yêu cầu', { exact: true }).fill('Không thể tham gia vì lịch học thay đổi'); await member.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await member.getByText('Chờ duyệt hoàn tiền', { exact: true }).waitFor();
    await admin.getByRole('button', { name: 'Làm mới tài chính', exact: true }).click(); await admin.getByRole('tab', { name: 'Hoàn cọc', exact: true }).click();
    await admin.getByRole('button', { name: 'Duyệt hoàn tiền', exact: true }).click(); await dialog.getByLabel('Kết quả / ghi chú xử lý', { exact: true }).fill('Đủ điều kiện hoàn đủ tiền cọc'); await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    assert.equal((await auth.payments.findPaymentById(refund.id)).status, 'paid');
    await admin.getByRole('button', { name: 'Xác nhận đã hoàn tiền', exact: true }).click(); await dialog.getByLabel('Kết quả / ghi chú xử lý', { exact: true }).fill('Đã chuyển và kiểm tra sao kê'); await dialog.getByLabel('Mã giao dịch chuyển tiền', { exact: true }).fill('UI-REFUND-OUTGOING-001'); await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    await member.reload(); await member.getByText('Đã ghi nhận chuyển tiền hoàn', { exact: true }).waitFor(); await member.screenshot({ path: join(artifacts, 'member-wallet.png'), fullPage: true });
    await admin.getByRole('tab', { name: 'Xác minh hoạt động', exact: true }).click(); await admin.locator('.gm-finance-card').filter({ hasText: 'Workshop giải ngân' }).getByRole('button', { name: 'Xác minh hoạt động', exact: true }).click(); await dialog.getByLabel('Bằng chứng hoạt động thực tế', { exact: true }).fill('Đã đối chiếu ảnh hoạt động và xác nhận của thành viên'); await dialog.getByLabel('Kết quả / ghi chú xử lý', { exact: true }).fill('Hoạt động diễn ra đúng lịch'); await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    await owner.goto(base + '/portal'); await nav(owner, 'Ví & đối soát'); await owner.getByRole('button', { name: 'Cập nhật ngân hàng', exact: true }).click(); await owner.getByLabel('Số tài khoản', { exact: true }).fill('8876191441'); await owner.getByLabel('Chủ tài khoản', { exact: true }).fill('DEMO BUSINESS'); await owner.getByRole('button', { name: 'Lưu ngân hàng', exact: true }).click(); await owner.getByText('Đã lưu tài khoản nhận giải ngân.', { exact: true }).waitFor();
    await owner.getByLabel('Hoạt động', { exact: true }).selectOption('payout-ui'); await owner.route('**/api/portal/wallet/payouts', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 }); await owner.getByRole('button', { name: 'Gửi admin duyệt', exact: true }).click(); await owner.locator('.gm-form-error').waitFor(); await owner.getByRole('button', { name: 'Gửi admin duyệt', exact: true }).click(); await owner.getByText('Đã gửi yêu cầu giải ngân. Chờ admin duyệt và đối soát chuyển khoản.', { exact: true }).waitFor();
    await admin.getByRole('button', { name: 'Làm mới tài chính', exact: true }).click(); await admin.getByRole('tab', { name: 'Giải ngân', exact: true }).click();
    for (const label of ['Duyệt giải ngân', 'Khóa lệnh & chuẩn bị chuyển', 'Xác nhận đã chuyển tiền']) {
      await admin.getByRole('button', { name: label, exact: true }).click(); await dialog.getByLabel('Kết quả / ghi chú xử lý', { exact: true }).fill('Đã kiểm tra tài khoản và chứng từ ngân hàng');
      if (label === 'Xác nhận đã chuyển tiền') { await dialog.getByLabel('Mã giao dịch chuyển tiền', { exact: true }).fill('UI-PAYOUT-OUTGOING-001'); await dialog.getByRole('checkbox').check(); }
      await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    }
    await admin.getByText('Mã ngân hàng: UI-PAYOUT-OUTGOING-001', { exact: true }).waitFor(); await admin.screenshot({ path: join(artifacts, 'admin-finance.png'), fullPage: true });
    await owner.getByRole('button', { name: 'Làm mới đối soát', exact: true }).click(); await owner.getByText('Đã đối soát chuyển tiền', { exact: true }).waitFor(); await owner.screenshot({ path: join(artifacts, 'business-wallet.png'), fullPage: true });
    const summary = (await auth.finance.dashboard(users[0].id)).summary; assert.deepEqual([summary.received, summary.held, summary.refunded, summary.businessPaid, summary.feeRevenue], [100000, 0, 50000, 45000, 5000]);
    await admin.setViewportSize({ width: 390, height: 844 }); assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []); console.log('PASS: report-only QR, mobile bank/refund wallet, admin incoming/refund/settlement/payout and merchant bank flow. Screenshots: ' + artifacts);
  } finally { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); await client.close(); await mongo.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
