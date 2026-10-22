import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMessages } from '../../src/core/diff.js';
import { nextBackoff } from '../../src/core/policy.js';

const now = 1_000_000_000_000;
const m = (id, ageMin) => ({ id, time: now - ageMin * 60_000 });

test('first poll seeds state and never notifies', () => {
  assert.deepEqual(newMessages(undefined, [m('a', 1)], { now }), []);
});
test('only unseen, recent messages notify', () => {
  const prev = [m('a', 30)];
  const next = [m('b', 2), m('a', 30), m('c', 60)];
  assert.deepEqual(newMessages(prev, next, { now, recentMin: 10 }).map((x) => x.id), ['b']);
});
