const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function location(overrides = {}, platform = 'android', timers = {}) {
  const calls = [];
  const sdk = {
    Accuracy: { Balanced: 3, High: 4 },
    requestForegroundPermissionsAsync: async () => ({ granted: true }),
    hasServicesEnabledAsync: async () => true,
    getLastKnownPositionAsync: async options => { calls.push(['cached', options]); return null; },
    getCurrentPositionAsync: async options => { calls.push(['current', options]); return { coords: { latitude: 10.7769, longitude: 106.7009 } }; },
    ...overrides,
  };
  const source = readFileSync(join(__dirname, '../src/services/locationService.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === 'expo-location' ? sdk : { Platform: { OS: platform } }, setTimeout, clearTimeout, ...timers });
  return { ...exports, calls };
}

test('denied permission and disabled services stop before requesting a fix', async () => {
  const denied = location({ requestForegroundPermissionsAsync: async () => ({ granted: false }) });
  await assert.rejects(denied.currentCoordinates(), /cấp quyền/);
  assert.equal(denied.calls.length, 0);
  const disabled = location({ hasServicesEnabledAsync: async () => false });
  await assert.rejects(disabled.currentCoordinates(), /đang tắt/);
  assert.equal(disabled.calls.length, 0);
});

test('recent bounded cached coordinates avoid waiting for another GPS fix', async () => {
  const api = location({ getLastKnownPositionAsync: async options => {
    assert.equal(options.maxAge, 60000); assert.equal(options.requiredAccuracy, 200);
    return { coords: { latitude: 10.77, longitude: 106.7 } };
  } });
  const result = await api.currentCoordinates();
  assert.equal(result.latitude, 10.77); assert.equal(result.longitude, 106.7);
  assert.equal(api.calls.length, 0);
});

test('Android requests GPS-capable accuracy after a missing/unsupported cached fix', async () => {
  const api = location({ getLastKnownPositionAsync: async () => { throw new Error('Unavailable'); } });
  assert.equal((await api.currentCoordinates()).latitude, 10.7769);
  assert.equal(api.calls[0][1].accuracy, 4);
  assert.equal(api.calls[0][1].mayShowUserSettingsDialog, true);
  const web = location({}, 'web');
  await web.currentCoordinates(); assert.equal(web.calls[1][1].accuracy, 3);
});

test('a missing fix times out with emulator instructions and clears the timer', async () => {
  let cleared = false;
  const api = location({ getCurrentPositionAsync: () => new Promise(() => {}) }, 'android', {
    setTimeout(callback, delay) { assert.equal(delay, 12000); queueMicrotask(callback); return 42; },
    clearTimeout(id) { assert.equal(id, 42); cleared = true; },
  });
  await assert.rejects(api.currentCoordinates(), /Set location/);
  assert.equal(cleared, true);
});

test('invalid fixes and provider failures produce an actionable error', async () => {
  for (const fix of [null, { coords: { latitude: 91, longitude: 0 } }]) {
    const api = location({ getCurrentPositionAsync: async () => { if (!fix) throw new Error('Provider unavailable'); return fix; } });
    await assert.rejects(api.currentCoordinates(), /chọn trên bản đồ/);
  }
});
