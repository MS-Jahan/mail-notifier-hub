import { PROVIDERS, providerOf, providerForUrl, accountKey } from '../core/registry.js';
import { SignedOutError, RateLimitError, AccountsChangedError } from '../core/provider.js';
import { getSettings, getState, setState } from '../core/store.js';
import { newMessages } from '../core/diff.js';
import { allowPoll, allowTabScan, clampInterval, nextBackoff, LIST_LIMIT, JITTER_MS } from '../core/policy.js';
import { playNewMail } from '../core/sound.js';
import { openProviderUrl } from '../core/url.js';
import { buildDiagnostics } from '../core/diagnostics.js';

const ALARM = 'poll';
let running = null;          // single-flight: at most one check in progress
let lastPollAt = 0;
let idleState = 'active';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function schedule() {
  const { intervalMin } = await getSettings();
  await chrome.alarms.create(ALARM, { periodInMinutes: clampInterval(intervalMin) });
}

function notify(provider, key, account, fresh) {
  const one = fresh.length === 1 ? fresh[0] : null;
  const id = `n:${Date.now()}`;
  chrome.notifications.create(id, {
    type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: one ? one.from || one.fromAddress : `${fresh.length} new messages`,
    message: one ? one.subject || '(no subject)' : account.email,
    contextMessage: `${provider.name} · ${account.email}`
  });
  chrome.storage.session?.set({ [id]: { provider: provider.id, account, message: one && { link: one.link } } }); // resolved when the notification is clicked
}

// Re-detect accounts for one provider (cheap cookie check first), reusing ids cached on the previous state.
const redetect = new Set(); // provider ids whose account list must be re-detected on the next check
const DETECT_TTL_MS = 3600_000; // account lists are re-detected at most hourly (Gmail probing costs one request per account)
async function detect(provider, prev, next) {
  const cached = prev.detected?.[provider.id];
  if (cached && !redetect.has(provider.id) && Date.now() - cached.at < DETECT_TTL_MS) { next.detected[provider.id] = cached; return cached.accounts; }
  const known = Object.values(prev.accounts).filter((a) => a.provider === provider.id);
  const accounts = await provider.detect(known);
  redetect.delete(provider.id);
  next.detected[provider.id] = { at: Date.now(), accounts };
  return accounts;
}

async function pollProvider(provider, prev, next, settings, opts) {
  if (!(await provider.hasSession())) return { signedOut: true };
  const bo = prev.backoff?.[provider.id];
  if (bo && bo.until > Date.now() && !opts.afterWrite) { // backing off: no network, keep what we had
    for (const [k, a] of Object.entries(prev.accounts)) if (a.provider === provider.id) next.accounts[k] = a;
    next.backoff[provider.id] = bo; return { failed: true };
  }
  const fail = (e) => {
    const b = nextBackoff(bo?.step ?? 0, { rateLimited: e instanceof RateLimitError, retryAfterSec: e.retryAfterSec });
    next.backoff[provider.id] = { step: b.step, until: Date.now() + b.minutes * 60_000 };
  };
  let accounts;
  try { accounts = await detect(provider, prev, next); }
  catch (e) { fail(e); return e instanceof SignedOutError ? { signedOut: true } : { failed: true, error: e }; }

  let ok = false, failed = false;
  for (const account of accounts) {
    const key = accountKey(provider, account);
    if (settings.disabledAccounts.includes(key)) continue;
    try {
      const { total, messages, account: patch } = await provider.listUnread(account, LIST_LIMIT);
      if (patch) { Object.assign(account, patch); } // e.g. Gmail's /u/N index moved; also updates the cached detection
      const old = prev.accounts[key];
      const fresh = newMessages(old?.messages, messages, { recentMin: settings.recentMin });
      if (fresh.length) {
        if (settings.notify) notify(provider, key, account, fresh);
        if (settings.sound) playNewMail();
      }
      next.accounts[key] = { ...account, provider: provider.id, total, messages, error: null, updatedAt: Date.now() };
      ok = true;
    } catch (e) {
      if (e instanceof AccountsChangedError) { delete next.detected[provider.id]; fail(e); failed = true; continue; } // re-detect on the next check
      if (e instanceof SignedOutError) { fail(e); continue; }
      fail(e); failed = true;
      next.accounts[key] = { ...(prev.accounts[key] || { ...account, provider: provider.id }), error: e.message };
    }
  }
  if (ok) delete next.backoff[provider.id]; // a successful account clears the provider's backoff
  return { ok, failed };
}

