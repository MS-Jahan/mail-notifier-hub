import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerForUrl } from '../../src/core/registry.js';
import { allowTabScan, TAB_SCAN_GAP_MS } from '../../src/core/policy.js';

const fake = {
  a: { id: 'a', hosts: ['https://mail.a.com/*'] },
  b: { id: 'b', hosts: ['https://mail.b.eu/*', 'https://mail.b.com/*'] }
};

test('a URL maps to the provider that owns its host', () => {
  assert.equal(providerForUrl('https://mail.a.com/inbox?x=1', fake).id, 'a');
  assert.equal(providerForUrl('https://mail.b.com/u/1/', fake).id, 'b');
});
test('other hosts, lookalikes and non-https URLs do not match', () => {
  assert.equal(providerForUrl('https://evil-mail.a.com/', fake), null);
  assert.equal(providerForUrl('https://mail.a.com.evil.net/', fake), null);
  assert.equal(providerForUrl('http://mail.a.com/', fake), null);
  assert.equal(providerForUrl('chrome://extensions', fake), null);
  assert.equal(providerForUrl('not a url', fake), null);
});
test('the real registry knows the three providers', async () => {
  const { providerForUrl: real } = await import('../../src/core/registry.js');
  assert.equal(real('https://mail.google.com/mail/u/2/#inbox').id, 'gmail');
  assert.equal(real('https://mail.proton.me/u/1/inbox').id, 'proton');
  assert.equal(real('https://mail.zoho.eu/zm/#mail').id, 'zoho');
  assert.equal(real('https://www.google.com/'), null);
});
test('tab scans are throttled per provider', () => {
  const now = 10 * TAB_SCAN_GAP_MS;
  assert.equal(allowTabScan({ now, lastScanAt: now - 1000 }), false);
  assert.equal(allowTabScan({ now, lastScanAt: now - TAB_SCAN_GAP_MS }), true);
  assert.equal(allowTabScan({ now, lastScanAt: undefined }), true);
});
