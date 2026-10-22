import * as api from './api.js';
import * as actions from './actions.js';
import { DATA_CENTERS } from './dc.js';

const CACHE_MS = 6 * 3600_000; // account id and Inbox folder id are reused this long

export default {
  id: 'zoho',
  name: 'Zoho Mail',
  hosts: Object.values(DATA_CENTERS).map((d) => `${d.mail}/*`),
  capabilities: { markRead: true, archive: false, spam: false, trash: false, preview: true },
  async hasSession() {
    for (const dc of Object.keys(DATA_CENTERS)) if (await api.hasSession(dc)) return true;
    return false;
  },
  // One account per data center that has a session (the default mailbox of that login).
  async detect(known = []) {
    const out = [];
    for (const dc of Object.keys(DATA_CENTERS)) {
      if (!(await api.hasSession(dc))) continue;
      const old = known.find((a) => a.dc === dc);
      if (old && Date.now() - (old.resolvedAt || 0) < CACHE_MS) { out.push(old); continue; }
      try {
        const accounts = await api.getAccounts(dc);
        const acc = accounts.find((a) => a.isDefault) || accounts[0];
        out.push({ id: `${dc}:${acc.id}`, dc, accId: acc.id, email: acc.email, folId: await api.getInboxFolderId(dc), resolvedAt: Date.now() });
      } catch (e) { if (!(e instanceof api.SignedOutError)) throw e; }
    }
    if (!out.length) throw new api.SignedOutError('no Zoho session');
    return out;
  },
  listUnread: (account, limit) => api.listUnread(account.dc, account.accId, account.folId, limit),
  async act(account, action, message) {
    if (action !== 'markRead') throw new Error(`unsupported action ${action}`);
    return actions.markRead(account.dc, account.accId, account.folId, message.id, true);
  },
  openUrl: (account) => `${DATA_CENTERS[account.dc].mail}/zm/#mail/folder/inbox`
};
