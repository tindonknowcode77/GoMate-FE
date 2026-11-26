const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requireModule) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(join(__dirname, '../src/services', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule, setTimeout, clearTimeout, Error });
  return exports;
}

// Execute queued state updaters during render, twice, as React may do in development.
function harness() {
  const slots = []; let cursor = 0, effects = [], rendering = false;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial, queue: [] };
        slot.set = next => slot.queue.push(next); slots[index] = slot;
      }
      const slot = slots[index];
      for (const next of slot.queue.splice(0)) {
        if (typeof next === 'function') { next(slot.value); slot.value = next(slot.value); }
        else slot.value = next;
      }
      return [slot.value, slot.set];
    },
    useRef(value) { const index = cursor++; slots[index] ??= { current: value }; return slots[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { callback, deps }; return slots[index].callback; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect(), effect }; });
      }
    },
  };
  return {
    hooks,
    get rendering() { return rendering; },
    render(callback) { cursor = 0; effects = []; rendering = true; try { return callback(); } finally { rendering = false; } },
    commit() { effects.splice(0).forEach(effect => effect()); },
    replayEffects() { for (const slot of slots) if (slot.effect) { slot.cleanup?.(); slot.cleanup = slot.effect(); } },
    unmount() { for (const slot of slots) slot.cleanup?.(); },
  };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('feedback dispatch happens after commit, once even when React replays updaters/effects', () => {
  const h = harness(), api = load('feedback.ts', () => h.hooks), messages = [];
  api.subscribeFeedback(payload => { assert.equal(h.rendering, false, 'AppFeedback must not update during another render'); messages.push(payload); });
  const render = () => h.render(() => api.useFeedbackState(''));
  let state = render(); h.commit();
  state[1]('Network unavailable'); assert.equal(messages.length, 0);
  state = render(); assert.equal(messages.length, 0); assert.equal(state[0], 'Network unavailable');
  h.commit(); h.replayEffects(); assert.equal(messages.length, 1);
  state[1](previous => previous); render(); h.commit(); assert.equal(messages.length, 2, 'repeated user errors remain visible');
  state[1](''); render(); h.commit(); assert.equal(messages.length, 2);
  h.unmount(); state[1]('Late error'); render(); h.commit(); assert.equal(messages.length, 2);
});

test('profile feedback retains its action and functional updates remain pure', () => {
  const h = harness(), api = load('feedback.ts', () => h.hooks); let payload, redirected = false;
  api.setProfileRedirectHandler(() => { redirected = true; }); api.subscribeFeedback(value => { payload = value; });
  const render = () => h.render(() => api.useFeedbackState(undefined));
  const [, set] = render(); h.commit(); set(() => 'Hồ sơ chưa đủ thông tin');
  render(); assert.equal(payload, undefined); h.commit(); payload.onAction(); assert.equal(redirected, true);
});

test('Match automatically requests GPS on entry, shares a pending fix and refreshes on later entry', async () => {
  const h = harness(), job = deferred(); let calls = 0;
  const api = load('useMatchLocation.ts', name => name === 'react' ? h.hooks : { currentCoordinates: () => { calls++; return job.promise; } });
  const render = enabled => { const result = h.render(() => api.useMatchLocation(enabled)); h.commit(); return result; };
  render(false); await tick(); assert.equal(calls, 0);
  assert.equal(render(true).loading, true); h.replayEffects(); await tick(); assert.equal(calls, 1);
  render(false); render(true); await tick(); assert.equal(calls, 1);
  job.resolve({ latitude: 10.77, longitude: 106.7 }); await tick();
  const result = render(true); assert.equal(result.loading, false); assert.equal(result.coordinates.latitude, 10.77);
  render(false); render(true); await tick(); assert.equal(calls, 2);
  h.unmount();
});

test('GPS failure resolves loading with an actionable error and no feedback modal', async () => {
  const h = harness();
  const api = load('useMatchLocation.ts', name => name === 'react' ? h.hooks : { currentCoordinates: async () => { throw new Error('Bật dịch vụ vị trí'); } });
  const render = () => { const result = h.render(() => api.useMatchLocation(true)); h.commit(); return result; };
  render(); await tick(); const result = render();
  assert.equal(result.loading, false); assert.equal(result.coordinates, null); assert.match(result.error, /dịch vụ/);
  h.unmount();
});
