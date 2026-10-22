import zoho from '../providers/zoho/provider.js';
import proton from '../providers/proton/provider.js';
import gmail from '../providers/gmail/provider.js';

// Adding a provider = add its folder under providers/ and list it here.
export const PROVIDERS = { gmail, proton, zoho };
export const providerOf = (key) => PROVIDERS[key.split(':')[0]];
export const accountKey = (provider, account) => `${provider.id}:${account.id}`;

// Which provider's web app is this URL? Provider `hosts` are 'https://<host>/*' patterns.
export function providerForUrl(url, providers = PROVIDERS) {
  let u; try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  return Object.values(providers).find((p) => p.hosts.some((h) => new URL(h.replace('/*', '/')).host === u.host)) || null;
}
