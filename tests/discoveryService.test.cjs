const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('discovery encodes filters, zero budget, location and bearer token', async () => {
  const exports = {}, calls = [];
  const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/discoveryService.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let status = 200;
  vm.runInNewContext(code, { exports, URLSearchParams, process: { env: { EXPO_PUBLIC_API_BASE_URL: 'https://example.com/api' } },
    require: name => name.includes('authService') ? { getSession: () => ({ accessToken: 'token' }), ApiError: class extends Error { constructor(message, value) { super(message); this.status = value; } } } : 1,
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => status === 200 ? { items: [], hasMore: false, total: 0 } : { error: 'Expired' } }; },
  });
  const filters = { distance: 10, categories: ['Ăn uống'], budget: 'Miễn phí', days: [1, 7], fromHour: 18, toHour: 24 };
  const p = exports.searchParams(filters, ' coffee & tea ', 2);
  assert.equal(p.get('q'), 'coffee & tea'); assert.equal(p.get('maxCost'), '0'); assert.equal(p.has('distanceKm'), false);
  assert.equal(p.get('days'), '1,7'); assert.equal(p.get('fromHour'), '18');
  const geo = exports.searchParams(filters, '', 1, { latitude: 10.77, longitude: 106.7 });
  assert.equal(geo.get('lat'), '10.77'); assert.equal(geo.get('distanceKm'), '10');
  await exports.searchActivities(filters, '', 1, undefined, new AbortController().signal);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token');
  status = 401;
  await assert.rejects(exports.searchActivities(filters, '', 1, undefined, new AbortController().signal), error => error.status === 401);
});
