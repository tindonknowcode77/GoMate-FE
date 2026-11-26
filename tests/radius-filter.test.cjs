const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name] ?? {}, URLSearchParams, Date, Error });
  return exports;
}
const filters = load('services/filterService.ts');
const geo = load('services/geoDistance.ts');
const point = { latitude: 10.77, longitude: 106.7 };
const draft = { province: 'TP. Hồ Chí Minh', district: 'Tất cả', ward: '', distance: 10, radiusEnabled: true, sort: 'recommended', coordinates: point, organizerType: 'all', categories: [], availableDays: [], timePeriods: [], minBudget: 0, maxBudget: 2000000, minimumCapacity: 0, maximumCapacity: 0, preferences: { genders: [], languages: [], religions: [], alcohol: 'any', dressCode: '' } };

test('finite radius sends searcher GPS, distance and selected activity region in the same query', () => {
  const query = new URLSearchParams(filters.activityQuery({ ...draft, distance: 7, district: 'Quận 1', ward: 'Bến Nghé' }));
  assert.equal(query.get('lat'), '10.77'); assert.equal(query.get('lng'), '106.7'); assert.equal(query.get('distanceKm'), '7');
  assert.equal(query.get('province'), draft.province); assert.equal(query.get('district'), 'Quận 1'); assert.equal(query.get('ward'), 'Bến Nghé');
  assert.equal(query.has('hostId'), false);
});
test('50 km+ keeps province/district/ward and removes only the geographic cap', () => {
  const query = new URLSearchParams(filters.activityQuery({ ...draft, distance: 50, district: 'Quận 1', ward: 'Bến Nghé' }));
  assert.equal(query.has('distanceKm'), false); assert.equal(query.has('lat'), false);
  assert.equal(query.get('province'), draft.province); assert.equal(query.get('district'), 'Quận 1'); assert.equal(query.get('ward'), 'Bến Nghé');
  const nearest = new URLSearchParams(filters.activityQuery({ ...draft, distance: 50, sort: 'nearest' }));
  assert.equal(nearest.get('lat'), '10.77'); assert.equal(nearest.has('distanceKm'), false);
  assert.equal(filters.requiresSearchPoint({ ...draft, distance: 50 }), false);
  assert.equal(filters.requiresSearchPoint({ ...draft, distance: 49 }), true);
});
test('radius checks exact numeric distance, including zero, boundary and missing coordinates', () => {
  const radius = { distance: 1, radiusEnabled: true };
  for (const distanceKm of [0, 0.99, 1]) assert.equal(filters.withinSearchRadius({ distanceKm }, radius), true);
  for (const distanceKm of [null, undefined, NaN, Infinity, -1, 1.004]) assert.equal(filters.withinSearchRadius({ distanceKm }, radius), false);
  assert.equal((1.004).toFixed(1), '1.0', 'formatted display distance cannot safely filter results');
  assert.equal(filters.withinSearchRadius({ distanceKm: 70 }, { ...radius, distance: 50 }), true);
});
test('legacy disabled/large radius settings map to 50 km+ and the slider is bounded', () => {
  assert.equal(filters.normalizeSearchRadius({ distance: 200, radiusEnabled: true }).distance, 50);
  assert.equal(filters.normalizeSearchRadius({ distance: 10, radiusEnabled: false }).distance, 50);
  assert.equal(filters.normalizeSearchRadius({ distance: -5, radiusEnabled: true }).distance, 1);
  assert.equal(filters.normalizeSearchRadius({ distance: 7.4, radiusEnabled: true }).distance, 7);
});
test('distance labels use event pin rather than any host or profile coordinates', () => {
  const api = load('services/activityApi.ts', { './geoDistance': geo, './profileService': { imageUrl: url => url } });
  const event = { id: 'event', hostId: 'far-host', hostName: 'Host', hostCoordinates: { latitude: 21.03, longitude: 105.84 }, coordinates: { type: 'Point', coordinates: [106.7, 10.7789] }, startsAt: '2099-01-05T12:00:00Z', estimatedCost: 0, category: 'Ăn uống', memberCount: 1, maxParticipants: 5 };
  const result = api.toActivity(event, undefined, point);
  assert.ok(result.distanceKm > 0.98 && result.distanceKm < 1);
  assert.equal(result.distance, '1.0 km');
  assert.equal(api.toActivity({ ...event, distanceKm: 1.004 }, undefined, point).distanceKm, 1.004, 'preserve server precision');
  assert.equal(api.toActivity({ ...event, coordinates: null }, undefined, point).distanceKm, null);
  assert.equal(geo.distanceBetweenKm(point, point), 0);
});

test('filter slider updates/apply directly at 1–49 and 50+, without a selector or separate toggle', () => {
  const slots = []; let cursor = 0, applied;
  const hooks = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; }, useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; } };
  const native = { StyleSheet: { create: styles => styles }, ...Object.fromEntries(['Pressable', 'ScrollView', 'View'].map(name => [name, name])) };
  const jsx = (type, props) => ({ type, props });
  const screen = load('screens/FilterScreen.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    '@react-native-community/slider': { __esModule: true, default: 'Slider' }, '../services/filterService': filters,
    '../components/LocalizedText': { Text: 'Text' }, '../components/ActivityChoices': { emptyPreferences: draft.preferences },
    '../data/activityOptions': { activityCategories: [] }, '../theme': { colors: {}, control: {}, layout: {}, radii: {} },
  });
  const render = () => { cursor = 0; return screen.FilterSheet({ initialFilters: draft, onApply: value => { applied = value; }, onClose() {} }); };
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  let tree = flatten(render()), slider = tree.find(node => node.type === 'Slider');
  assert.equal(slider.props.minimumValue, 1); assert.equal(slider.props.maximumValue, 50); assert.equal(slider.props.step, 1);
  assert.equal(tree.some(node => node.type === 'Switch'), false);
  slider.props.onSlidingStart(); tree = flatten(render()); assert.equal(tree.find(node => node.type === 'ScrollView').props.scrollEnabled, false);
  slider.props.onValueChange(7); tree = flatten(render()); assert.equal(tree.find(node => node.type === 'Slider').props.value, 7);
  tree.find(node => node.type === 'Pressable' && typeof node.props.style === 'function' && node.props.disabled === false).props.onPress();
  assert.equal(applied.distance, 7); assert.equal(applied.radiusEnabled, true);
  slider.props.onValueChange(50); slider.props.onSlidingComplete(); tree = flatten(render());
  tree.find(node => node.type === 'Pressable' && typeof node.props.style === 'function' && node.props.disabled === false).props.onPress();
  assert.equal(applied.distance, 50); assert.equal(applied.radiusEnabled, false); assert.equal(applied.province, draft.province);
  assert.equal(tree.find(node => node.type === 'ScrollView').props.scrollEnabled, true);
});
