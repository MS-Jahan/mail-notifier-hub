// Every URL the extension opens in a tab comes from a provider (some pieces, like Gmail message links, come from
// feed data). Before opening, check it is https, has no embedded credentials and belongs to that provider's hosts.
export function isSafeProviderUrl(url, provider) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  return provider.hosts.some((h) => new URL(h.replace('/*', '/')).host === u.host);
}

export async function openProviderUrl(provider, url) {
  url = await url; // openUrl() of a provider may be async
  if (!isSafeProviderUrl(url, provider)) throw new Error('refusing to open a URL outside the provider');
  return chrome.tabs.create({ url });
}
