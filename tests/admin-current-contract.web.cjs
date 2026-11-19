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
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('admin_contract_browser') }));
  let server, browser;
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db); const auth = createAuthRepository(db);
    const admin = await auth.createUser({ name: 'Contract Admin', email: 'contract-admin@example.com', passwordHash: 'unused' });
    await db.collection('users').updateOne({ id: admin.id }, { $set: { role: 'admin', email_verified: true } });
    await db.collection('users').insertMany([
      { id: 'alpha', name: 'Alpha Member', email: 'alpha@example.com', created_at: new Date('2026-11-18T01:00Z') },
      { id: 'zulu', name: 'Zulu Member', email: 'zulu@example.com', created_at: new Date('2026-11-18T12:00Z'), email_verified: true },
    ]);
    await db.collection('business_posts').insertOne({ id: 'post', title: 'Contract Post', status: 'pending', createdAt: new Date('2026-11-18T01:00Z') });
    await db.collection('finance_escrows').insertOne({ _id: 'ledger', payouts: [{ id: 'completed', status: 'completed', processedAt: new Date('2026-11-18T01:00Z'), amount: 45000, feeAmount: 5000 }] });
    const token = newToken(); await auth.createSession({ userId: admin.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 600000) });
    server = createApp(readConfig({}), { authRepository: auth }).listen(0, '127.0.0.1'); await once(server, 'listening');
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
    const failures = [], runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('response', response => { if (response.url().includes('/api/') && response.status() >= 400) failures.push(`${response.status()} ${new URL(response.url()).pathname}`); });
    await page.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), { accessToken: token, user: { ...admin, emailVerified: true } });
    await page.goto(`http://127.0.0.1:${server.address().port}/portal`);
    await expect(page.locator('.gm-admin-dashboard-home')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.gm-admin-kpi--users strong')).toHaveText('3');
    const nav = label => page.locator('.gm-sidebar-nav').getByRole('button', { name: label, exact: true }).click();
    await nav('Báo cáo tài chính');
    const report = page.locator('.gm-admin-revenue-panel');
    await report.getByLabel('Năm', { exact: true }).selectOption('2026');
    await report.getByLabel('Tháng', { exact: true }).selectOption('11');
    await expect(report).toHaveAttribute('aria-busy', 'false');
    await expect(report.locator('.gm-admin-revenue-summary-card.is-primary strong')).toContainText('5.000');
    await expect(report.locator('svg')).toBeVisible();
    await nav('Tài khoản'); const panel = page.locator('.gm-admin-management');
    await expect(panel.locator('tbody tr')).toHaveCount(3);
    await panel.getByLabel('Từ ngày', { exact: true }).fill('2026-11-18');
    await panel.getByLabel('Đến ngày', { exact: true }).fill('2026-11-18');
    await panel.getByLabel('Sắp xếp theo', { exact: true }).selectOption('name');
    await panel.getByLabel('Chiều sắp xếp', { exact: true }).selectOption('asc');
    await expect(panel.locator('tbody tr')).toHaveCount(2);
    await expect(panel.locator('tbody tr').first()).toContainText('Alpha Member');
    await panel.getByRole('button', { name: 'Quản lý role', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên vai trò', { exact: true }).fill('Browser Helpers');
    await dialog.getByLabel('Mô tả', { exact: true }).fill('Browser-created classification');
    await dialog.getByRole('button', { name: 'Tạo vai trò', exact: true }).click();
    const roleRow = dialog.locator('.gm-admin-role-row').filter({ hasText: 'Browser Helpers' });
    await expect(roleRow).toBeVisible();
    await roleRow.getByRole('button', { name: 'Sửa', exact: true }).click();
    await dialog.getByLabel('Tên vai trò', { exact: true }).fill('Browser Volunteers');
    await dialog.getByRole('button', { name: 'Lưu vai trò', exact: true }).click();
    const renamed = dialog.locator('.gm-admin-role-row').filter({ hasText: 'Browser Volunteers' }); await expect(renamed).toBeVisible();
    await renamed.getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xóa vai trò', exact: true }).click();
    await expect(renamed).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    await nav('Duyệt bài đăng'); await expect(panel.locator('tbody tr')).toHaveCount(1);
    await expect(panel.locator('tbody tr')).toContainText('Contract Post');
    assert.deepEqual(failures, []); assert.deepEqual(runtimeErrors, []);
    console.log('PASS current Admin dashboard, performance, revenue, account/post lists, date/sort filters and role create/edit/delete without API or runtime errors');
  } finally {
    await browser?.close(); if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); await client.close(); await mongo.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
