// Cookie/session access to Proton Mail's own web API (verified in docs/phase0-findings.md).
// Auth = the HttpOnly `AUTH-<uid>` cookie (path /api/) + an `x-pm-uid: <uid>` header. No tokens, keys or OAuth.
// Only metadata is read (sender, subject, time). Message bodies are end-to-end encrypted and never fetched.
export const ORIGIN = 'https://mail.proton.me';
const API = `${ORIGIN}/api/`;
const FALLBACK_VERSION = '5.0.137.4';

import { SignedOutError, SchemaChangedError, RateLimitError } from '../../core/provider.js';
export { SignedOutError, SchemaChangedError, RateLimitError };

// Inbox is label "0", Archive "6", Trash "3", Spam "4".
export const LABEL = { inbox: '0', trash: '3', spam: '4', archive: '6' };

let versionCache = { value: null, at: 0 };
// The web app sends its own version in `x-pm-appversion`; Proton may reject very old values, so follow the live one.
async function appVersion() {
  if (versionCache.value && Date.now() - versionCache.at < 6 * 3600_000) return versionCache.value;
  try {
    const res = await fetch(`${ORIGIN}/assets/version.json`, { credentials: 'omit' });
    const v = (await res.json()).branch?.match(/@([\d.]+)/)?.[1];
    if (v) versionCache = { value: v, at: Date.now() };
  } catch { /* keep fallback */ }
  return versionCache.value || FALLBACK_VERSION;
}

// Every signed-in session in this browser has an AUTH-<uid> cookie scoped to /api/.
export async function getSessionUids() {
  const cookies = await chrome.cookies.getAll({ url: API });
  return cookies.filter((c) => c.name.startsWith('AUTH-')).map((c) => c.name.slice(5));
}
export const hasSession = async () => (await getSessionUids()).length > 0;

async function call(uid, method, path, body) {
  const headers = { 'x-pm-uid': uid, 'x-pm-appversion': `web-mail@${await appVersion()}`, Accept: 'application/vnd.protonmail.v1+json' };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, credentials: 'include', headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 429 || res.status === 503) throw new RateLimitError(`HTTP ${res.status}`, parseInt(res.headers?.get?.('retry-after'), 10) || 0);
  if (res.status === 401 || res.status === 403) throw new SignedOutError(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`Proton HTTP ${res.status}`);
  const json = await res.json().catch(() => { throw new SchemaChangedError('non-JSON response'); });
  if (json.Code === 9001 || json.Code === 12087) throw new RateLimitError(`API code ${json.Code}`); // human verification / too many requests
  return json;
}

// [{uid, localId, email, name}] for every signed-in Proton session in this browser (one AUTH-<uid> cookie each).
// Note: the uid in the AUTH-<uid> cookie is NOT the UID listed by sessions/local, so accounts are identified through
// core/v4/users (called with that cookie's uid) and matched to the web app's /u/<LocalID>/ slot by username.
export async function listSessions(uid) {
  const sessions = (await call(uid, 'GET', 'auth/v4/sessions/local')).Sessions;
  if (!Array.isArray(sessions)) throw new SchemaChangedError('sessions/local shape');
  return sessions;
}

export async function getAccounts() {
  const uids = await getSessionUids();
  if (!uids.length) throw new SignedOutError('no AUTH cookie');
  const sessions = await listSessions(uids[0]);
  const out = [];
  for (const uid of uids) {
    const user = (await call(uid, 'GET', 'core/v4/users')).User;
    if (!user) throw new SchemaChangedError('users shape');
    const slot = sessions.find((s) => s.Username === user.Name);
    out.push({
      uid, localId: slot?.LocalID ?? 0, username: user.Name || '', userId: user.ID || '', name: user.DisplayName || user.Name || '',
      email: user.Email || slot?.PrimaryEmail || user.Name || 'Proton Mail'
    });
  }
  return out;
}

export async function listUnread(uid, limit = 25) {
  const counts = await call(uid, 'GET', 'mail/v4/messages/count');
  const inbox = counts.Counts?.find((c) => c.LabelID === LABEL.inbox);
  if (!inbox) throw new SchemaChangedError('messages/count shape');
  let messages = [];
  if (inbox.Unread > 0) {
    const q = new URLSearchParams({ Unread: 1, LabelID: LABEL.inbox, Page: 0, PageSize: limit, Sort: 'Time', Desc: 1 });
    const list = await call(uid, 'GET', `mail/v4/messages?${q}`);
    if (!Array.isArray(list.Messages)) throw new SchemaChangedError('messages shape');
    messages = list.Messages.map((m) => ({
      id: m.ID, from: m.Sender?.Name || m.Sender?.Address || '', fromAddress: m.Sender?.Address || '',
      subject: m.Subject || '', summary: '', time: (m.Time || 0) * 1000
    }));
  }
  return { total: inbox.Unread, messages };
}

const write = async (uid, method, path, body) => {
  const json = await call(uid, method, path, body);
  if (json.Responses?.some((r) => r.Response?.Code !== 1000)) throw new Error('Proton rejected the action');
};
export const markRead = (uid, id) => write(uid, 'PUT', 'mail/v4/messages/read', { IDs: [id] });
export const markUnread = (uid, id) => write(uid, 'PUT', 'mail/v4/messages/unread', { IDs: [id] });
export const moveTo = (uid, id, labelId) => write(uid, 'PUT', 'mail/v4/messages/label', { LabelID: labelId, IDs: [id] });
export const archive = (uid, id) => moveTo(uid, id, LABEL.archive);
export const trash = (uid, id) => moveTo(uid, id, LABEL.trash);
export const spam = (uid, id) => moveTo(uid, id, LABEL.spam);

export const openUrl = (localId, path = 'inbox') => `${ORIGIN}/u/${localId}/${path}`;

// The /u/<LocalID>/ slot of an account can change (sign out and in again), so it is looked up again when the user
// opens a link: one request, user-initiated. The cached slot is only the fallback if that lookup fails.
export async function resolveOpenUrl(account, path = 'inbox') {
  try {
    const slot = (await listSessions(account.uid)).find((s) => s.Username === account.username);
    if (slot) return openUrl(slot.LocalID, path);
  } catch { /* fall back to the cached slot */ }
  return openUrl(account.localId ?? 0, path);
}
