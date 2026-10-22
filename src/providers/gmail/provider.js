import * as api from './api.js';

export default {
  id: 'gmail',
  name: 'Gmail',
  hosts: ['https://mail.google.com/*'],
  capabilities: { markRead: false, archive: false, spam: false, trash: false, preview: true },
  hasSession: api.hasSession,
  detect: () => api.detectAccounts(),
  listUnread: (account, limit) => api.listUnread(account, limit),
  act: async () => { throw new Error('Gmail is read-only in this version'); },
  openUrl: api.openUrl
};
