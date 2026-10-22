// Cookie/session access to Zoho Mail's own web endpoints (verified in docs/phase0-findings.md).
// No API keys: requests carry the user's existing browser session.
import { DATA_CENTERS } from './dc.js';

import { SignedOutError, SchemaChangedError, RateLimitError } from '../../core/provider.js';
export { SignedOutError, SchemaChangedError, RateLimitError };

const FORM = 'application/x-www-form-urlencoded; charset=UTF-8';

export async function hasSession(dc) {
  // The IAM session cookies live on the parent domain and are not returned for a mail.<tld> URL query, but the
  // CSRF cookie set by the mail app is. Its presence means "has a Zoho Mail session"; the first API call validates it.
  return !!(await chrome.cookies.get({ url: `${DATA_CENTERS[dc].mail}/zm/`, name: 'zmcsr' }));
}

async function csrfHeaders(dc) {
  const c = await chrome.cookies.get({ url: `${DATA_CENTERS[dc].mail}/zm/`, name: 'zmcsr' });
  if (!c) throw new SignedOutError('no CSRF cookie');
  return { 'X-ZCSRF-TOKEN': `zmrcsr=${c.value}`, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': FORM };
}

async function json(res) {
  if (res.status === 429 || res.status === 503) throw new RateLimitError(`HTTP ${res.status}`, parseInt(res.headers?.get?.('retry-after'), 10) || 0);
  if (res.status === 401 || res.status === 403 || res.redirected) throw new SignedOutError(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`Zoho HTTP ${res.status}`);
  try { return await res.json(); } catch { throw new SignedOutError('non-JSON response (login page?)'); }
}

export async function getAccounts(dc) {
  const res = await fetch(`${DATA_CENTERS[dc].mail}/zm/mailAccounts.do`, {
    method: 'POST', credentials: 'include', headers: await csrfHeaders(dc), body: 'mode=getAllAccountsInfo'
  });
  const body = await json(res);
  const accounts = body?.[1]?.accounts;
  if (!Array.isArray(accounts)) throw new SchemaChangedError('mailAccounts.do shape');
  return accounts.map((a) => ({ id: String(a.id), email: a.email, name: a.displayName, isDefault: !!a.isDefault }));
}

// The /zm/ page embeds the folder tree (id -> name, Inbox has "SE":1). ~50 KB, so callers cache the result.
export async function getInboxFolderId(dc) {
  const res = await fetch(`${DATA_CENTERS[dc].mail}/zm/`, { credentials: 'include' });
  if (res.status === 429 || res.status === 503) throw new RateLimitError(`HTTP ${res.status}`, parseInt(res.headers?.get?.('retry-after'), 10) || 0);
  if (!res.ok) throw new Error(`Zoho HTTP ${res.status}`);
  const m = (await res.text()).match(/"(\d{15,})":\{[^{}]*"SE":1,[^{}]*"SN":"Inbox"/);
  if (!m) throw new SignedOutError('folder tree not found');
  return m[1];
}

const decode = (s = '') => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&amp;/g, '&');

export async function listUnread(dc, accId, folId, limit = 25) {
  const q = new URLSearchParams({
    xhr: Date.now(), mode: 'listing', accId, from: 1, to: limit, summary: 'true',
    sortBy: 'date', sortOrder: 'false', folderSpec: 2, folId
  });
  const body = await json(await fetch(`${DATA_CENTERS[dc].mail}/zm/ml.do?${q}`, { credentials: 'include' }));
  const rows = body?.[1];
  if (!Array.isArray(rows) || !rows.length || rows[rows.length - 1].unCnt === undefined) throw new SchemaChangedError('ml.do shape');
  const total = parseInt(rows[rows.length - 1].unCnt, 10) || 0;
  const messages = rows.slice(0, -1)
    .filter((r) => r.S1 === 'unread')
    .map((r) => ({
      id: r.M, folderId: r.FD, from: decode(r.SN || r.F), fromAddress: decode(r.F),
      subject: decode(r.SB), summary: decode(r.SM), time: parseInt(r.LTIME, 10) || 0
    }));
  return { total, messages };
}
