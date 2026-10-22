import { getState, getSettings, setSettings } from '../core/store.js';
import { PROVIDERS, providerOf } from '../core/registry.js';
import { t, translatePage } from '../ui/i18n.js';
import { openProviderUrl } from '../core/url.js';

const $ = (id) => document.getElementById(id);
const ACTION_BUTTONS = { markread: 'markRead', archive: 'archive', spam: 'spam', trash: 'trash' };
let state, key, idx = 0;

const rel = (ms) => {
  const s = Math.round((ms - Date.now()) / 1000), f = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= sec) return f.format(Math.round(s / sec), unit);
  return f.format(s, 'second');
};
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);

function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = theme;
}

function render() {
  const keys = Object.keys(state.accounts);
  if (!keys.includes(key)) key = keys[0];
  const acct = state.accounts[key];
  const provider = acct && PROVIDERS[acct.provider];
  // The theme follows the selected account's provider.
  if (provider) document.documentElement.dataset.provider = provider.id; else delete document.documentElement.dataset.provider;

  $('accounts').replaceChildren(...keys.map((k) => {
    const a = state.accounts[k];
    const li = el('li', { role: 'option' });
    li.append(el('span', { className: 'prov', textContent: PROVIDERS[a.provider]?.name || a.provider }), `${a.email} (${a.total ?? '?'})`);
    li.setAttribute('aria-selected', k === key); li.onclick = () => { key = k; idx = 0; $('accounts').hidden = true; render(); };
    return li;
  }));
  $('email').textContent = acct?.email || 'Mail Notifier Hub';

  const msgs = acct?.messages || [];
  idx = Math.min(idx, Math.max(0, msgs.length - 1));
  $('pos').textContent = acct ? t('ofTotal', msgs.length ? idx + 1 : 0, acct.total ?? 0) : '';
  for (const [id, action] of Object.entries(ACTION_BUTTONS)) {
    $(id).classList.toggle('hide', !provider?.capabilities[action]);
    $(id).disabled = !msgs.length;
  }
  document.querySelector('.sep')?.classList.toggle('hide', !Object.values(ACTION_BUTTONS).some((a) => provider?.capabilities[a]));
  $('prev').disabled = idx <= 0; $('next').disabled = idx >= msgs.length - 1;

  const msg = $('msg'); msg.replaceChildren();
  if (state.signedOut || !acct) {
    const d = el('div', { className: 'empty' });
    d.append(t('signIn') + ' ');
    return msg.append(d);
  }
  if (!msgs.length) return msg.append(el('div', { className: 'empty', textContent: t('noUnread') }));
  const m = msgs[idx];
  const meta = el('div', { className: 'meta' });
  meta.append(el('span', { textContent: m.from }), el('span', { textContent: rel(m.time) }));
  msg.append(el('h1', { className: 'subject', textContent: m.subject || t('noSubject') }), meta, el('div', { className: 'preview', textContent: m.summary || '' }));
  if (acct.error) msg.append(el('p', { className: 'empty', textContent: t('checkFailed', acct.error) }));
}

async function load() { state = await getState(); render(); }

async function act(action) {
  const m = state.accounts[key]?.messages[idx]; if (!m) return;
  for (const id of Object.keys(ACTION_BUTTONS)) $(id).disabled = true;
  const r = await chrome.runtime.sendMessage({ type: 'act', action, key, id: m.id });
  if (!r.ok) $('msg').append(el('p', { className: 'empty', textContent: t('markFailed', r.error) }));
  await load();
}
for (const [id, action] of Object.entries(ACTION_BUTTONS)) $(id).onclick = () => act(action);

$('menu').onclick = () => { const l = $('accounts'); l.hidden = !l.hidden; $('menu').setAttribute('aria-expanded', !l.hidden); };
$('prev').onclick = () => { idx--; render(); };
$('next').onclick = () => { idx++; render(); };
$('open').onclick = () => {
  const a = state.accounts[key]; const p = a && providerOf(key);
  if (p) openProviderUrl(p, p.openUrl(a, a.messages?.[idx])).catch(() => {});
};
$('refresh').onclick = async () => { await chrome.runtime.sendMessage({ type: 'refresh', maxAgeMs: 10_000 }); load(); };
$('settings').onclick = () => chrome.runtime.openOptionsPage();
$('theme').onclick = async () => {
  const order = ['system', 'light', 'dark'], cur = (await getSettings()).theme, next = order[(order.indexOf(cur) + 1) % 3];
  await setSettings({ theme: next }); applyTheme(next);
};
document.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' && !$('prev').disabled) $('prev').click(); if (e.key === 'ArrowRight' && !$('next').disabled) $('next').click(); });
chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c.state) load(); });

chrome.runtime.sendMessage({ type: 'refresh', maxAgeMs: 90_000 }); // background skips the network if data is under 90 s old
translatePage();
applyTheme((await getSettings()).theme);
await load();
