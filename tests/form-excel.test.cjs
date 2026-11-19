const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const Excel = require('exceljs');
const source = resolve(__dirname, '../src/gomate-portal/formExcel.js');
const compiled = ts.transpileModule(readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(source), loaded, loaded.exports);
const { createFormWorkbook, readFormWorkbook, sampleData, mergeExcelGroups, schemas } = loaded.exports;
async function workbook(kind) { const b = new Excel.Workbook(); await b.xlsx.load(await createFormWorkbook(kind)); return b; }
const read = (kind, book, options) => book.xlsx.writeBuffer().then(buffer => readFormWorkbook(kind, buffer, options));
const cell = (book, key) => book.getWorksheet('DoanhNghiep').getCell(`C${Object.keys(schemas.verification.fields).indexOf(key) + 2}`);

test('Excel auto-linked emails/URLs and rich text import as displayed text', async () => {
  const b = await workbook('verification');
  cell(b, 'representativeEmail').value = { text: 'person@example.com', hyperlink: 'mailto:person@example.com' };
  cell(b, 'website').value = { text: 'https://example.com', hyperlink: 'https://example.com' };
  cell(b, 'company').value = { richText: [{ font: { bold: true }, text: 'Test ' }, { text: 'Company' }] };
  const result = await read('verification', b);
  assert.equal(result.application.representativeEmail, 'person@example.com');
  assert.equal(result.application.website, 'https://example.com');
  assert.equal(result.application.company, 'Test Company');
  assert.equal(result.application.representativePhone, '0901234567');
  assert.ok(!result.issues.some(item => ['C4', 'C5', 'C12'].includes(item.cell)));
});

test('several invalid/blank cells are skipped with exact coordinates; valid fields survive', async () => {
  const b = await workbook('verification');
  cell(b, 'company').value = { formula: '1+1', result: 2 };
  cell(b, 'website').value = 'javascript:alert(1)';
  cell(b, 'representativeEmail').value = 'bad-email';
  cell(b, 'representativePhone').value = '';
  const result = await read('verification', b);
  for (const key of ['company', 'website', 'representativeEmail', 'representativePhone']) assert.ok(!Object.hasOwn(result.application, key));
  assert.equal(result.application.certificateNumber, 'DEMO-GOMATE-001');
  for (const address of ['C4', 'C5', 'C12', 'C13']) assert.ok(result.issues.some(item => item.sheet === 'DoanhNghiep' && item.cell === address && item.field && item.message));
  assert.match(result.issues.find(item => item.cell === 'C4').message, /công thức/);
});

test('duplicate/missing fields, Excel errors and dates do not discard unrelated values', async () => {
  const b = await workbook('verification');
  cell(b, 'company').value = { error: '#VALUE!' };
  cell(b, 'representativeTitle').value = new Date();
  cell(b, 'representativeTitle').numFmt = 'yyyy-mm-dd';
  b.getWorksheet('DoanhNghiep').addRow(['certificateNumber', '', 'OTHER-001']);
  b.getWorksheet('DoanhNghiep').getCell('A6').value = 'unknown';
  const result = await read('verification', b);
  assert.ok(!Object.hasOwn(result.application, 'company'));
  assert.ok(!Object.hasOwn(result.application, 'representativeTitle'));
  assert.ok(!Object.hasOwn(result.application, 'certificateNumber'));
  assert.ok(!Object.hasOwn(result.application, 'category'));
  assert.equal(result.application.representativePhone, '0901234567');
  assert.ok(result.issues.some(item => item.message.includes('#VALUE!')));
  assert.ok(result.issues.some(item => item.message.includes('bị lặp')));
  assert.ok(result.issues.some(item => item.message.includes('Thiếu dòng category')));
});

