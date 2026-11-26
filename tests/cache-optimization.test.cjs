const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(relPath, requireModule, extras = {}) {
  const exports = {};
  const source = readFileSync(join(__dirname, '../src', relPath), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const resolver = typeof requireModule === 'function' ? requireModule : name => requireModule[name] ?? {};
  vm.runInNewContext(code, { exports, require: resolver, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, AbortController, Error, Date, ...extras });
  return exports;
}

function createHarness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      slots[i] ??= { current: initial };
      return slots[i];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, idx) => v !== slots[i].deps[idx])) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, idx) => v !== slots[i].deps[idx])) slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useSyncExternalStore(_sub, snapshot) {
      cursor++;
      return snapshot();
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, idx) => v !== slots[i].deps[idx])) {
        effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
      }
    },
    Fragment: 'Fragment',
  };
  return {
    hooks,
    render(fn) {
      cursor = 0;
      effects = [];
      const out = fn();
      effects.splice(0).forEach(run => run());
      return out;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

const tick = (ms = 12) => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function createApiAndCache() {
  const api = loadModule('services/api.ts', name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'expo-constants') return { default: {} };
    if (name === './apiUrl') return { resolveApiBaseUrl: () => 'http://api.test/api' };
    return { setItemAsync: async () => {}, deleteItemAsync: async () => {} };
  }, { __DEV__: true, process: { env: {} }, fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }) });
  const remoteCache = loadModule('services/remoteCache.ts', name => name === './api' ? api : {});
  return { api, remoteCache };
}

test('remoteCache isolates sessions, respects freshness TTL, preserves static entries on global stale, and maps mutations accurately', () => {
  const { api, remoteCache } = createApiAndCache();
  api.setSession({ accessToken: 'tok-1', user: { id: 'u1', name: 'A', email: 'a@test' } });

  remoteCache.setCached('home', { items: [1] }, { staleTimeMs: 30000, tags: ['home', 'activities'] });
  remoteCache.setCached('maps-config', { placesEnabled: true }, { staleTimeMs: 300000, tags: ['static'] });
  assert.equal(remoteCache.getCached('home').fresh, true);
  assert.deepEqual(remoteCache.getCached('home').value, { items: [1] });

  // Tag-specific invalidation only stales matching entries
  remoteCache.markCacheStale(['friends']);
  assert.equal(remoteCache.getCached('home').fresh, true);
  remoteCache.markCacheStale(['activities']);
  assert.equal(remoteCache.getCached('home').fresh, false);
  assert.equal(remoteCache.getCached('maps-config').fresh, true);

  // Global stale preserves static entries
  remoteCache.setCached('home', { items: [2] }, { staleTimeMs: 30000, tags: ['home'] });
  remoteCache.markCacheStale();
  assert.equal(remoteCache.getCached('home').fresh, false);
  assert.equal(remoteCache.getCached('maps-config').fresh, true);

  // Mutation tag mapping
  assert.equal(remoteCache.tagsForMutation('/maps/places/autocomplete', 'POST').length, 0);
  assert.equal(remoteCache.tagsForMutation('/me/match-feedback', 'POST').length, 0);
  assert.ok(remoteCache.tagsForMutation('/conversations/c1/read', 'PATCH').includes('unread-messages'));
  assert.ok(remoteCache.tagsForMutation('/activities/a1/members/me', 'DELETE').includes('members:a1'));

  // Session change clears all cached entries immediately
  api.setSession({ accessToken: 'tok-2', user: { id: 'u2', name: 'B', email: 'b@test' } });
  assert.equal(remoteCache.getCached('home'), null);
  assert.equal(remoteCache.getCached('maps-config'), null);
});

