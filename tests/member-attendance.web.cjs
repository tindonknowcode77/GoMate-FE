const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { existsSync, mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium, expect } = require('playwright/test');
const root = resolve(__dirname, '../../GoMate-BE'), beRequire = createRequire(root + '/package.json');
const be = name => import(pathToFileURL(root + '/src/' + name + '.js').href);

(async () => {
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  const [{ createApp }, { readConfig }, { createClient, initializeDatabase }, { createAuthRepository }, { createActivityRepository }, { createChatRepository }, { newToken, hashToken }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/activities/repository', 'modules/chat/repository', 'modules/auth/token'].map(be));
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('member_attendance_ui') }));
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-attendance-')); console.log('Artifacts:', artifacts);
  let server, browser; const pages = [];
  try {
    await client.connect(); const db = client.db(); await initializeDatabase(db);
    const auth = createAuthRepository(db), activities = createActivityRepository(db), users = [], sessions = [];
    for (const [index, name] of ['Attendance Admin', 'Attendance Host', 'Attendance Member', 'Attendance Visitor'].entries()) {
      const user = await auth.createUser({ name, email: `attendance-ui${index}@example.com`, passwordHash: 'unused' }); users.push(user);
      await db.collection('users').updateOne({ id: user.id }, { $set: { role: index === 0 ? 'admin' : 'user', email_verified: true, birthDate: '2000-01-01', gender: 'male', location: 'Hà Nội', bio: 'Attendance demo profile', interests: ['Workshop'], languages: ['Tiếng Việt'] } });
      const token = newToken(); await auth.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) }); sessions.push({ accessToken: token, user: { ...user, emailVerified: true } });
    }
    const make = async (title, mark, status = 'completed') => {
      const row = await activities.create({ title, description: 'A workshop for attendance UI verification', category: 'Workshop', location: 'Hà Nội', startsAt: new Date(Date.now() + 3600000), endsAt: new Date(Date.now() + 7200000), maxParticipants: 8, estimatedCost: 0, initialMembers: [users[2], users[3]] }, users[1]);
      await db.collection('activities').updateOne({ id: row.id }, { $set: { status, scheduleConfirmedAt: new Date(), memberCount: 3, joinRequests: users.slice(2).map(user => ({ id: user.id, userId: user.id, name: user.name, status: 'approved', createdAt: new Date() })), attendance: users.slice(1).map(user => ({ userId: user.id, name: user.name, status: user.id === users[2].id ? mark : 'present', updatedBy: users[1].id, updatedAt: new Date() })) } });
      return row;
    };
    const absent = await make('Buổi workshop bị ghi vắng', 'absent'), present = await make('Buổi workshop có mặt', 'present');
    await make('Buổi workshop chưa điểm danh', 'unmarked'); const running = await make('Buổi workshop mới bắt đầu', 'unmarked', 'published');
    await db.collection('activity_ratings').insertMany([4, 5].map((score, index) => ({ id: 'rating-' + index, activityId: index ? present.id : absent.id, authorId: users[1].id, targetUserId: users[2].id, score, createdAt: new Date() })));
    server = createApp(readConfig({}), { authRepository: auth, activityRepository: activities, chatRepository: createChatRepository(db) }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/api/activities/${running.id}/start`, { method: 'POST', headers: { Authorization: 'Bearer ' + sessions[1].accessToken, 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(response.status, 200, await response.text());
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const errors = [];
    const pageFor = async (index, width = 390) => {
      const page = await browser.newPage({ viewport: { width, height: 900 } }); pages.push(page); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), sessions[index]); return page;
    };
    const member = await pageFor(2), admin = await pageFor(0, 1440), visitor = await pageFor(3);
    await member.goto(base + '/#/app/profile');
    await expect(member.getByText('★ 4.5 / 5', { exact: true })).toBeVisible(); await expect(member.getByText('50%', { exact: true })).toBeVisible();
    await member.screenshot({ path: join(artifacts, 'own-profile-mobile.png'), fullPage: true });
    await member.getByRole('button', { name: 'Điểm danh & khiếu nại', exact: true }).click();
    await expect(member.getByText('Buổi workshop bị ghi vắng', { exact: true })).toBeVisible();
    await member.goto(base + '/#/app/profile/notifications'); await member.getByText('Bạn chưa được điểm danh', { exact: true }).click();
    await expect(member.getByText('Điểm danh & khiếu nại', { exact: true })).toBeVisible();
    const card = member.getByText('Buổi workshop bị ghi vắng', { exact: true }).locator('..');
    await card.getByRole('button', { name: 'Khiếu nại điểm danh', exact: true }).click();
    await member.getByLabel('Nội dung khiếu nại', { exact: true }).fill('Tôi có mặt đúng giờ và có ảnh nhóm để xác minh điểm danh.');
    await member.getByText('Gửi khiếu nại', { exact: true }).click();
    await expect(member.getByText('Chờ Admin xem xét', { exact: true })).toBeVisible();
    const complaint = await db.collection('reports').findOne({ reporterId: users[2].id, kind: 'attendance' }); assert.ok(complaint);
    await admin.goto(base + '/portal'); await admin.locator('.gm-sidebar-nav').getByRole('button', { name: 'Báo cáo', exact: true }).click();
    await admin.locator('tbody tr').getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const dialog = admin.getByRole('dialog'); await dialog.getByLabel('Kết quả điểm danh sau xác minh', { exact: true }).selectOption('present');
    await dialog.getByLabel('Lý do xử lý khiếu nại', { exact: true }).fill('Đã đối chiếu ảnh nhóm và xác nhận người tham gia.');
    await admin.screenshot({ path: join(artifacts, 'admin-attendance-review.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Chấp nhận & sửa điểm danh', exact: true }).click(); await expect(dialog).not.toBeVisible();
    assert.equal((await db.collection('activities').findOne({ id: absent.id })).attendance.find(item => item.userId === users[2].id).status, 'present');
    await member.reload(); await expect(member.getByText('0%', { exact: true })).toBeVisible();
    await expect(member.getByText('Phản hồi Admin: Đã đối chiếu ảnh nhóm và xác nhận người tham gia.', { exact: true })).toBeVisible();
    await member.screenshot({ path: join(artifacts, 'complaint-resolved-mobile.png'), fullPage: true });
    await visitor.goto(base + '/#/app/home/group/' + absent.id); await visitor.getByRole('tab', { name: 'Thành viên', exact: true }).click();
    await visitor.getByText(users[2].name, { exact: true }).last().click(); await expect(visitor.getByText('Đóng hồ sơ', { exact: true })).toBeVisible();
    await expect(visitor.getByText('★ 4.5 / 5', { exact: true })).toBeVisible(); await expect(visitor.getByText('0%', { exact: true })).toBeVisible();
    await visitor.screenshot({ path: join(artifacts, 'public-profile-mobile.png'), fullPage: true, animations: 'disabled' });
    assert.ok(await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log('PASS own/public profile metrics, unmarked-start notice deep link, user complaint, Admin correction/audit, recalculated rate and mobile layouts.');
  } catch (error) {
    for (const [index, page] of pages.entries()) { console.log('Page', index, page.url(), (await page.locator('body').innerText()).slice(0, 2200)); await page.screenshot({ path: join(artifacts, `failure-${index}.png`), fullPage: true }).catch(() => {}); }
    throw error;
  } finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await client.close(); await mongo.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
