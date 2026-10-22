import * as api from './api.js';

export default {
  id: 'proton',
  name: 'Proton Mail',
  hosts: ['https://mail.proton.me/*'],
  capabilities: { markRead: true, archive: true, spam: true, trash: true, preview: false },
  hasSession: api.hasSession,
  detect: () => api.getAccounts().then((list) => list.map((a) => ({ id: a.uid, uid: a.uid, localId: a.localId, username: a.username, userId: a.userId, email: a.email, name: a.name }))),
  listUnread: (account, limit) => api.listUnread(account.uid, limit),
  act: async (account, action, message) => {
    const fn = { markRead: api.markRead, archive: api.archive, spam: api.spam, trash: api.trash }[action];
    if (!fn) throw new Error(`unsupported action ${action}`);
    return fn(account.uid, message.id);
  },
  openUrl: (account) => api.resolveOpenUrl(account) // async: resolves the current /u/<n>/ slot when the link is opened
};
