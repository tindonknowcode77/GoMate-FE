const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = readFileSync(require.resolve('../src/services/chatOutbox.ts'), 'utf8');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsForTest, Error });
const { createChatOutbox } = exportsForTest;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const ack = (row, id = '0001') => { const { delivery, deliveryError, ...sent } = row; return { ...sent, id }; };

test('a slow request displays the bubble synchronously and permits another send', async () => {
  const jobs = [], requests = [];
  const outbox = createChatOutbox('chat', 'me', row => { requests.push(row); const job = deferred(); jobs.push(job); return job.promise; });
  outbox.enqueue({ text: 'first' });
  assert.equal(outbox.getSnapshot()[0].text, 'first');
  assert.equal(outbox.getSnapshot()[0].delivery, 'sending');
  outbox.enqueue({ text: 'second' });
  assert.equal(outbox.getSnapshot().length, 2);
  assert.notEqual(requests[0].clientMessageId, requests[1].clientMessageId);
  jobs[1].resolve(ack(requests[1], '0002')); jobs[0].resolve(ack(requests[0])); await tick();
  assert.equal(outbox.getSnapshot().length, 2);
  assert.ok(outbox.getSnapshot().every(row => !row.delivery));
});

test('socket echo and REST/history acknowledgements replace the local bubble without duplicates', async () => {
  const job = deferred(); let request;
  const outbox = createChatOutbox('chat', 'me', row => { request = row; return job.promise; });
  outbox.enqueue({ text: 'hello' });
  outbox.merge([ack(request)]); job.resolve(ack(request)); await tick(); outbox.merge([ack(request)]);
  assert.equal(outbox.getSnapshot().length, 1);
  assert.equal(outbox.getSnapshot()[0].delivery, undefined);
  outbox.merge([{ ...ack(request, '0002'), senderId: 'other' }]);
  assert.equal(outbox.getSnapshot().length, 2, 'deduplication must be scoped to sender');
});

test('lost HTTP acknowledgement after a socket echo never marks a delivered message failed', async () => {
  const job = deferred(); let request;
  const outbox = createChatOutbox('chat', 'me', row => { request = row; return job.promise; });
  outbox.enqueue({ text: 'saved' }); outbox.merge([ack(request)]);
  job.reject(new Error('timeout')); await tick();
  assert.equal(outbox.getSnapshot()[0].delivery, undefined);
});

test('failed text, attachments and GPS stay on the bubble; retry reuses the id and ignores double taps', async () => {
  const requests = [], jobs = [];
  const outbox = createChatOutbox('chat', 'me', row => { requests.push(row); const job = deferred(); jobs.push(job); return job.promise; });
  outbox.enqueue({ text: 'photo', attachments: [{ id: 'file' }], location: { latitude: 10, longitude: 106, label: 'Here' } });
  jobs[0].reject(new Error('timeout')); await tick();
  const failed = outbox.getSnapshot()[0]; assert.equal(failed.delivery, 'failed');
  assert.equal(failed.deliveryError, 'timeout');
  outbox.retry(failed.clientMessageId); outbox.retry(failed.clientMessageId);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].clientMessageId, requests[0].clientMessageId);
  assert.equal(requests[1].attachments[0].id, 'file'); assert.equal(requests[1].location.latitude, 10);
  jobs[1].resolve(ack(requests[1])); await tick();
  assert.equal(outbox.getSnapshot().length, 1); assert.equal(outbox.getSnapshot()[0].delivery, undefined);
});

test('unconfirmed bubbles remain after server history; old conversation responses cannot enter the new store', async () => {
  const job = deferred(); let request;
  const first = createChatOutbox('first', 'me', row => { request = row; return job.promise; });
  const second = createChatOutbox('second', 'me', async row => ack(row));
  first.enqueue({ text: 'pending' }); first.merge([{ ...ack(request, 'ffff'), clientMessageId: 'history', text: 'old' }]);
  assert.equal(first.getSnapshot().at(-1).delivery, 'sending');
  job.resolve(ack(request)); await tick();
  assert.equal(second.getSnapshot().length, 0);
});

test('revoked access clears local bubbles and ignores late acknowledgements', async () => {
  const job = deferred(); let request;
  const outbox = createChatOutbox('chat', 'me', row => { request = row; return job.promise; });
  outbox.enqueue({ text: 'pending' }); outbox.setAccessible(false);
  job.resolve(ack(request)); await tick();
  assert.equal(outbox.getSnapshot().length, 0);
});
