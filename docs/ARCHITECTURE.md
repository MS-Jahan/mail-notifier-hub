# Architecture

## Overview
A Manifest V3 extension. A background **service worker** (event page on Firefox) wakes on an alarm, asks each enabled provider for unread mail using the browser's own session, stores the result in `chrome.storage.local`, updates the badge, and sends notifications. The popup and options pages only read that state.

```
src/
  background/index.js   the poller: alarm → per-provider detect + listUnread → diff → notify → badge
  core/
    provider.js         provider contract + typed errors (SignedOut, RateLimit, SchemaChanged, AccountsChanged)
    registry.js         list of providers, URL → provider
    policy.js           request-rate rules (floor, jitter, idle, backoff, tab-scan gap)
    diff.js             "which messages are new" (pure)
    store.js            settings (sync) and state (local)
    url.js              the only code that opens tabs; https + provider hosts only
    diagnostics.js      sanitized support report
    sound.js            offscreen audio (Chrome) / Audio (Firefox)
  providers/<id>/       provider.js (contract) + api.js (+ parsers); one folder per provider
  popup/ options/ ui/   pages, shared CSS tokens, per-provider themes (themes.css), i18n helper
  _locales/{en,bn}      strings
scripts/                next-version, release-notes, check-pr-title, security-lint, permission-report
tests/unit/             node:test, no network, fake chrome.* and fetch
tests/e2e/canary.mjs    live endpoint-shape check against a signed-in browser
```

## One check, step by step
1. An alarm (every ≥ 2 min) or an event (popup opened, site visited, cookie changed, idle→active) calls `poll()`. `allowPoll()` decides if the network may be used now (gaps, idle state, manual cooldown). One check runs at a time.
2. For each enabled provider (staggered by 1–3 s): `hasSession()` (cookie check, no network) → account list from cache (refreshed hourly or when a session cookie changes or on rescan) or `detect()` → `listUnread(account)` per enabled account.
3. New messages = not seen before **and** newer than the *recent* window; the first check after install only records state. Notifications use `chrome.notifications`; the click target is stored in `storage.session` and resolved with `provider.openUrl()` when clicked, then opened through `openProviderUrl()`.
4. Errors map to backoff per provider (1,2,4…30 min; rate limits start at 5; `Retry-After` honored). The badge shows `×` (nothing signed in), `!` (failing), or the total.

## State (`chrome.storage.local.state`)
`accounts: { "<provider>:<accountId>": { provider, id, email, …provider fields, total, messages[], error, updatedAt } }`, `backoff: { providerId: { step, until } }`, `detected: { providerId: { at, accounts[] } }`, `signedOut`. Mail metadata never leaves the device.

## Providers
Contract and rules: [ADDING_A_PROVIDER.md](ADDING_A_PROVIDER.md). Provider specifics learned by probing real sessions: [phase0 notes in docs/](.) (`gmail-trace.md`, [plan.md](plan.md)); live status: `src/providers/STATUS.md`.

## Theming
`<html data-provider="zoho|proton|gmail">` is set from the selected account; `src/ui/themes.css` overrides CSS tokens only. Adding a provider = adding one block.

## Local live testing (for maintainers)
Probing endpoints needs a signed-in browser. Use a separate browser profile started with `--remote-debugging-port=9222 --user-data-dir=<scratch dir>` (Chromium refuses the debug port on the default profile), sign in with **test accounts**, then use DevTools or a CDP script. `npm run canary` connects to port 9222 and checks the endpoint shapes of a signed-in provider tab; it prints pass/fail only and never message content. Never commit captures (`.gitignore` excludes `*.har` and `/captures/`).
