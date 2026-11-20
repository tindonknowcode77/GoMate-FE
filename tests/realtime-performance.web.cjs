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
  const [{ createApp }, { readConfig }, { initializeDatabase }, { createAuthRepository }, { createActivityRepository }, { createChatRepository }, { attachChatSockets }, { hashToken, newToken }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/activities/repository', 'modules/chat/repository', 'modules/chat/socket', 'modules/auth/token'].map(be));
  const { MongoClient } = beRequire('mongodb');
  const mongo = await MongoMemoryServer.create(), client = new MongoClient(mongo.getUri());
  let io, browser;
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-realtime-'));
  try {
    await client.connect(); const db = client.db('browser_realtime'); await initializeDatabase(db);
    const auth = createAuthRepository(db), chat = createChatRepository(db), activities = createActivityRepository(db);
    const sessions = [];
    for (let i = 0; i < 2; i++) {
      const user = await auth.createUser({ name: `Realtime User ${i}`, email: `realtime${i}@example.com`, passwordHash: 'unused' });
      await db.collection('users').updateOne({ id: user.id }, { $set: { email_verified: true, birthDate: '2000-01-01', gender: 'undisclosed', bio: 'Hello', location: 'TP.HCM', interests: ['Travel'], languages: ['English'] } });
      const token = newToken(); await auth.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 600000) });
      sessions.push({ accessToken: token, user: { ...user, emailVerified: true } });
    }
    const conversation = await chat.create(sessions[0].user.id, { type: 'direct', userId: sessions[1].user.id });
    const server = createApp(readConfig({}), { authRepository: auth, activityRepository: activities, chatRepository: chat }).listen(0, '127.0.0.1');
    io = attachChatSockets(server, readConfig({}), chat, auth);
    await once(server, 'listening'); const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
    await context.addInitScript(session => localStorage.setItem('gomate.session', JSON.stringify(session)), sessions[0]);
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
    await page.goto(`${base}/#/app/messages/chat/${conversation.id}`);
    await page.getByLabel('Tin nhắn', { exact: true }).waitFor();
    await expect.poll(() => io.sockets.sockets.size).toBe(1);
    await chat.send(conversation.id, sessions[1].user.id, { text: 'Live socket message', clientMessageId: 'live' });
    await page.getByText('Live socket message', { exact: true }).waitFor();
    await expect.poll(async () => (await chat.snapshot(conversation.id, sessions[0].user.id)).unreadCount).toBe(0);
    // Allow any initial coalesced reload to finish, then verify an idle connected
    // chat does not keep fetching the same history over HTTP.
    await page.waitForTimeout(400);
    const beforeIdle = requests.filter(url => /\/conversations\/[^/]+\/(messages)|\/conversations\/[^/?]+$/.test(url)).length;
    await page.waitForTimeout(3500);
    assert.equal(requests.filter(url => /\/conversations\/[^/]+\/(messages)|\/conversations\/[^/?]+$/.test(url)).length, beforeIdle);
    await context.setOffline(true);
    await expect.poll(() => io.sockets.sockets.size).toBe(0);
    for (let i = 0; i < 125; i++) await chat.send(conversation.id, sessions[1].user.id, { text: `Missed message ${i}`, clientMessageId: `offline-${i}` });
    await context.setOffline(false);
    await page.getByText('Missed message 124', { exact: true }).waitFor({ timeout: 20000 });
    assert.equal(await page.getByText(/^Missed message \d+$/, { exact: true }).count(), 125);
    assert.ok(requests.some(url => url.includes('&after=')), 'reconnect must use forward-cursor history');
    await page.screenshot({ path: join(artifacts, 'chat-reconnected.png') });
    await page.goto(base + '/#/app/home'); await page.getByRole('tab', { name: 'Trang chủ' }).waitFor();
    assert.equal(requests.filter(url => new URL(url).pathname === '/api/activities').length, 0, 'home must not preload discovery');
    await db.collection('business_applications').insertOne({ id: 'browser-business', ownerId: sessions[0].user.id, company: 'Realtime Company', status: 'approved' });
    await db.collection('business_locations').insertMany(Array.from({ length: 25 }, (_, i) => ({ id: `location-${i}`, ownerId: sessions[0].user.id, name: `Location ${i}`, address: 'Test address', city: 'TP.HCM', version: 1, createdAt: new Date(Date.now() + i) })));
    const beforePortal = requests.length;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/portal');
    await page.locator('.gm-multi-post-footer').waitFor();
    await expect.poll(() => requests.slice(beforePortal).filter(url => new URL(url).pathname === '/api/portal/locations').length).toBeGreaterThan(0);
    assert.equal(requests.slice(beforePortal).filter(url => ['/api/portal/posts','/api/portal/staff','/api/portal/metrics'].includes(new URL(url).pathname)).length, 0, 'portal must only load resources needed by its active section');
    assert.equal(requests.slice(beforePortal).filter(url => new URL(url).searchParams.get('page') === '2').length, 0, 'portal must not eagerly exhaust pagination');
    await page.locator('.gm-sidebar-nav').getByRole('button', { name: 'Thư viện địa điểm', exact: true }).click();
    await expect(page.locator('.gm-location-row')).toHaveCount(20);
    await page.locator('.gm-pagination-actions button').click();
    await expect(page.locator('.gm-location-row')).toHaveCount(25);
    await page.screenshot({ path: join(artifacts, 'portal-pagination.png') });
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS live socket delivery, no idle history polling, 125-message reconnect recovery, lazy discovery, portal demand loading and pagination');
    console.log('Browser artifacts:', artifacts);
  } catch (error) {
    if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {});
    console.error('Browser artifacts:', artifacts); throw error;
  } finally {
    await browser?.close(); if (io) await new Promise(resolve => io.close(resolve)); await client.close(); await mongo.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
