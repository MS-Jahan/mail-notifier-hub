import { test } from 'node:test';
import assert from 'node:assert/strict';

let cookies = [{ name: 'AUTH-uid123' }, { name: 'Session-Id' }];
globalThis.chrome = { cookies: { getAll: async () => cookies } };
const res = (body, init = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body, ...init });
const api = await import('../../src/providers/proton/api.js');

test('session uids come from AUTH-<uid> cookies only', async () => {
  assert.deepEqual(await api.getSessionUids(), ['uid123']);
  assert.equal(await api.hasSession(), true);
  cookies = [{ name: 'Session-Id' }];
  assert.equal(await api.hasSession(), false);
  cookies = [{ name: 'AUTH-uid123' }];
});

test('listUnread sends uid + app version and maps messages', async () => {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), headers: opts?.headers });
    if (String(url).includes('version.json')) return res({ branch: 'proton-mail@9.9.9' });
    if (String(url).includes('messages/count')) return res({ Code: 1000, Counts: [{ LabelID: '0', Total: 5, Unread: 2 }] });
    return res({ Code: 1000, Messages: [{ ID: 'm1', Subject: 'Hi', Sender: { Name: 'Ann', Address: 'a@b.c' }, Time: 1700000000 }] });
  };
  const r = await api.listUnread('uid123', 10);
  assert.equal(r.total, 2);
  assert.deepEqual(r.messages[0], { id: 'm1', from: 'Ann', fromAddress: 'a@b.c', subject: 'Hi', summary: '', time: 1700000000000 });
  const api1 = calls.find((c) => c.url.includes('messages/count'));
  assert.equal(api1.headers['x-pm-uid'], 'uid123');
  assert.equal(api1.headers['x-pm-appversion'], 'web-mail@9.9.9');
  assert.ok(calls.find((c) => c.url.includes('Unread=1') && c.url.includes('LabelID=0') && c.url.includes('PageSize=10')));
});

test('no list request when nothing is unread', async () => {
  let listCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('version.json')) return res({});
    if (String(url).includes('messages/count')) return res({ Counts: [{ LabelID: '0', Unread: 0 }] });
    listCalls++; return res({ Messages: [] });
  };
  const r = await api.listUnread('uid123');
  assert.equal(r.total, 0); assert.equal(listCalls, 0);
});

test('errors are classified', async () => {
  globalThis.fetch = async () => res({}, { ok: false, status: 401 });
  await assert.rejects(api.listUnread('u'), api.SignedOutError);
  globalThis.fetch = async () => res({}, { ok: false, status: 429, headers: { get: () => '90' } });
  await assert.rejects(api.listUnread('u'), (e) => e instanceof api.RateLimitError && e.retryAfterSec === 90);
  globalThis.fetch = async (url) => String(url).includes('version') ? res({}) : res({ Code: 1000, Counts: [] });
  await assert.rejects(api.listUnread('u'), api.SchemaChangedError);
});

test('writes fail if any per-item response is not 1000', async () => {
  globalThis.fetch = async (url) => String(url).includes('version') ? res({}) : res({ Code: 1001, Responses: [{ ID: 'm1', Response: { Code: 2501 } }] });
  await assert.rejects(api.markRead('u', 'm1'), /rejected/);
  globalThis.fetch = async (url) => String(url).includes('version') ? res({}) : res({ Code: 1001, Responses: [{ ID: 'm1', Response: { Code: 1000 } }] });
  await api.archive('u', 'm1');
});

test('several signed-in accounts are identified by core/v4/users, not by the cookie uid', async () => {
  cookies = [{ name: 'AUTH-cookieA' }, { name: 'AUTH-cookieB' }, { name: 'Session-Id' }];
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('version.json')) return res({});
    calls.push(u.split('/api/')[1]);
    if (u.includes('sessions/local')) return res({ Code: 1000, Sessions: [{ UID: 'x1', LocalID: 1, Username: 'ann' }, { UID: 'x2', LocalID: 2, Username: 'bob' }] });
    const who = opts.headers['x-pm-uid'] === 'cookieA' ? { Name: 'ann', Email: 'ann@proton.me', DisplayName: 'Ann' } : { Name: 'bob', Email: 'bob@proton.me', DisplayName: 'bob' };
    return res({ Code: 1000, User: who });
  };
  const accounts = await api.getAccounts();
  assert.deepEqual(accounts.map((a) => [a.uid, a.localId, a.email]), [['cookieA', 1, 'ann@proton.me'], ['cookieB', 2, 'bob@proton.me']]);
  assert.equal(calls.filter((c) => c.includes('sessions/local')).length, 1);
});

test('the /u/<n>/ link is resolved when opened and falls back to the cached slot', async () => {
  cookies = [{ name: 'AUTH-cookieA' }];
  globalThis.fetch = async (url) => String(url).includes('version.json') ? res({}) : res({ Code: 1000, Sessions: [{ UID: 'x', LocalID: 5, Username: 'ann' }] });
  assert.equal(await api.resolveOpenUrl({ uid: 'cookieA', username: 'ann', localId: 1 }), 'https://mail.proton.me/u/5/inbox');
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await api.resolveOpenUrl({ uid: 'cookieA', username: 'ann', localId: 1 }), 'https://mail.proton.me/u/1/inbox');
});
