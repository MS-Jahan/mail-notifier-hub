import { getSettings, setSettings, getState } from '../core/store.js';
import { PROVIDERS } from '../core/registry.js';
import { t, translatePage } from '../ui/i18n.js';

translatePage();
const $ = (id) => document.getElementById(id);
const s = await getSettings();
const state = await getState();
$('intervalMin').value = s.intervalMin; $('recentMin').value = s.recentMin; $('notify').checked = s.notify; $('scanOnVisit').checked = s.scanOnVisit; $('sound').checked = s.sound; $('theme').value = s.theme;

function row(parent, id, checked, ...label) {
  const r = Object.assign(document.createElement('div'), { className: 'row' });
  const cb = Object.assign(document.createElement('input'), { type: 'checkbox', id, checked });
  cb.onchange = save;
  const lb = Object.assign(document.createElement('label'), { htmlFor: id });
  lb.append(...label); r.append(cb, lb); parent.append(r);
}
for (const p of Object.values(PROVIDERS)) row($('providers'), `prov-${p.id}`, s.providers[p.id], p.name);
const accounts = Object.entries(state.accounts);
for (const [key, a] of accounts) row($('accounts'), `acc-${key}`, !s.disabledAccounts.includes(key),
  Object.assign(document.createElement('span'), { className: 'prov', textContent: PROVIDERS[a.provider]?.name || a.provider }), a.email);
if (!accounts.length) $('accounts').textContent = t('noAccounts');

async function save() {
  await setSettings({
    intervalMin: Math.max(2, +$('intervalMin').value || 2), recentMin: Math.max(1, +$('recentMin').value || 10),
    notify: $('notify').checked, scanOnVisit: $('scanOnVisit').checked, sound: $('sound').checked, theme: $('theme').value,
    providers: Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, $(`prov-${id}`).checked])),
    disabledAccounts: accounts.filter(([key]) => !$(`acc-${key}`).checked).map(([key]) => key)
  });
  $('msg').textContent = t('saved');
}
$('rescan').onclick = async () => { $('rescan').disabled = true; await chrome.runtime.sendMessage({ type: 'rescan' }); location.reload(); };
$('diagnostics').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ type: 'diagnostics' });
  await navigator.clipboard.writeText('```json\n' + JSON.stringify(r.data, null, 2) + '\n```');
  $('msg').textContent = t('copied');
};
$('testSound').onclick = () => new Audio(chrome.runtime.getURL('sounds/new-mail.wav')).play();
for (const id of ['intervalMin', 'recentMin', 'notify', 'scanOnVisit', 'sound', 'theme']) $(id).onchange = save;