// opts.manual: user-initiated; opts.maxAgeMs: accept data this fresh; opts.afterWrite: skip gap checks.
async function poll(opts = {}) {
  if (opts.afterWrite && running) await running.catch(() => {});
  if (running) return running;
  const settings = await getSettings();
  if (!opts.afterWrite && !opts.only && !allowPoll({ now: Date.now(), lastPollAt, intervalMin: settings.intervalMin, idleState, manual: !!opts.manual, maxAgeMs: opts.maxAgeMs })) return;

  running = (async () => {
    lastPollAt = Date.now();
    if (!opts.manual && !opts.afterWrite) await sleep(Math.random() * JITTER_MS);
    const prev = await getState();
    const next = { accounts: {}, backoff: {}, detected: {} };
    // A scan of selected providers (opts.only) leaves every other provider's data untouched.
    if (opts.only) {
      for (const [k, a] of Object.entries(prev.accounts)) if (!opts.only.includes(a.provider)) next.accounts[k] = a;
      for (const [id, v] of Object.entries(prev.detected || {})) if (!opts.only.includes(id)) next.detected[id] = v;
      for (const [id, v] of Object.entries(prev.backoff || {})) if (!opts.only.includes(id)) next.backoff[id] = v;
    }
    let anyFailed = false, first = true;

    for (const provider of Object.values(PROVIDERS)) {
      if (!settings.providers[provider.id] || (opts.only && !opts.only.includes(provider.id))) continue;
      if (!first) await sleep(opts.manual || opts.afterWrite || opts.only ? 300 : 1000 + Math.random() * 2000); // stagger providers
      first = false;
      const r = await pollProvider(provider, prev, next, settings, opts);
      anyFailed ||= !!r.failed;
    }
    anyFailed ||= Object.values(next.backoff).some((b) => b.until > Date.now());
    next.signedOut = Object.keys(next.accounts).length === 0 && !anyFailed;
    await setState(next);
    renderBadge(next, anyFailed);
  })().finally(() => { running = null; });
  return running;
}

function renderBadge(state, failed) {
  const accts = Object.values(state.accounts);
  const total = accts.reduce((n, a) => n + (a.total || 0), 0);
  const set = (text, color) => { chrome.action.setBadgeText({ text }); chrome.action.setBadgeBackgroundColor({ color }); };
  if (state.signedOut) set('×', '#9aa0a6');
  else if (failed) set('!', '#f9ab00');
  else set(total > 999 ? '999+' : total ? String(total) : '', '#d93025');
  chrome.action.setTitle({ title: accts.length ? accts.map((a) => `${PROVIDERS[a.provider]?.name}: ${a.email} (${a.total ?? '?'})`).join('\n') : 'Mail Notifier Hub' });
}

chrome.notifications.onClicked.addListener(async (id) => {
  const target = (await chrome.storage.session?.get(id))?.[id];
  const provider = target && PROVIDERS[target.provider];
  if (provider) openProviderUrl(provider, provider.openUrl(target.account, target.message)).catch(() => {}); // refuses URLs outside the provider
  chrome.notifications.clear(id);
});

chrome.idle.setDetectionInterval(300);
chrome.idle.onStateChanged.addListener((s) => { idleState = s; if (s === 'active') poll(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) poll(); });
chrome.runtime.onInstalled.addListener(() => { schedule(); poll(); });
chrome.runtime.onStartup.addListener(() => { schedule(); poll(); });
chrome.storage.onChanged.addListener((c, area) => { if (area === 'sync' && c.intervalMin) schedule(); });

// A sign-in or sign-out changes one provider's session cookie: re-check once, debounced, still subject to the policy gaps.
const SESSION_COOKIES = [[/^zmcsr$/, 'zoho'], [/^AUTH-/, 'proton'], [/^SID$/, 'gmail']];
let debounce;
chrome.cookies.onChanged.addListener(({ cookie, removed }) => {
  const hit = SESSION_COOKIES.find(([re]) => re.test(cookie.name));
  if (!hit) return;
  redetect.add(hit[1]); // an account was added, removed or switched: look for accounts again
  clearTimeout(debounce); debounce = setTimeout(() => poll({ manual: true, maxAgeMs: 30_000 }), removed ? 3000 : 5000);
});

// Opening a tab on an enabled provider's site means accounts may have changed (sign-in, sign-out, "add account").
// Re-detect that provider's accounts and refresh just that provider, at most once per TAB_SCAN_GAP_MS.
const lastScan = {};
chrome.tabs.onUpdated.addListener(async (_tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;
  const provider = providerForUrl(tab.url);
  if (!provider) return;
  const settings = await getSettings();
  if (!settings.scanOnVisit || !settings.providers[provider.id]) return;
  if (!allowTabScan({ now: Date.now(), lastScanAt: lastScan[provider.id] })) return;
  lastScan[provider.id] = Date.now();
  redetect.add(provider.id);
  poll({ only: [provider.id] });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return; // only our own pages (popup, options) may send commands
  const run = async () => {
    if (msg.type === 'refresh') return poll({ manual: true, maxAgeMs: msg.maxAgeMs });
    if (msg.type === 'diagnostics') {
      const sessions = {};
      for (const p of Object.values(PROVIDERS)) sessions[p.id] = await p.hasSession().catch(() => false);
      return buildDiagnostics({ manifest: chrome.runtime.getManifest(), userAgent: navigator.userAgent, settings: await getSettings(), state: await getState(), providers: PROVIDERS, sessions, idleState });
    }
    if (msg.type === 'rescan') { for (const id of Object.keys(PROVIDERS)) redetect.add(id); return poll({ afterWrite: true }); }
    if (msg.type === 'act') {
      const account = (await getState()).accounts[msg.key];
      const provider = providerOf(msg.key);
      if (!account || !provider?.capabilities[msg.action]) throw new Error('action not supported');
      await provider.act(account, msg.action, { id: msg.id });
      return poll({ afterWrite: true });
    }
    throw new Error('unknown message');
  };
  run().then((data) => reply({ ok: true, data }), (e) => reply({ ok: false, error: e.message }));
  return true;
});
