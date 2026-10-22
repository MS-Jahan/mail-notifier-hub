// Pure helpers so the notification logic is unit-testable.
export function newMessages(prev, next, { now = Date.now(), recentMin = 10 } = {}) {
  if (!prev) return []; // first poll for an account only seeds state, never notifies
  const seen = new Set(prev.map((m) => m.id));
  const cutoff = now - recentMin * 60_000;
  return next.filter((m) => !seen.has(m.id) && m.time >= cutoff);
}
