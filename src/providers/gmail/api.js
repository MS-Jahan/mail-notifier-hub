// Gmail unread count and newest unread messages from the account's Atom feed, using the browser session.
// Verified 2026-10-22: https://mail.google.com/mail/u/<n>/feed/atom returns <fullcount> (total unread) and up to 20 entries.
import { parseFeed } from './feed.js';
import { SignedOutError, RateLimitError, SchemaChangedError, AccountsChangedError } from '../../core/provider.js';

export const ORIGIN = 'https://mail.google.com';
const MAX_ACCOUNTS = 10;

export async function hasSession() {
  return !!(await chrome.cookies.get({ url: `${ORIGIN}/mail/`, name: 'SID' }));
}

export async function fetchFeed(index) {
  const res = await fetch(`${ORIGIN}/mail/u/${index}/feed/atom`, { credentials: 'include' });
  if (res.status === 429 || res.status === 503) throw new RateLimitError(`HTTP ${res.status}`, parseInt(res.headers?.get?.('retry-after'), 10) || 0);
  // Redirected to the Google sign-in page = signed out. A redirect within mail.google.com just means that
  // /u/<n> does not exist and Gmail answered with the default account's feed.
  if (res.status === 401 || res.status === 403 || (res.redirected && !new URL(res.url).host.endsWith('mail.google.com'))) throw new SignedOutError(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`Gmail HTTP ${res.status}`);
  return parseFeed(await res.text());
}

// Signed-in accounts occupy /u/0, /u/1, ... but there can be gaps (an index that answers with a non-feed, e.g. a
// session that needs re-login). Past the last real index Gmail answers with the default account's feed again, so a
// repeated address ends the scan. Three gaps in a row also end it.
export async function detectAccounts() {
  const out = [];
  let gaps = 0;
  for (let i = 0; i < MAX_ACCOUNTS; i++) {
    const feed = await fetchFeed(i);
    if (!feed) { if (++gaps >= 3) break; continue; }
    gaps = 0;
    if (out.some((a) => a.email === feed.email)) break;
    out.push({ id: feed.email, email: feed.email, index: i });
  }
  if (!out.length) throw new SignedOutError('no Gmail feed');
  return out;
}

// Returns { total, messages, account? } where `account` is a patch for the stored account (a refreshed /u/N index).
export async function listUnread(account) {
  let index = account.index;
  let feed = await fetchFeed(index);
  if (!feed || feed.email !== account.email) { // index empty (gap) or now someone else
    // The /u/N indexes shifted (an account was added or removed). Ask Gmail to resolve the address instead of
    // re-probing every index: ?authuser=<email> redirects to the right /u/N. If the address is no longer signed in,
    // Gmail silently answers with the default account, so the title is checked again.
    const res = await fetch(`${ORIGIN}/mail/feed/atom?authuser=${encodeURIComponent(account.email)}`, { credentials: 'include' });
    if (!res.ok || !new URL(res.url).host.endsWith('mail.google.com')) throw new SignedOutError('authuser lookup failed');
    feed = parseFeed(await res.text());
    const resolved = new URL(res.url).pathname.match(/\/u\/(\d+)\//);
    if (!feed || feed.email !== account.email || !resolved) throw new AccountsChangedError(`${account.email} is no longer signed in`);
    index = +resolved[1];
  }
  if (feed.fullcount > 0 && !feed.entries.length) throw new SchemaChangedError('feed has a count but no entries');
  return {
    total: feed.fullcount,
    account: index === account.index ? undefined : { index },
    messages: feed.entries.map((e) => ({ id: e.id, from: e.fromName || e.fromAddress, fromAddress: e.fromAddress, subject: e.subject, summary: e.summary, time: e.time, link: e.link }))
  };
}

// Addressing the account by e-mail keeps links right even when the /u/N indexes change. (The /u/<email>/ path form does
// NOT work for non-default accounts: Gmail falls back to /u/0, so only the authuser parameter is used.)
export const openUrl = (account, message) => message?.link || `${ORIGIN}/mail/?authuser=${encodeURIComponent(account.email)}#inbox`;
