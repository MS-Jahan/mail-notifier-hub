import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowPoll, clampInterval, nextBackoff, MIN_INTERVAL_MIN } from '../../src/core/policy.js';

const now = 10_000_000_000;
const min = 60_000;

test('interval never goes below the floor', () => {
  assert.equal(clampInterval(0), MIN_INTERVAL_MIN);
  assert.equal(clampInterval(1), MIN_INTERVAL_MIN);
  assert.equal(clampInterval('abc'), MIN_INTERVAL_MIN);
  assert.equal(clampInterval(7), 7);
});
test('scheduled polls respect the interval and a hard minimum gap', () => {
  assert.equal(allowPoll({ now, lastPollAt: now - 10_000, intervalMin: 2 }), false);
  assert.equal(allowPoll({ now, lastPollAt: now - 60_000, intervalMin: 2 }), false);
  assert.equal(allowPoll({ now, lastPollAt: now - 2 * min, intervalMin: 2 }), true);
  assert.equal(allowPoll({ now, lastPollAt: now - 2 * min, intervalMin: 1 }), true, 'a 1-minute setting is raised to 2');
});
test('idle and locked slow polling down', () => {
  assert.equal(allowPoll({ now, lastPollAt: now - 3 * min, intervalMin: 2, idleState: 'idle' }), false);
  assert.equal(allowPoll({ now, lastPollAt: now - 5 * min, intervalMin: 2, idleState: 'idle' }), true);
  assert.equal(allowPoll({ now, lastPollAt: now - 10 * min, intervalMin: 2, idleState: 'locked' }), false);
  assert.equal(allowPoll({ now, lastPollAt: now - 15 * min, intervalMin: 2, idleState: 'locked' }), true);
});
test('manual refresh has a cooldown and honours maxAge', () => {
  assert.equal(allowPoll({ now, lastPollAt: now - 5_000, intervalMin: 2, manual: true }), false);
  assert.equal(allowPoll({ now, lastPollAt: now - 11_000, intervalMin: 2, manual: true }), true);
  assert.equal(allowPoll({ now, lastPollAt: now - 60_000, intervalMin: 2, manual: true, maxAgeMs: 90_000 }), false);
});
test('rate limits back off harder and honour Retry-After', () => {
  assert.equal(nextBackoff(0).minutes, 1);
  assert.equal(nextBackoff(0, { rateLimited: true }).minutes, 5);
  assert.equal(nextBackoff(0, { rateLimited: true, retryAfterSec: 1200 }).minutes, 20);
  assert.equal(nextBackoff(10).minutes, 30);
});
