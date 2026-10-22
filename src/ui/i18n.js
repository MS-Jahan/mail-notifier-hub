// Thin wrapper over chrome.i18n so markup can use data-i18n / data-i18n-title / data-i18n-aria.
export const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;

export function translatePage() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  document.documentElement.lang = chrome.i18n.getUILanguage();
}
