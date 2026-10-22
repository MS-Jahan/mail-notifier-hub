// Request-rate policy. Everything here is pure so it can be unit-tested.
// Goal: look like one person with the Zoho web app open, never like a scraper or a flood.
export const MIN_INTERVAL_MIN = 2;          // floor for the scheduled check, whatever the setting says
export const MIN_GAP_MS = 20_000;           // never start two scheduled checks closer than this
export const MANUAL_GAP_MS = 10_000;        // manual refresh cooldown
export const LIST_LIMIT = 25;               // messages requested per check
export const ACCOUNT_CACHE_MS = 6 * 3600_000; // account/folder ids are cached this long
export const JITTER_MS = 4000;              // random delay before a scheduled check

export const clampInterval = (min) => Math.max(MIN_INTERVAL_MIN, Number(min) || MIN_INTERVAL_MIN);

// Decide whether a check may hit the network now.
//  - manual: user pressed refresh or opened the popup (maxAgeMs: acceptable staleness)
//  - idleState: 'active' | 'idle' | 'locked' (chrome.idle)
export function allowPoll({ now, lastPollAt, intervalMin, idleState = 'active', manual = false, maxAgeMs = MANUAL_GAP_MS }) {
  const age = now - (lastPollAt || 0);
  if (manual) return age >= maxAgeMs;
  if (age < MIN_GAP_MS) return false;
  const base = clampInterval(intervalMin) * 60_000;
  if (idleState === 'locked') return age >= Math.max(base, 15 * 60_000);
  if (idleState === 'idle') return age >= Math.max(base, 5 * 60_000);
  return age >= base - 5000; // alarms fire slightly early/late
}

// Exponential backoff in minutes: 1, 2, 4 ... capped at 30. Rate limits start higher.
export function nextBackoff(step, { rateLimited = false, retryAfterSec = 0 } = {}) {
  const minutes = Math.min(30, Math.max(rateLimited ? 5 : 1, 2 ** step, Math.ceil(retryAfterSec / 60)));
  return { minutes, step: step + 1 };
}

// Opening a provider's site triggers a scan of that provider's accounts, at most once per this interval.
export const TAB_SCAN_GAP_MS = 5 * 60_000;
export const allowTabScan = ({ now, lastScanAt }) => now - (lastScanAt || 0) >= TAB_SCAN_GAP_MS;
