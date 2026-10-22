import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeProviderUrl } from '../../src/core/url.js';

const provider = { hosts: ['https://mail.example.com/*', 'https://mail.example.eu/*'] };

test('only https URLs on the provider hosts are allowed', () => {
  assert.equal(isSafeProviderUrl('https://mail.example.com/u/1/inbox?x=1#a', provider), true);
  assert.equal(isSafeProviderUrl('https://mail.example.eu/', provider), true);
});
test('everything else is refused', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'http://mail.example.com/', 'https://mail.example.com.evil.net/',
    'https://evil.net/mail.example.com/', 'https://user:pw@mail.example.com/', 'https://mail.example.com@evil.net/', 'file:///etc/passwd', '', 'nonsense'])
    assert.equal(isSafeProviderUrl(bad, provider), false, bad);
});