test('useRemote hydrates immediately from cache, skips redundant fresh fetches, revalidates silently when stale, and evicts on 403', async () => {
  const { api, remoteCache } = createApiAndCache();
  api.setSession({ accessToken: 'tok-1', user: { id: 'u1', name: 'A', email: 'a@test' } });

  let calls = 0;
  let nextValue = { count: 1 };
  let nextError = null;
  const loader = async () => {
    calls++;
    if (nextError) throw nextError;
    return nextValue;
  };

  // First mount: cold load
  const h1 = createHarness();
  const { useRemote: useRemote1 } = loadModule('services/useRemote.ts', name => name === 'react' ? h1.hooks : remoteCache);
  let r1 = h1.render(() => useRemote1(loader, null, true, { cacheKey: 'members:act1', staleTimeMs: 30000, tags: ['members:act1'] }));
  assert.equal(r1.loading, true);
  assert.equal(r1.data, null);
  await tick();
  r1 = h1.render(() => useRemote1(loader, null, true, { cacheKey: 'members:act1', staleTimeMs: 30000, tags: ['members:act1'] }));
  assert.equal(calls, 1);
  assert.equal(r1.loading, false);
  assert.deepEqual(r1.data, { count: 1 });
  // Optimistic setData persists to cache
  r1.setData({ count: 2 });
  h1.unmount();

  // Second mount while fresh: instant render, ZERO API calls!
  const h2 = createHarness();
  const { useRemote: useRemote2 } = loadModule('services/useRemote.ts', name => name === 'react' ? h2.hooks : remoteCache);
  const r2 = h2.render(() => useRemote2(loader, null, true, { cacheKey: 'members:act1', staleTimeMs: 30000, tags: ['members:act1'] }));
  assert.equal(r2.loading, false, 'cached mount must not show loading spinner');
  assert.deepEqual(r2.data, { count: 2 }, 'optimistic setData must survive remount');
  await tick();
  assert.equal(calls, 1, 'fresh cache hit must skip redundant API request');
  h2.unmount();

  // Mark stale -> third mount shows cached data immediately AND updates in background!
  remoteCache.markCacheStale(['members:act1']);
  nextValue = { count: 3 };
  const h3 = createHarness();
  const { useRemote: useRemote3 } = loadModule('services/useRemote.ts', name => name === 'react' ? h3.hooks : remoteCache);
  let r3 = h3.render(() => useRemote3(loader, null, true, { cacheKey: 'members:act1', staleTimeMs: 30000, tags: ['members:act1'] }));
  assert.equal(r3.loading, false, 'stale mount still shows cached data without loading flash');
  assert.deepEqual(r3.data, { count: 2 });
  await tick();
  r3 = h3.render(() => useRemote3(loader, null, true, { cacheKey: 'members:act1', staleTimeMs: 30000, tags: ['members:act1'] }));
  assert.equal(calls, 2, 'stale cache triggers background revalidation');
  assert.deepEqual(r3.data, { count: 3 });

  // 403 evicts cache entry
  remoteCache.markCacheStale(['members:act1']);
  nextError = Object.assign(new Error('Forbidden'), { status: 403 });
  await r3.reload(true);
  assert.equal(remoteCache.getCached('members:act1'), null, '403 must evict cached entry');
  h3.unmount();
});

test('usePagedRemote preserves paginated items and page number across remounts', async () => {
  const { api, remoteCache } = createApiAndCache();
  api.setSession({ accessToken: 'tok-1', user: { id: 'u1', name: 'A', email: 'a@test' } });

  const requestedPages = [];
  const loadPage = async page => {
    requestedPages.push(page);
    return {
      items: [{ id: `item-${page}` }],
      hasMore: page < 3,
      total: 3,
    };
  };

  const h1 = createHarness();
  const remoteMod1 = loadModule('services/useRemote.ts', name => name === 'react' ? h1.hooks : remoteCache);
  const { usePagedRemote: usePaged1 } = loadModule('services/usePagedRemote.ts', name => name === 'react' ? h1.hooks : remoteMod1);
  h1.render(() => usePaged1(loadPage, true, { cacheKey: 'messages:all:', staleTimeMs: 30000, tags: ['conversations'] }));
  await tick();
  let p1 = h1.render(() => usePaged1(loadPage, true, { cacheKey: 'messages:all:', staleTimeMs: 30000, tags: ['conversations'] }));
  await p1.loadMore();
  p1 = h1.render(() => usePaged1(loadPage, true, { cacheKey: 'messages:all:', staleTimeMs: 30000, tags: ['conversations'] }));
  assert.deepEqual([...p1.data.items.map(i => i.id)], ['item-1', 'item-2']);
  h1.unmount();

  // Remount: immediately shows both loaded pages and loads page 3 on loadMore
  const h2 = createHarness();
  const remoteMod2 = loadModule('services/useRemote.ts', name => name === 'react' ? h2.hooks : remoteCache);
  const { usePagedRemote: usePaged2 } = loadModule('services/usePagedRemote.ts', name => name === 'react' ? h2.hooks : remoteMod2);
  let p2 = h2.render(() => usePaged2(loadPage, true, { cacheKey: 'messages:all:', staleTimeMs: 30000, tags: ['conversations'] }));
  assert.equal(p2.loading, false);
  assert.deepEqual([...p2.data.items.map(i => i.id)], ['item-1', 'item-2']);
  await tick();
  assert.deepEqual(requestedPages, [1, 2], 'fresh remount must not refetch page 1');
  await p2.loadMore();
  p2 = h2.render(() => usePaged2(loadPage, true, { cacheKey: 'messages:all:', staleTimeMs: 30000, tags: ['conversations'] }));
  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.deepEqual([...p2.data.items.map(i => i.id)], ['item-1', 'item-2', 'item-3']);
  h2.unmount();
});

