const DEFAULTS = {
  intervalMin: 2, notify: true, sound: false, recentMin: 10, theme: 'system', scanOnVisit: true,
  providers: { gmail: true, proton: true, zoho: true }, // which providers to check
  disabledAccounts: []                                  // account keys the user switched off
};

export async function getSettings() {
  const s = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...s, providers: { ...DEFAULTS.providers, ...(s.providers || {}) } };
}
export const setSettings = (s) => chrome.storage.sync.set(s);

// Mail metadata stays on this device only. state = { accounts: {key: {...}}, backoff: {}, signedOut }
export async function getState() {
  return (await chrome.storage.local.get('state')).state || { accounts: {}, backoff: {} };
}
export const setState = (state) => chrome.storage.local.set({ state });
