# Troubleshooting and how to report an issue

Most problems have one of five causes: **not signed in**, **provider endpoint changed**, **rate-limit backoff**, **missing host permission**, or **a stale account list**. This page helps you tell which, and tells maintainers what to collect.

## 1. First, get the diagnostics
Open the extension **Settings** (gear icon in the popup) → **Support → Copy diagnostics**, and paste the result in your issue. It contains versions, settings and per-provider health, and **no e-mail addresses, names, subjects or message text**.

How to read it:

| Field | Meaning |
|---|---|
| `sessionCookiePresent: false` | the browser has no session for that provider: sign in in this browser (a different browser profile or a private window has its own cookies) |
| `accounts: 0` and `enabled: true` | session cookie exists but no account was found: use **Rescan accounts**, or the provider's endpoint changed |
| `errors: [...]` | last error text per provider: see the table below |
| `backoff: { step, retryIn }` | the provider failed recently and checks are paused for `retryIn` (1, 2, 4 … 30 minutes; rate limits start at 5) |
| `lastUpdate: "…s ago"` | when each account's data was last refreshed |
| `accountsDetected` | when accounts were last listed (refreshed on sign-in/out, site visits, rescans, hourly) |

## 2. Symptoms

| Symptom | Likely cause | What to try |
|---|---|---|
| Badge `×` | no signed-in account found for any enabled provider | sign in to a mail site in this browser; check the provider is ticked in Settings |
| Badge `!` | at least one provider is failing or backing off | open Settings → Copy diagnostics → look at `errors` and `backoff` |
| One account missing | account list is stale, or that account is switched off | Settings → *Rescan accounts*; check the account's checkbox; open the provider's site once (this triggers a rescan) |
| Wrong count or wrong account's mail (Gmail) | `/u/N` indexes shifted after signing in/out | *Rescan accounts*; if it persists, report with diagnostics |
| Count stuck, no notifications | backoff after errors, or the computer is idle/locked (checks slow down to 5/15 min) | wait for `retryIn`; press the refresh button in the popup |
| No notifications although the badge updates | browser or OS notifications are blocked; the message is older than the *notify only if newer than* setting; first check after install only records state | allow notifications for the browser; adjust the setting |
| "Mark as read" does nothing (Zoho) | Zoho rejects the request from the extension, so it runs inside a Zoho tab; a tab opens for a moment | check the extension may access `mail.zoho.*`; report with diagnostics |
| A provider stopped working after months | the provider changed its internal endpoint | see section 4 |

Error messages you may see: `HTTP 401/403` (signed out or session expired), `HTTP 429/503` (rate limited; backoff applies, do not hammer), `… shape` (the response format changed: a code fix is needed), `… is no longer signed in` (account removed; rescan).

## 3. Look inside the extension (for contributors)
- **Chrome / Brave / Edge:** `chrome://extensions` → Developer mode → under *Mail Notifier Hub* click **service worker** (opens DevTools for the background). Console shows errors; *Application → Storage → Extension storage → Local* shows `state` (counts, messages, backoff) and *Sync* shows settings.
- **Firefox:** `about:debugging#/runtime/this-firefox` → *Inspect* on the extension.
- Force a check from the DevTools console of an extension page: `chrome.runtime.sendMessage({ type: 'refresh', maxAgeMs: 0 })`; force an account rescan: `chrome.runtime.sendMessage({ type: 'rescan' })`.
- Network tab of the service worker DevTools shows exactly which requests were made (there should be about one per account per check).

## 4. When a provider changes its web app
1. Sign in, open the provider's site with DevTools → Network, reload, and find the requests that load the inbox / unread count (look for XHR/fetch returning JSON or XML; filter by the word `unread` or `count`).
2. Compare with the provider's folder in `src/providers/<id>/` (the endpoint, query parameters, headers, response fields).
3. Fix `api.js`/`feed.js`, add a **sanitized** fixture and a unit test, update `src/providers/STATUS.md`, and open a PR (`fix(<provider>): …`). Never share cookies, tokens or real mail in the PR; replace them with fake values.
4. The live canary (`npm run canary`, needs the debug-browser setup in `docs/ARCHITECTURE.md`) checks that the endpoints still have the expected shapes.

## 5. What a good issue contains
Provider, browser and version, extension version, what you expected vs. what happened, whether you have several accounts or another data center, and the **diagnostics**. Redact everything personal. Maintainers triage by: reproduce with diagnostics → decide *user setup problem* / *provider changed* / *our bug* → label → fix.