test('chatCache reuses messages across remounts, skips redundant history reads, and catches up incrementally when stale', async () => {
  const { api, remoteCache } = createApiAndCache();
  api.setSession({ accessToken: 'tok-1', user: { id: 'me', name: 'Me', email: 'me@test' } });
  const chatOutbox = loadModule('services/chatOutbox.ts', {});
  const chatCache = loadModule('services/chatCache.ts', name => {
    if (name === './api') return api;
    if (name === './chatOutbox') return chatOutbox;
    if (name === './remoteCache') return remoteCache;
    return {};
  });

  // Group conversation cache
  const conv = { id: 'c1', type: 'group', name: 'Run', activityTitle: 'Run', activityId: 'act1', lastMessage: { id: '0001' }, lastReadMessageId: '0001' };
  chatCache.setCachedGroupConversation('act1', conv);
  assert.equal(chatCache.getCachedGroupConversation('act1').id, 'c1');

  const historyMsg = { id: '0001', conversationId: 'c1', senderId: 'other', clientMessageId: 'm1', text: 'hi', createdAt: new Date().toISOString() };
  const newerMsg = { id: '0002', conversationId: 'c1', senderId: 'other', clientMessageId: 'm2', text: 'new!', createdAt: new Date().toISOString() };
  let metaCalls = 0, historyCalls = 0, catchUpCalls = 0;
  let serverLastId = '0001';
  const service = {
    getConversation: async () => { metaCalls++; return { ...conv, lastMessage: { id: serverLastId }, lastReadMessageId: serverLastId }; },
    chatHistory: async () => { historyCalls++; return { items: [historyMsg], nextCursor: null }; },
    catchUpChat: async () => { catchUpCalls++; return [newerMsg]; },
    markChatRead: async () => {},
    sendChatMessage: async () => newerMsg,
  };
  const native = { ...Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'TextInput', 'View'].map(n => [n, n])), StyleSheet: { create: s => s }, Platform: { OS: 'android' }, Keyboard: { addListener: () => ({ remove() {} }) } };
  const jsx = (type, props) => ({ type, props });
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

  const mountChat = () => {
    const h = createHarness();
    const { ChatScreen } = loadModule('screens/ChatScreen.tsx', {
      react: h.hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '../components/LocalizedText': { Text: 'Text' }, '../services/feedback': { useFeedbackState: h.hooks.useState },
      '../services/chatService': service, '../services/chatOutbox': chatOutbox, '../services/chatCache': chatCache,
      '../services/api': api, '../services/chatEvents': { watchConversation: () => () => {} },
      '../theme': { colors: {}, layout: {} },
    });
    return { h, render: () => flatten(h.render(() => ChatScreen({ conversation: conv, onBack() {} }))) };
  };

  // First mount: cold load fetches metadata + history
  const first = mountChat();
  first.render();
  await tick();
  let tree = first.render();
  assert.equal(metaCalls, 1);
  assert.equal(historyCalls, 1);
  assert.ok(tree.some(n => n.type === 'Text' && n.props.children === 'hi'));
  first.h.unmount();

  // Immediate remount (e.g. switching tabs / reopening): 0ms render, 0 extra calls!
  const second = mountChat();
  tree = second.render();
  assert.ok(tree.some(n => n.type === 'Text' && n.props.children === 'hi'), 'reopening chat must display cached messages immediately');
  assert.ok(!tree.some(n => n.type === 'ActivityIndicator'), 'reopening cached chat must not show loading spinner');
  await tick();
  assert.equal(metaCalls, 1, 'warm chat cache skips redundant getConversation');
  assert.equal(historyCalls, 1, 'warm chat cache never refetches full history');
  second.h.unmount();

  // Realtime user.updated marks cache stale -> remount shows cached messages AND catches up incrementally
  serverLastId = '0002';
  remoteCache.markCacheStale();
  const third = mountChat();
  tree = third.render();
  assert.ok(tree.some(n => n.type === 'Text' && n.props.children === 'hi'));
  await tick();
  tree = third.render();
  assert.equal(historyCalls, 1, 'stale reopen uses catchUpChat instead of full chatHistory');
  assert.equal(catchUpCalls, 1);
  assert.ok(tree.some(n => n.type === 'Text' && n.props.children === 'new!'));
  third.h.unmount();

  // Session switch wipes all chat caches
  api.setSession({ accessToken: 'tok-2', user: { id: 'other', name: 'O', email: 'o@test' } });
  assert.equal(chatCache.getCachedGroupConversation('act1'), null);
});

