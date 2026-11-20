const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name, requireModule, extras = {}) {
  const exports = {};
  const source = readFileSync(join(__dirname, '../src/services', name), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule, setTimeout, clearTimeout, AbortController, ...extras });
  return exports;
}
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('simultaneous GETs share the network request; mutations and sessions separate subsequent reads', async () => {
  const jobs = [], calls = [];
  const api = load('api.ts', name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-constants') return { default: {} };
    if (name === './apiUrl') return { resolveApiBaseUrl: () => 'http://api.test/api' };
    return { setItemAsync: async () => {}, deleteItemAsync: async () => {} };
  }, { __DEV__: true, process: { env: {} }, fetch: (url, options) => {
    calls.push({ url, options }); const job = deferred(); jobs.push(job);
    return job.promise.then(value => ({ ok: true, status: 200, json: async () => value }));
  } });
  api.setSession({ accessToken: 'first', user: { id: 'one' } });
  const first = api.api('/same'), duplicate = api.api('/same');
  assert.equal(first, duplicate); assert.equal(calls.length, 1);
  const write = api.api('/write', { method: 'POST', body: '{}' });
  const fresh = api.api('/same'); assert.equal(calls.length, 3);
  jobs[0].resolve({ version: 1 }); jobs[1].resolve({}); jobs[2].resolve({ version: 2 });
  await Promise.all([first, write]); assert.equal((await fresh).version, 2);
  const previousSession = api.api('/same'); api.setSession({ accessToken: 'second', user: { id: 'two' } });
  const nextSession = api.api('/same'); assert.equal(calls.length, 5);
  jobs[3].resolve({}); jobs[4].resolve({});
  await assert.rejects(previousSession, error => error.status === 409); await nextSession;
});

test('slow background reloads do not overlap or discard data; a foreground refresh queues one fresh read', async () => {
  const slots = []; let cursor = 0;
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { callback, deps }; return slots[index].callback; },
    useEffect() { cursor++; },
  };
  const { useRemote } = load('useRemote.ts', () => hooks);
  const jobs = []; let calls = 0;
  const loader = () => { calls++; const job = deferred(); jobs.push(job); return job.promise; };
  const render = () => { cursor = 0; return useRemote(loader, []); };
  let remote = render(); const pending = remote.reload(true);
  for (let i = 0; i < 10; i++) assert.equal(remote.reload(true), pending);
  assert.equal(calls, 1); jobs[0].resolve(['loaded']); await pending;
  remote = render(); assert.equal(remote.loading, false); assert.equal(remote.data[0], 'loaded');
  const background = remote.reload(true), foreground = remote.reload();
  assert.equal(remote.reload(), foreground); assert.equal(calls, 2);
  jobs[1].resolve(['old']); await background; await Promise.resolve();
  assert.equal(calls, 3); jobs[2].resolve(['new']); await foreground;
  assert.equal(render().data[0], 'new');
  const pendingEventRead = remote.reload(true), eventRefresh = remote.reload(true, true);
  assert.equal(calls, 4); jobs[3].resolve(['before event']); await pendingEventRead; await Promise.resolve();
  assert.equal(calls, 5); jobs[4].resolve(['after event']); await eventRefresh;
  assert.equal(render().data[0], 'after event');
});

test('chat reconnect drains every after-cursor page, including more than 50 missed messages', async () => {
  const calls = [];
  const { catchUpChat } = load('chatService.ts', name => name === './api' ? { api: async path => {
    calls.push(path);
    const after = Number(new URL('http://api.test' + path).searchParams.get('after'));
    const items = Array.from({ length: Math.min(100, 225 - after) }, (_, i) => ({ id: String(after + i + 1) }));
    return { items, hasMore: after + items.length < 225, nextCursor: items.at(-1)?.id };
  } } : {});
  const rows = await catchUpChat('conversation', '1');
  assert.equal(rows.length, 224); assert.equal(rows[0].id, '2'); assert.equal(rows.at(-1).id, '225');
  assert.equal(calls.length, 3);
  assert.equal((await catchUpChat('conversation', '1', () => false)).length, 0);
});
