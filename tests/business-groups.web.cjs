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
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('business_group_design') }));
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-business-groups-')); let server, browser;
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db); const auth = createAuthRepository(db), users = [], tokens = [];
    for (let i = 0; i < 3; i++) {
      const user = await auth.createUser({ name: ['Mộc Studio', 'Minh Anh', 'Duy Khánh'][i], email: `groups-design${i}@example.com`, passwordHash: 'unused' }); users.push(user);
      await db.collection('users').updateOne({ id: user.id }, { $set: { email_verified: true } });
      const token = newToken(); tokens.push(token); await auth.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) });
    }
    await db.collection('business_applications').insertOne({ id: 'groups-design-business', ownerId: users[0].id, company: 'Mộc Studio', status: 'approved' });
    const start = new Date(Date.now() + 3 * 86400000), end = new Date(+start + 10800000);
    await db.collection('activities').insertMany(['weekend', 'evening'].map((id, index) => ({ id, title: 'Workshop làm nến thơm', businessGroupName: index ? 'Buổi chiều · Thảo Điền' : 'Cuối tuần · Quận 1', businessCampaignTitle: 'Workshop làm nến thơm', hostId: users[0].id, hostName: users[0].name, organizerType: 'business', status: 'published', version: 1, startsAt: start, endsAt: end, location: '12 Nguyễn Huệ, TP. Hồ Chí Minh', meetingPoint: 'Mộc Studio', estimatedCost: 150000, depositAmount: 0, maxParticipants: 12, memberCount: 1, joinRequests: [{ id: 'request-' + id, userId: users[1].id, name: users[1].name, status: 'pending', createdAt: new Date() }], itinerary: [{ id: 'welcome-' + id, date: start.toISOString().slice(0, 10), time: '09:00', title: 'Đón khách & chọn mùi hương', place: 'Mộc Studio', note: '' }, { id: 'workshop-' + id, date: start.toISOString().slice(0, 10), time: '09:30', title: 'Trải nghiệm làm nến', place: 'Mộc Studio', note: '' }] })));
    server = createApp(readConfig({}), { authRepository: auth, activityRepository: createActivityRepository(db), chatRepository: createChatRepository(db) }).listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh' }); page.setDefaultTimeout(15000); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), { accessToken: tokens[0], user: { ...users[0], emailVerified: true } });
    const tab = name => page.getByRole('tab', { name, exact: true }).click();
    const clearNotices = () => page.locator('.gm-action-notices button').evaluateAll(buttons => buttons.forEach(button => button.click()));
    await page.goto(base + '/portal'); await page.locator('.gm-sidebar-nav').getByRole('button', { name: 'Quản lý nhóm', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Tổng quan', exact: true })).toHaveAttribute('aria-selected', 'true');
    assert.equal(await page.locator('.gm-group-tile').count(), 2);
    const id = await page.locator('.gm-group-tile.is-selected').getAttribute('data-group-id'), other = id === 'weekend' ? 'evening' : 'weekend';
    await page.screenshot({ path: join(artifacts, 'groups-overview-desktop.png'), fullPage: true });
    await tab('Thành viên'); await page.getByRole('button', { name: 'Duyệt tham gia', exact: true }).click();
    await expect.poll(async () => (await db.collection('activities').findOne({ id })).joinRequests[0].status).toBe('approved');
    await page.getByLabel('Điểm danh Minh Anh', { exact: true }).selectOption('present');
    await expect.poll(async () => (await db.collection('activities').findOne({ id })).attendance?.find(member => member.userId === users[1].id)?.status).toBe('present');
    await page.getByLabel('Tìm thành viên trong nhóm', { exact: true }).fill('không tồn tại'); await page.getByText('Không tìm thấy thành viên', { exact: true }).waitFor(); await page.getByLabel('Tìm thành viên trong nhóm', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Chốt lịch đi', exact: true }).click();
    await page.getByRole('button', { name: 'Bắt đầu hoạt động', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Quay lại', exact: true }).click(); assert.equal((await db.collection('activities').findOne({ id })).status, 'published');
    await page.getByRole('button', { name: 'Bắt đầu hoạt động', exact: true }).click(); await page.keyboard.press('Escape'); await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Bắt đầu hoạt động', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận bắt đầu', exact: true }).click();
    await expect.poll(async () => (await db.collection('activities').findOne({ id })).status).toBe('in-progress');
    await tab('Thông báo'); await page.getByLabel('Tiêu đề ưu đãi', { exact: true }).fill('Bản nháp nhóm thứ nhất');
    await page.locator(`[data-group-id="${other}"]`).click(); await tab('Thông báo'); await expect(page.getByLabel('Tiêu đề ưu đãi', { exact: true })).toHaveValue('');
    await page.locator(`[data-group-id="${id}"]`).click();
    await page.getByLabel('Lọc trạng thái nhóm', { exact: true }).selectOption('all');
    await page.getByRole('button', { name: 'Kết thúc hoạt động', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận kết thúc', exact: true }).click();
    await expect.poll(async () => (await db.collection('activities').findOne({ id })).status).toBe('completed');
    await expect(page.locator('.gm-group-context .gm-status')).toHaveText('Đã hoàn tất');
    await tab('Lịch trình'); assert.equal(await page.locator('.gm-timeline-actions button:enabled').count(), 0);
    await tab('Quản lý'); assert.equal(await page.getByRole('switch').count(), 0);
    await page.locator(`[data-group-id="${other}"]`).click(); await tab('Tổng quan'); await clearNotices();
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: join(artifacts, 'groups-overview-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: /NHÓM ĐANG CHỌN/ }).click(); await page.getByLabel('Lọc trạng thái nhóm', { exact: true }).selectOption('completed'); await page.locator(`[data-group-id="${id}"]`).click();
    await expect(page.locator('.gm-group-context .gm-status')).toHaveText('Đã hoàn tất');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); assert.deepEqual(errors, []);
    console.log('PASS group search/selection, approvals, attendance, schedule, start/finish confirmation, draft isolation, closed-group controls and mobile switcher. Artifacts: ' + artifacts);
  } finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await client.close(); await mongo.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