test('useMatchLocation reuses coordinates on re-entry without loading flash and keeps stable ref when stationary', async () => {
  const h = createHarness();
  let calls = 0;
  let nextFix = { latitude: 10.77, longitude: 106.7 };
  let nextJob = deferred();
  const mod = loadModule('services/useMatchLocation.ts', name => name === 'react' ? h.hooks : {
    currentCoordinates: () => { calls++; return nextJob.promise; },
  });

  // First entry: loading = true until first GPS fix
  let state = h.render(() => mod.useMatchLocation(true));
  assert.equal(state.loading, true);
  await tick();
  assert.equal(calls, 1);
  nextJob.resolve(nextFix);
  await tick();
  state = h.render(() => mod.useMatchLocation(true));
  assert.equal(state.loading, false);
  const firstCoordsRef = state.coordinates;
  assert.equal(firstCoordsRef.latitude, 10.77);

  // Leave and re-enter Match: loading stays FALSE, refreshes silently in background
  h.render(() => mod.useMatchLocation(false));
  nextJob = deferred();
  state = h.render(() => mod.useMatchLocation(true));
  assert.equal(state.loading, false, 're-entry with cached GPS must not show loading screen');
  assert.equal(state.coordinates, firstCoordsRef);
  await tick();
  assert.equal(calls, 2);

  // Tiny GPS drift (<50m) preserves exact object reference so Match filters do not thrash
  nextJob.resolve({ latitude: 10.77005, longitude: 106.70005 });
  await tick();
  state = h.render(() => mod.useMatchLocation(true));
  assert.equal(state.coordinates, firstCoordsRef, 'stationary GPS jitter must preserve reference');

  // Real movement (>50m) updates coordinates
  h.render(() => mod.useMatchLocation(false));
  nextJob = deferred();
  h.render(() => mod.useMatchLocation(true));
  await tick();
  nextJob.resolve({ latitude: 10.78, longitude: 106.71 });
  await tick();
  state = h.render(() => mod.useMatchLocation(true));
  assert.equal(state.coordinates.latitude, 10.78);
  h.unmount();
});

test('parseGoMateQr decodes attendance QR tokens, group join QR codes and activity links', () => {
  const qr = loadModule('services/qrCode.ts', {});
  const payload = Buffer.from(JSON.stringify({ a: 'act-123', i: 'host-1', e: Date.now() + 120000, n: 'abc' })).toString('base64url');
  const token = `GMQR1.${payload}.sig123`;
  const parsedAtt = qr.parseGoMateQr(token);
  assert.equal(parsedAtt.kind, 'attendance');
  assert.equal(parsedAtt.activityId, 'act-123');
  assert.equal(parsedAtt.token, token);

  const joinPayload = qr.buildGroupJoinQr('act-456');
  const parsedJoin = qr.parseGoMateQr(joinPayload);
  assert.equal(parsedJoin.kind, 'join');
  assert.equal(parsedJoin.activityId, 'act-456');

  const parsedLink = qr.parseGoMateQr('https://gomate.local/#/app/home/activityDetail/act-789');
  assert.equal(parsedLink.kind, 'join');
  assert.equal(parsedLink.activityId, 'act-789');

  assert.equal(qr.parseGoMateQr('random-text'), null);
});

