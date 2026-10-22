import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal chrome.* + fetch fakes
globalThis.chrome = { cookies: { get: async () => ({ value: 'csrfval' }), getAll: async () => [{}] } };
const respond = (body, init = {}) => ({ ok: true, status: 200, redirected: false, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), ...init });
const api = await import('../../src/providers/zoho/api.js');

test('getAccounts maps mailAccounts.do and sends CSRF header', async () => {
  let seen;
  globalThis.fetch = async (url, opts) => { seen = { url, opts }; return respond([1, { accounts: [{ id: 1, email: 'a@b.c', displayName: 'A', isDefault: true }] }]); };
  const accts = await api.getAccounts('com');
  assert.deepEqual(accts, [{ id: '1', email: 'a@b.c', name: 'A', isDefault: true }]);
  assert.equal(seen.opts.headers['X-ZCSRF-TOKEN'], 'zmrcsr=csrfval');
  assert.equal(seen.url, 'https://mail.zoho.com/zm/mailAccounts.do');
});

test('listUnread parses rows, decodes entities, reads unCnt', async () => {
  globalThis.fetch = async () => respond([0, [
    { M: '1', FD: '9', SN: 'Bob', F: 'bob@x.y', SB: 'Tom &amp; Jerry', SM: 'hi &lt;you&gt;', LTIME: '1700000000000', S1: 'unread' },
    { M: '2', S1: 'read', LTIME: '1' },
    { showNextPage: 1, unCnt: '3289' }
  ]]);
  const r = await api.listUnread('eu', '5', '9');
  assert.equal(r.total, 3289);
  assert.equal(r.messages.length, 1);
  assert.deepEqual([r.messages[0].subject, r.messages[0].summary, r.messages[0].time], ['Tom & Jerry', 'hi <you>', 1700000000000]);
});

test('schema change and signed-out are distinguished', async () => {
  globalThis.fetch = async () => respond([0, [{ nothing: true }]]);
  await assert.rejects(api.listUnread('com', '1', '2'), api.SchemaChangedError);
  globalThis.fetch = async () => respond(null, { status: 403, ok: false });
  await assert.rejects(api.listUnread('com', '1', '2'), api.SignedOutError);
  globalThis.fetch = async () => ({ ok: true, status: 200, redirected: false, json: async () => { throw new Error('html'); } });
  await assert.rejects(api.listUnread('com', '1', '2'), api.SignedOutError);
});

test('getInboxFolderId extracts the Inbox id from /zm/ HTML', async () => {
  globalThis.fetch = async () => respond('x"folTree":[{"123456789012345678":{"VW":true,"SE":6,"SN":"Spam"},"987654321098765432":{"VW":true,"E":0,"SE":1,"SN":"Inbox"}}]');
  assert.equal(await api.getInboxFolderId('com'), '987654321098765432');
});
