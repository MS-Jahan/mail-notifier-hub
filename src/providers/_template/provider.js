// Copy this folder to src/providers/<yourprovider>/, implement the functions, then list it in src/core/registry.js.
// Read docs/ADDING_A_PROVIDER.md first. Rules: use only the signed-in browser session, request nothing outside `hosts`,
// make at most one request per account per check, and throw the typed errors from core/provider.js.
import { SignedOutError } from '../../core/provider.js';

export default {
  id: 'example',                         // folder name
  name: 'Example Mail',                  // shown in the UI (nominative use only)
  hosts: ['https://mail.example.com/*'], // every host you fetch from; becomes a manifest host permission
  capabilities: { markRead: false, archive: false, spam: false, trash: false, preview: false },

  // Cheap check, no network if possible (e.g. a session cookie exists).
  async hasSession() { return false; },

  // Every signed-in account: [{ id, email, ...anything you need later }]. `known` = accounts from the last detection.
  async detect(known) { throw new SignedOutError('not implemented'); },

  // -> { total: number, messages: [{ id, from, fromAddress, subject, summary, time(ms) }] }, newest first.
  async listUnread(account, limit) { throw new Error('not implemented'); },

  // Only needed if a capability above is true. action: 'markRead' | 'archive' | 'spam' | 'trash'.
  async act(account, action, message) { throw new Error('not supported'); },

  openUrl(account, message) { return 'https://mail.example.com/'; }
};
