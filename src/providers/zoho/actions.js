// Write actions. Zoho's mail-action endpoint (mA.do) rejects requests that originate from the extension itself
// (HTTP 400 UNAUTHORIZED, even with all cookies/Origin/Referer, see docs/phase0-findings.md), but accepts the same
// request made from a page on the Zoho origin. So the request runs inside a Zoho tab: an existing one if the user
// has it open, otherwise a short-lived background tab on a tiny same-origin URL (robots.txt, ~1 s).
import { DATA_CENTERS } from './dc.js';

async function withZohoTab(dc, fn, args) {
  const origin = DATA_CENTERS[dc].mail;
  const [open] = await chrome.tabs.query({ url: `${origin}/*` });
  let tab = open, temp = false;
  if (!tab) {
    temp = true;
    tab = await chrome.tabs.create({ url: `${origin}/robots.txt`, active: false });
    await new Promise((resolve) => {
      const done = (id, info) => { if (id === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(done); resolve(); } };
      chrome.tabs.onUpdated.addListener(done);
    });
  }
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn, args });
    return res.result;
  } finally {
    if (temp) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// Runs in the page context; must be self-contained.
async function markAsInPage(csrf, accId, folId, mailId, todo) {
  const res = await fetch('/zm/mA.do', {
    method: 'POST', credentials: 'include',
    headers: { 'X-ZCSRF-TOKEN': `zmrcsr=${csrf}`, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ accId, mode: 'markas', viewfolId: folId, folderSpec: 2, mailId, todo }).toString()
  });
  const body = await res.json().catch(() => null);
  return res.ok && body?.[1]?.result === 'success';
}

// todo=0 marks read, todo=1 marks unread (captured from the web client).
export async function markRead(dc, accId, folId, mailId, read = true) {
  const csrf = (await chrome.cookies.get({ url: `${DATA_CENTERS[dc].mail}/zm/`, name: 'zmcsr' }))?.value;
  if (!csrf) throw new Error('not signed in');
  const ok = await withZohoTab(dc, markAsInPage, [csrf, accId, folId, mailId, read ? 0 : 1]);
  if (!ok) throw new Error('Zoho rejected the action');
}

// Archive and trash endpoints are not captured yet, so the UI hides those buttons.
export const CAPABILITIES = { markRead: true, archive: false, trash: false };
