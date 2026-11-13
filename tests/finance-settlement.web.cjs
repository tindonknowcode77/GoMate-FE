const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium, expect } = require('playwright/test');
const root = resolve(__dirname, '../../GoMate-BE'), beRequire = createRequire(root + '/package.json');
const be = name => import(pathToFileURL(root + '/src/' + name + '.js').href);

(async () => {
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  const [{ createApp }, { readConfig }, { createClient, initializeDatabase }, { createAuthRepository }, { newToken, hashToken }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/auth/token'].map(be));
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('settlement_ui') }));
  let server, browser;
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db);
    const auth = createAuthRepository(db), user = await auth.createUser({ name: 'Settlement Admin', email: 'settlement-admin@example.com', passwordHash: 'unused' });
    await db.collection('users').updateOne({ id: user.id }, { $set: { role: 'admin', email_verified: true } });
    const token = newToken(); await auth.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) });
    const owner = await auth.createUser({ name: 'Demo Business', email: 'demo-business@example.com', passwordHash: 'unused' });
    await db.collection('users').updateOne({ id: owner.id }, { $set: { email_verified: true } });
    await db.collection('business_applications').insertOne({ id: 'demo-business', ownerId: owner.id, company: 'Demo Business', status: 'approved' });
    await auth.portal.operations.saveBankAccount(owner.id, { bankId: 'MB', accountNo: '1234567890', accountName: 'DEMO BUSINESS' });
    const ownerToken = newToken(); await auth.createSession({ userId: owner.id, tokenHash: hashToken(ownerToken), expiresAt: new Date(Date.now() + 3600000) });
    const past = new Date(Date.now() - 5 * 86400000), ended = new Date(Date.now() - 4 * 86400000);
    const fixtures = ['ready', 'missing-confirmation', 'holding', 'unfinished', 'disputed', 'approved', 'payout', 'empty'];
    for (const id of fixtures) {
      const end = id === 'holding' ? new Date(Date.now() - 3600000) : id === 'unfinished' ? new Date(Date.now() + 7 * 86400000) : ended;
      await db.collection('activities').insertOne({ id, title: id, status: id === 'unfinished' ? 'published' : 'completed', startsAt: past, endsAt: end, completedAt: end });
      await db.collection('finance_escrows').insertOne({
        _id: id, activityId: id, ownerId: owner.id, title: id, version: 0, audit: [], updatedAt: new Date(),
        settlement: { status: id === 'approved' ? 'approved' : 'waiting' },
        payouts: id === 'payout' ? [{ id: 'existing-payout', status: 'pending', amount: 45000, bankAccount: { bankId: 'MB', accountNo: '1234567890', accountName: 'DEMO BUSINESS' }, createdAt: new Date() }] : [],
        lots: id === 'empty' ? [] : [{ paymentId: `payment-${id}`, userId: 'member', amount: 50000, state: id === 'disputed' ? 'disputed' : 'held', startsAt: past, endsAt: end, holdHours: 48, confirmation: id === 'missing-confirmation' ? null : { status: 'attended' } }],
      });
    }
    server = createApp(readConfig({}), { authRepository: auth }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const page = await browser.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), { accessToken: token, user: { ...user, emailVerified: true } });
    await page.goto(base + '/portal');
    await page.locator('.gm-sidebar-nav').getByRole('button', { name: 'Tài chính & doanh thu', exact: true }).click();
    await page.getByRole('tab', { name: 'Xác minh hoạt động', exact: true }).click();
    const card = id => page.locator('.gm-finance-card').filter({ has: page.locator('.gm-finance-card-heading strong', { hasText: new RegExp(`^${id}$`) }) });
    for (const [id, message] of [
      ['holding', 'Chưa hết thời gian giữ cọc'], ['unfinished', 'Hoạt động chưa hoàn tất hợp lệ'],
      ['disputed', 'Còn yêu cầu hoàn tiền hoặc khiếu nại'], ['payout', 'Hoạt động có lệnh giải ngân đang xử lý'],
      ['empty', 'Không có cọc đã đối soát đủ điều kiện'],
    ]) {
      const button = card(id).getByRole('button', { name: 'Chưa thể xác minh', exact: true });
      await expect(button).toBeDisabled(); await expect(card(id)).toContainText(message);
      await button.hover(); assert.equal(await button.evaluate(node => getComputedStyle(node).cursor), 'not-allowed');
      assert.ok(await button.getAttribute('aria-describedby'));
    }
    await expect(card('approved').getByRole('button', { name: 'Đã xác minh hoạt động', exact: true })).toBeDisabled();
    for (const id of ['ready', 'missing-confirmation']) {
      await card(id).getByRole('button', { name: 'Xác minh hoạt động', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Bằng chứng hoạt động thực tế', { exact: true }).fill('Đã đối chiếu ảnh và biên bản hoạt động thực tế.');
      if (id === 'missing-confirmation') await dialog.getByLabel('Lý do xác minh thay xác nhận thành viên', { exact: true }).fill('Đã đối chiếu biên bản tham dự thay xác nhận trong ứng dụng.');
      await dialog.getByLabel('Kết quả / ghi chú xử lý', { exact: true }).fill('Hoạt động hoàn tất đúng lịch.');
      await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(card(id).getByRole('button', { name: 'Đã xác minh hoạt động', exact: true })).toBeDisabled();
      assert.equal((await db.collection('finance_escrows').findOne({ _id: id })).settlement.status, 'approved');
    }
    // The backend must continue enforcing the hold when called directly.
    const blocked = await fetch(base + '/api/portal/finance/groups/holding/review', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence: 'Đã đối chiếu chứng từ hoạt động', note: 'Kiểm tra thời hạn giữ cọc' }) });
    assert.equal(blocked.status, 409);
    assert.equal((await db.collection('finance_escrows').findOne({ _id: 'holding' })).settlement.status, 'waiting');
    for (const id of ['holding', 'unfinished']) assert.equal((await auth.finance.businessWallet(owner.id)).groups.find(group => group.id === id).eligibleAmount, 0);
    const demoBody = { evidence: 'Xác minh thủ công phục vụ demo', note: 'Xác minh ngay để trình diễn', overrideReason: 'Admin xác minh thay thành viên để demo' };
    const reviewRequest = (id, path, body = demoBody, accessToken = token) => fetch(`${base}/api/portal/finance/groups/${id}/${path}`, { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await reviewRequest('holding', 'review', { ...demoBody, demo: true })).status, 400, 'Normal route does not accept a demo bypass flag');
    const ordinary = await auth.createUser({ name: 'Ordinary Member', email: 'ordinary@example.com', passwordHash: 'unused' });
    await db.collection('users').updateOne({ id: ordinary.id }, { $set: { email_verified: true } });
    const ordinaryToken = newToken(); await auth.createSession({ userId: ordinary.id, tokenHash: hashToken(ordinaryToken), expiresAt: new Date(Date.now() + 3600000) });
    assert.equal((await reviewRequest('holding', 'review-demo', demoBody, ordinaryToken)).status, 403);
    for (const id of ['disputed', 'payout', 'empty']) {
      await expect(card(id).getByRole('button', { name: 'Xác minh ngay (Demo)', exact: true })).toBeDisabled();
      assert.equal((await reviewRequest(id, 'review-demo')).status, 409, id);
    }
    for (const id of ['holding', 'unfinished']) {
      const original = await db.collection('activities').findOne({ id });
      await card(id).getByRole('button', { name: 'Xác minh ngay (Demo)', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('bỏ qua ngày diễn ra và thời gian giữ cọc');
      await dialog.getByRole('button', { name: 'Xác nhận xử lý', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(card(id)).toContainText('Đã xác minh thủ công phục vụ demo');
      const escrow = await db.collection('finance_escrows').findOne({ _id: id });
      assert.equal(escrow.settlement.status, 'approved'); assert.equal(escrow.settlement.demo, true);
      assert.equal(escrow.audit.at(-1).action, 'settlement-demo-approved');
      assert.equal(escrow.audit.at(-1).actorId, user.id);
      assert.deepEqual(await db.collection('activities').findOne({ id }), original, 'Demo verification preserves the original schedule and activity state');
      assert.equal((await reviewRequest(id, 'review-demo')).status, 409, 'Repeated demo approval is rejected');
    }
    const wallet = await auth.finance.businessWallet(owner.id);
    for (const id of ['holding', 'unfinished']) {
      const group = wallet.groups.find(item => item.id === id);
      assert.equal(group.eligibleAmount, 45000); assert.equal(group.blockedReason, ''); assert.equal(group.escrowStatus, 'admin-approved');
    }
    // A demo approval skips dates, but never unresolved claims or revoked activities.
    await db.collection('finance_escrows').updateOne({ _id: 'holding' }, { $set: { 'lots.0.state': 'disputed' } });
    assert.equal((await auth.finance.businessWallet(owner.id)).groups.find(group => group.id === 'holding').eligibleAmount, 0);
    await assert.rejects(() => auth.finance.requestPayout(owner.id, { activityId: 'holding', amount: 45000, clientRequestId: 'blocked-demo-claim' }), error => error.status === 409);
    await db.collection('finance_escrows').updateOne({ _id: 'holding' }, { $set: { 'lots.0.state': 'held' } });
    await db.collection('activities').updateOne({ id: 'holding' }, { $set: { businessRevoked: true } });
    assert.equal((await auth.finance.businessWallet(owner.id)).groups.find(group => group.id === 'holding').eligibleAmount, 0);
    await db.collection('activities').updateOne({ id: 'holding' }, { $unset: { businessRevoked: '' } });

    const merchant = await browser.newPage();
    await merchant.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), { accessToken: ownerToken, user: { ...owner, emailVerified: true } });
    await merchant.goto(base + '/portal');
    await merchant.locator('.gm-sidebar-nav').getByRole('button', { name: 'Ví & đối soát', exact: true }).click();
    await expect(merchant.getByRole('heading', { name: 'Ví & giải ngân', exact: true })).toBeVisible();
    await expect(merchant.getByText('Admin đã xác minh demo · Bỏ qua lịch và thời gian chờ giải ngân', { exact: false }).first()).toBeVisible().catch(async error => { console.error('Merchant wallet:', await merchant.locator('body').innerText()); throw error; });
    const selection = merchant.getByLabel('Hoạt động', { exact: true });
    for (const id of ['holding', 'unfinished']) {
      await expect(selection.locator(`option[value="${id}"]`)).toHaveCount(1);
      await selection.selectOption(id);
      const response = merchant.waitForResponse(response => response.url().endsWith('/api/portal/wallet/payouts') && response.request().method() === 'POST');
      await merchant.getByRole('button', { name: 'Gửi admin duyệt', exact: true }).click();
      const created = await response; assert.equal(created.status(), 201);
      const { payout } = await created.json(); assert.equal(payout.amount, 45000);
      await expect(selection.locator(`option[value="${id}"]`)).toHaveCount(0);
      for (const action of ['approve', 'start_transfer', 'complete']) {
        const response = await fetch(`${base}/api/portal/finance/groups/${id}/payouts/${payout.id}/review`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: 'Đối soát giải ngân sau xác minh demo', ...(action === 'complete' ? { transferRef: `DEMO-TRANSFER-${id}`, bankTransferConfirmed: true } : {}) }) });
        assert.equal(response.status, 200, await response.text());
      }
      const settled = await db.collection('finance_escrows').findOne({ _id: id });
      assert.equal(settled.payouts.at(-1).status, 'completed'); assert.equal(settled.lots[0].state, 'settled');
    }
    assert.equal((await auth.finance.businessWallet(owner.id)).paidOutAmount, 90000);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS demo verification through merchant eligibility, browser payout requests and admin approval/transfer/completion; normal hold, claims, revocation and authorization guards');
  } finally {
    await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await client.close(); await mongo.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