test('locked identity and bad document sheets leave other fields/documents importable', async () => {
  const b = await workbook('verification');
  const image = b.addImage({ buffer: Buffer.from('unsupported image'), extension: 'gif' });
  b.getWorksheet('GiayPhep').addImage(image, 'A2:B3');
  const result = await read('verification', b, { identity: { accountType: 'business', country: 'VN', certificateNumber: 'LOCKED-001' } });
  assert.ok(!Object.hasOwn(result.application, 'certificateNumber'));
  assert.equal(result.application.company, sampleData('verification').company);
  assert.equal(result.documents[0], null);
  assert.ok(result.issues.some(item => item.cell === 'C8' && item.message.includes('đã khóa')));
  assert.ok(result.issues.some(item => item.sheet === 'GiayPhep'));
});

test('coordinates import together, while numeric zero remains valid', async () => {
  const b = await workbook('location'), sheet = b.getWorksheet('DiaDiem');
  sheet.getCell('C6').value = 0; sheet.getCell('C7').value = 0;
  let result = await read('location', b);
  assert.equal(result.latitude, 0); assert.equal(result.longitude, 0);
  sheet.getCell('C7').value = 999;
  result = await read('location', b);
  assert.ok(!Object.hasOwn(result, 'latitude')); assert.ok(!Object.hasOwn(result, 'longitude'));
  assert.ok(result.name); assert.ok(result.issues.some(item => item.cell === 'C7'));
});

test('partial groups retain the matching draft fields, rows and extra groups', async () => {
  const b = await workbook('post'), groupSheet = b.getWorksheet('Nhom');
  b.getWorksheet('BaiDang').getCell('C2').value = { formula: '1+1', result: 2 };
  groupSheet.getCell('A2').value = 'Changed group';
  groupSheet.getCell('H2').value = 'not a capacity';
  groupSheet.getCell('J2').value = 999999;
  groupSheet.getCell('F3').value = '2026-02-30T09:00';
  const result = await read('post', b);
  assert.equal(result.groupsComplete, false);
  assert.ok(!Object.hasOwn(result.promo, 'title')); assert.ok(result.promo.copy);
  const current = Array.from({ length: 3 }, (_, index) => ({ ...sampleData('post').groups[0], id: `draft-${index}`, locationId: 'saved-location' }));
  const merged = mergeExcelGroups(current, result.groups, result.groupsComplete);
  assert.equal(merged.length, 3); assert.equal(merged[0].id, 'draft-0');
  assert.equal(merged[0].name, 'Changed group'); assert.equal(merged[0].maxParticipants, current[0].maxParticipants);
  assert.equal(merged[0].estimatedCost, current[0].estimatedCost); assert.equal(merged[0].depositAmount, current[0].depositAmount);
  assert.equal(merged[1].startsAt, current[1].startsAt); assert.equal(merged[1].endsAt, current[1].endsAt);
  assert.equal(merged[2], current[2]); assert.equal(current[0].locationId, 'saved-location');
  for (const address of ['H2', 'J2', 'F3']) assert.ok(result.issues.some(item => item.sheet === 'Nhom' && item.cell === address));
});

test('complete groups replace list; missing/bad group columns retain valid promo fields', async () => {
  const b = await workbook('post');
  let result = await read('post', b);
  assert.equal(result.groupsComplete, true);
  const merged = mergeExcelGroups([{ id: 'old' }, {}, {}], result.groups, true);
  assert.equal(merged.length, 2); assert.equal(merged[0].maxParticipants, 10);
  b.getWorksheet('Nhom').getCell('A1').value = 'wrong';
  result = await read('post', b);
  assert.equal(result.groupsComplete, false); assert.ok(!Object.hasOwn(result.groups[0], 'name'));
  assert.ok(result.issues.some(item => item.cell === 'A1')); assert.ok(result.promo.title);
  b.removeWorksheet('Nhom'); result = await read('post', b);
  assert.deepEqual(result.groups, []); assert.ok(result.promo.title);
});

test('wrong template/unreadable file stays a blocking error', async () => {
  await assert.rejects(read('verification', await workbook('location')), /cần sheet DoanhNghiep/);
  await assert.rejects(readFormWorkbook('verification', Buffer.from('not xlsx')), /Không đọc được Excel/);
});
