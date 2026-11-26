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

function apiWithFetch(fetch) {
  return load('api.ts', name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-constants') return { default: {} };
    if (name === './apiUrl') return { resolveApiBaseUrl: () => 'http://api.test/api' };
    return { setItemAsync: async () => {}, deleteItemAsync: async () => {} };
  }, { __DEV__: true, process: { env: {} }, fetch });
}

test('a transient GET transport failure retries once without a manual retry or duplicate reads', async () => {
  let calls = 0;
  const api = apiWithFetch(async () => {
    if (++calls === 1) throw new TypeError('Network request failed');
    return { ok: true, status: 200, json: async () => ({ recovered: true }) };
  });
  const first = api.api('/activities');
  assert.equal(first, api.api('/activities'));
  assert.equal((await first).recovered, true); assert.equal(calls, 2);
});

test('HTTP failures and writes are never retried; persistent transport failures stop after two reads', async () => {
  let calls = 0;
  const transport = apiWithFetch(async () => { calls++; throw new TypeError('Offline'); });
  await assert.rejects(transport.api('/write', { method: 'POST', body: '{}' })); assert.equal(calls, 1);
  calls = 0; await assert.rejects(transport.api('/read')); assert.equal(calls, 2);
  calls = 0;
  const http = apiWithFetch(async () => { calls++; return { ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) }; });
  await assert.rejects(http.api('/private'), error => error.status === 403); assert.equal(calls, 1);
});

test('GET retry respects cancellation, session changes and the original timeout budget', async () => {
  for (const reason of ['abort', 'session', 'timeout']) {
    let calls = 0; const controller = new AbortController();
    const api = apiWithFetch(async () => { calls++; throw new TypeError('Connection reset'); });
    const request = api.api('/read', { signal: controller.signal, timeoutMs: reason === 'timeout' ? 15 : 1000 });
    if (reason === 'abort') controller.abort();
    if (reason === 'session') api.setSession({ accessToken: 'new', user: { id: 'another-user' } });
    await assert.rejects(request, error => reason !== 'timeout' || /quá thời gian/.test(error.message)); assert.equal(calls, 1, reason);
  }
});

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

test('discovery pauses off screen, retains cards on return and hides data for previous filters', async () => {
  const slots = []; let cursor = 0; let effects = [];
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { callback, deps }; return slots[index].callback; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const remote = load('useRemote.ts', () => hooks);
  const { usePagedRemote } = load('usePagedRemote.ts', name => name === 'react' ? hooks : remote);
  let calls = 0;
  const page = id => ({ items: [{ id }], total: 1, hasMore: false });
  const first = async () => { calls++; return page('old'); };
  const render = (loader, enabled) => {
    cursor = 0; effects = [];
    const value = usePagedRemote(loader, enabled);
    effects.forEach(effect => effect());
    return value;
  };
  const tick = () => new Promise(resolve => setTimeout(resolve, 10));
  render(first, false); await tick(); assert.equal(calls, 0);
  render(first, true); await tick(); assert.equal(calls, 1);
  assert.equal(render(first, true).data.items[0].id, 'old');
  render(first, false); await tick(); assert.equal(calls, 1);
  assert.equal(render(first, false).data.items[0].id, 'old');
  assert.equal(render(first, true).data.items[0].id, 'old');
  await tick(); assert.equal(calls, 2);
  const pending = deferred(); const second = () => pending.promise;
  assert.equal(render(second, true).data.items.length, 0);
  await tick(); pending.resolve(page('new')); await tick();
  assert.equal(render(second, true).data.items[0].id, 'new');
  // An obsolete response must not overwrite a new filter result after navigation.
  const late = deferred(); const third = () => late.promise;
  render(third, true); await tick();
  render(second, true); await tick(); late.resolve(page('obsolete')); await tick();
  assert.equal(render(second, true).data.items[0].id, 'new');
  const oldMore = deferred();
  let moreCalls = 0;
  const wideRadius = async pageNumber => {
    if (pageNumber === 1) return { ...page('wide-radius'), hasMore: true, total: 2 };
    moreCalls++; return oldMore.promise;
  };
  render(wideRadius, true); await tick();
  const wideRemote = render(wideRadius, true);
  const more = wideRemote.loadMore(); void wideRemote.loadMore();
  assert.equal(moreCalls, 1, 'double taps share a load-more guard');
  render(second, true); await tick();
  oldMore.resolve(page('outside-new-radius')); await more;
  assert.equal(render(second, true).data.items.length, 1);
  assert.equal(render(second, true).data.items[0].id, 'new', 'old page must not leak into a changed radius/region');
  render(second, false);
});
