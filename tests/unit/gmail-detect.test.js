import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.chrome = { cookies: { get: async () => ({}) } };
const api = await import('../../src/providers/gmail/api.js');

const ENTRY = '<entry><title>Hi</title><summary>s</summary><link rel="alternate" href="https://mail.google.com/x"/><modified>2026-10-22T12:00:00Z</modified><id>tag:gmail.google.com,2004:1</id><author><name>N</name><email>n@x.y</email></author></entry>';
const feedFor = (email, n) => `<feed><title>Gmail - Inbox for ${email}</title><fullcount>${n}</fullcount>${n > 0 ? ENTRY : ''}</feed>`;
const respond = (body, { redirectedTo } = {}) => ({ ok: true, status: 200, redirected: !!redirectedTo, url: redirectedTo || 'https://mail.google.com/mail/u/0/feed/atom', headers: { get: () => null }, text: async () => body });

test('gaps are skipped and a repeated address ends the scan', async () => {
  const feeds = { 0: feedFor('a@gmail.com', 3), 1: '', 2: feedFor('b@gmail.com', 7), 3: feedFor('c@gmail.com', 1) };
  globalThis.fetch = async (url) => {
    const n = +String(url).match(/\/u\/(\d+)\//)[1];
    if (feeds[n] !== undefined) return respond(feeds[n]);
    return respond(feeds[0], { redirectedTo: 'https://mail.google.com/mail/u/0/feed/atom' }); // index past the end: default account again
  };
  const accounts = await api.detectAccounts();
  assert.deepEqual(accounts.map((a) => [a.email, a.index]), [['a@gmail.com', 0], ['b@gmail.com', 2], ['c@gmail.com', 3]]);
});

test('redirect to the Google sign-in page means signed out', async () => {
  globalThis.fetch = async () => respond('<html>sign in</html>', { redirectedTo: 'https://accounts.google.com/ServiceLogin' });
  await assert.rejects(api.detectAccounts(), (e) => e.constructor.name === 'SignedOutError');
});

test('listUnread signals shifted indexes', async () => {
  globalThis.fetch = async () => respond(feedFor('someone-else@gmail.com', 1));
  await assert.rejects(api.listUnread({ index: 1, email: 'b@gmail.com' }), (e) => e.constructor.name === 'AccountsChangedError');
});

test('shifted index is resolved with authuser instead of re-probing', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    if (String(url).includes('/u/1/')) return respond(feedFor('other@gmail.com', 1));            // index 1 is now someone else
    if (String(url).includes('authuser=')) return respond(feedFor('b@gmail.com', 7), { redirectedTo: 'https://mail.google.com/mail/u/0/feed/atom' });
    return respond('');
  };
  const r = await api.listUnread({ index: 1, email: 'b@gmail.com' });
  assert.equal(r.total, 7);
  assert.deepEqual(r.account, { index: 0 });
  assert.ok(urls.some((u) => u.includes('authuser=b%40gmail.com')), 'the address is URL-encoded');
});

test('an address that is no longer signed in is never answered with another account', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('authuser=')) return respond(feedFor('default@gmail.com', 5), { redirectedTo: 'https://mail.google.com/mail/u/0/feed/atom' });
    return respond(feedFor('someone-else@gmail.com', 1));
  };
  await assert.rejects(api.listUnread({ index: 2, email: 'gone@gmail.com' }), (e) => e.constructor.name === 'AccountsChangedError');
});

test('open URLs address the account by encoded e-mail', () => {
  assert.equal(api.openUrl({ email: 'a+b@gmail.com', index: 3 }), 'https://mail.google.com/mail/?authuser=a%2Bb%40gmail.com#inbox');
  assert.equal(api.openUrl({ email: 'x@gmail.com' }, { link: 'https://mail.google.com/mail?message_id=1' }), 'https://mail.google.com/mail?message_id=1');
});

test('an index that became empty is also resolved through authuser', async () => {
  globalThis.fetch = async (url) => String(url).includes('authuser=')
    ? respond(feedFor('b@gmail.com', 4), { redirectedTo: 'https://mail.google.com/mail/u/3/feed/atom' })
    : respond('');
  const r = await api.listUnread({ index: 1, email: 'b@gmail.com' });
  assert.deepEqual([r.total, r.account], [4, { index: 3 }]);
});
