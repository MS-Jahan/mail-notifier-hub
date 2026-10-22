import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelOf, nextVersion } from '../../scripts/next-version.mjs';
import { notes } from '../../scripts/release-notes.mjs';

test('commit types map to bump levels', () => {
  assert.equal(levelOf('feat(gmail): add labels'), 'minor');
  assert.equal(levelOf('fix: stop double notification (#12)'), 'patch');
  assert.equal(levelOf('perf(core): cache ids'), 'patch');
  assert.equal(levelOf('feat!: new storage format'), 'major');
  assert.equal(levelOf('refactor(core): split poller\n\nBREAKING CHANGE: state shape changed'), 'major');
  for (const t of ['docs: x', 'chore: x', 'ci: x', 'test: x', 'refactor: x', 'style: x', 'build: x', 'Merge pull request #1', 'random message'])
    assert.equal(levelOf(t), null, t);
});
test('the highest level wins and the version is computed from the last tag', () => {
  assert.equal(nextVersion('v1.2.3', ['fix: a', 'docs: b']), '1.2.4');
  assert.equal(nextVersion('v1.2.3', ['fix: a', 'feat: b']), '1.3.0');
  assert.equal(nextVersion('v1.2.3', ['feat: b', 'fix!: c']), '2.0.0');
  assert.equal(nextVersion('v1.2.3', ['docs: only', 'chore: only']), null);
});
test('first release starts at 0.1.0 and breaking changes stay in 0.x', () => {
  assert.equal(nextVersion('', ['feat: first', 'fix: x']), '0.1.0');
  assert.equal(nextVersion('', ['fix: first']), '0.0.1');
  assert.equal(nextVersion('v0.4.2', ['feat!: break']), '0.5.0');
});
test('release notes group commits by type', () => {
  const out = notes(['feat(proton): archive button', 'fix(core): backoff reset', 'docs: readme', 'junk']);
  assert.match(out, /### Features\n- \*\*proton:\*\* archive button/);
  assert.match(out, /### Fixes\n- \*\*core:\*\* backoff reset/);
  assert.match(out, /### Documentation\n- readme/);
});

import { buildDiagnostics } from '../../src/core/diagnostics.js';
test('diagnostics contain no e-mail addresses or message text', () => {
  const state = { accounts: { 'gmail:secret@example.com': { provider: 'gmail', email: 'secret@example.com', total: 5, messages: [{ subject: 'Private subject' }], updatedAt: 1000, error: null } }, backoff: { gmail: { step: 2, until: 5000 } }, detected: { gmail: { at: 500 } } };
  const out = buildDiagnostics({ manifest: { name: 'X', version: '1.0.0' }, userAgent: 'UA', settings: { intervalMin: 2, providers: { gmail: true }, disabledAccounts: [] }, state, providers: { gmail: { id: 'gmail' } }, sessions: { gmail: true }, idleState: 'active', now: 3000 });
  const text = JSON.stringify(out);
  assert.ok(!text.includes('secret@example.com') && !text.includes('Private subject'));
  assert.deepEqual([out.providers[0].accounts, out.providers[0].unreadTotals, out.providers[0].backoff.retryIn], [1, [5], '2s']);
});
