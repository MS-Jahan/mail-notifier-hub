# Mail Notifier Hub: one open-source extension for all webmail

> **Status 2026-10-22:** Phases 0 and 1 are largely implemented with Gmail (read-only), Proton Mail and Zoho Mail. See `src/providers/STATUS.md`, `docs/gmail-trace.md` and `docs/ADDING_A_PROVIDER.md`. Remaining: optional-host-permission flow in the options page, memory benchmark, second-account tests, store submission, further providers.

Planned 2026-10-22. Working name: **Mail Notifier Hub** (final name must not contain a provider trademark such as "Gmail", "Outlook", "Proton" or "Zoho").

## 1. Why

The author keeps one pinned browser tab per mail account. Measured on this machine (Brave 155, 2026-10-22):

| What | Memory |
|---|---|
| One open Zoho Mail or Proton Mail tab, JS heap alone | about 50 MB (the tab's whole renderer process is typically 150-200 MB+, which matches the author's experience) |
| Our extension's background worker after a check, JS heap | **0.5 MB**. An MV3 service worker is unloaded after ~30 s idle, so between checks it costs close to nothing; while awake a worker process is roughly 30-60 MB. |
| Brave right now: 12 renderer processes | about 4.2 GB in total |

So N mail tabs cost roughly N x 150-200 MB all the time. One extension that covers all providers wakes every couple of minutes, makes one small request per account and goes back to sleep. A realistic target is **under 60 MB while awake and about 0 MB asleep, for any number of accounts**. A real before/after benchmark (RSS of the extension process during and between checks) is part of Phase 1.

## 2. Product

- One extension; the user enables providers (Zoho, Proton, Gmail, ...) and the extension finds signed-in sessions in the browser. No passwords, no API keys, no OAuth where the provider allows it.
- Toolbar badge = total unread across enabled accounts (choose which providers count). Tooltip lists each account.
- Desktop notifications with provider and account label; optional sound.
- Popup: account switcher grouped by provider, one-message reader (sender, subject, time, preview when available), pager, actions the provider supports (mark read, archive, spam, trash), open in the provider's web app.
- Optional "unified view": all unread from all accounts merged by time.
- Open source, provider-per-folder, so anyone can add a provider through a pull request.

## 3. Architecture

```
core/                    # provider-agnostic
  provider.js            # the Provider interface + error classes
  registry.js            # discovers enabled providers
  scheduler.js           # alarms, jitter, idle, global concurrency = 1, per-provider backoff
  policy.js              # request-rate rules (already written and tested in the Zoho/Proton projects)
  state.js               # storage schema, migrations
  notifier.js, badge.js, sound.js
ui/
  popup/ options/ onboarding/
  themes/<provider>.css  # tokens only
providers/
  zoho/    provider.js  manifest.json  theme.css  icon.svg  fixtures/  README.md
  proton/  ...
  gmail/   ...
build/                   # assembles dist/chrome and dist/firefox from enabled providers
tests/                   # unit (core + each provider's fixtures), live canaries (opt-in, need a signed-in browser)
```

### Provider contract
```js
export default {
  id: 'proton',                       // folder name
  name: 'Proton Mail',
  hosts: ['https://mail.proton.me/*'],// becomes optional_host_permissions
  capabilities: { markRead, archive, spam, trash, preview: false, multiAccount: true },
  theme: 'proton',
  async detect(),                     // -> Account[] for every signed-in session found in this browser (cookie check, no network if possible)
  async listUnread(account, {limit}), // -> { total, messages: [{id, from, fromAddress, subject, summary, time}] }
  async act(account, action, message),// markRead | archive | spam | trash (provider decides how, e.g. Zoho runs inside a Zoho tab)
  openUrl(account, message?)          // link into the web app
}
```
Errors: `SignedOutError`, `RateLimitError(retryAfter)`, `SchemaChangedError`. The scheduler treats them uniformly (backoff, amber badge, never retry in a tight loop).

### Permissions (matters for store review and user trust)
- `optional_host_permissions` per provider; the options page requests a provider's hosts only when the user enables it (a user gesture), so installing the extension asks for almost nothing. A build flavor with fixed hosts for a few providers is possible if a store rejects optional hosts.
- Core permissions: `storage`, `alarms`, `notifications`, `cookies`, `idle`; `scripting` only if a provider needs in-page requests (Zoho); `offscreen` on Chrome for sound.
- No remote code, no analytics.

### Rate and account safety (shared by all providers)
Same rules as `rate-limit-policy.md` of the Zoho and Proton projects: 2-minute floor, jitter, a global single in-flight request, idle/locked slowdown, exponential backoff, honor `Retry-After`, 1 request per account per check, ids cached. New with several providers: **stagger providers** (spread their checks across the interval) so the browser never fires N providers in the same second.

## 4. UI and themes (answer to "does it become Zoho-like when I pick Zoho?")

- The layout is shared. Only **design tokens** change per provider: the popup sets `<html data-provider="zoho">` when the selected account belongs to Zoho, and `themes/zoho.css` overrides CSS variables (accent color, stripe, surface tint, button radius). Proton gets purple, Gmail red/white, and so on. Dark/light still follow the user's setting.
- Switching accounts in the dropdown switches the theme instantly. The account list shows a small provider badge next to each address.
- What does not change: positions of controls, keyboard shortcuts. What changes per provider: which action buttons appear (from `capabilities`; e.g. Zoho currently has Mark as Read only, Proton has four actions), and wording such as "Open Proton Mail".
- Branding rule: colors and a generic mail glyph only; no provider logos or names used as our own branding; a visible "not affiliated" line in About.
- The existing Zoho popup (blue + 4-color stripe) and Proton popup (purple) become the first two themes unchanged.

## 5. Providers roadmap (feasibility from research, Phase 0 per provider needed)

| Order | Provider | Feasibility | Mechanism (to verify) | Notes |
|---|---|---|---|---|
| 1 | Zoho Mail | **Verified** | `ml.do` list with cookies; writes via `mA.do` run inside a Zoho tab | existing project |
| 2 | Proton Mail | **Verified** | `AUTH-<uid>` cookie + `x-pm-uid`; `mail/v4/messages/...` | existing project |
| 3 | Gmail | High | `https://mail.google.com/mail/u/N/feed/atom` with cookies (unread count `fullcount` and recent entries). Google documents the feed for Workspace; consumer use is undocumented but widely used. Writes need Gmail's HTML/internal endpoints, so v1 is read-only plus "open" | clean-room, see `gmail-notifier-license.md` |
| 4 | Fastmail | Medium | JMAP (`api.fastmail.com/jmap/session`), documented, CORS-enabled; needs an API token or a web-session test | token breaks "no setup", so make it optional |
| 5 | Outlook.com / M365 | Low-Medium | OWA `service.svc` JSON, token in page memory likely | needs live Phase 0; fallback is a content script on an open Outlook tab |
| 6 | Yahoo / AOL | Low-Medium | internal batch JSON API; AOL is on the same platform | needs live Phase 0 |
| 7 | GMX / mail.com | Medium | session-id-based folder count endpoint (a 2019 extension did it) | needs reverse engineering |
| 8 | iCloud, Tuta | Low | no cookie endpoint; Tuta is end-to-end encrypted | tab-title/DOM fallback only, or skip |

Providers with no clean endpoint can still be supported by a **tab fallback**: a content script on an open provider tab reports the unread count from the page title or DOM. It needs the tab to be open, which defeats the memory goal, so it is a last resort and clearly marked "needs open tab".

Prior art: Gmail Notifier (ignotifier) is Gmail-only; X-notifier is old and reported broken for Outlook/Yahoo/AOL; no maintained multi-provider MV3 open-source notifier was found, so the niche is open.

## 6. Open source setup

- **License for our code:** MPL-2.0 (default recommendation: improvements to our files stay open, and it can include files from MPL projects such as Gmail Notifier) or MIT/Apache-2.0 (simplest for contributors). Decide in Phase 0; default MPL-2.0.
- **Credit and third-party code:** `NOTICE` file; clean-room Gmail provider; credit to the Gmail Notifier author in README and About; any copied file keeps its original header and is listed in `NOTICE` (details in `gmail-notifier-license.md`).
- **Contribution flow:** `CONTRIBUTING.md` with a "Add a provider in an afternoon" guide: copy `providers/_template/`, record sanitized fixtures from DevTools (a script scrubs cookies, emails, ids), implement `detect/listUnread/act`, add theme tokens, run `npm test` and the opt-in canary. PR template with a checklist: hosts requested and why, rate behavior, no credential handling, fixtures sanitized, docs updated.
- **CI (GitHub Actions):** unit tests, `web-ext lint`, manifest size/permission diff report on every PR (a new host permission must be called out), zip artifacts.
- **Maintenance reality:** internal endpoints break. Each provider has a status in `providers/STATUS.md` (working / degraded / broken, last verified date), a weekly canary run by a maintainer with test accounts, and a clear "broken provider is disabled in the UI with a message" behavior.
- **Governance:** CODEOWNERS per provider folder, security policy (`SECURITY.md`), code of conduct, issue templates (bug, provider request).
- **Legal/trust page:** states clearly that the extension is unaffiliated, reads only the user's own session, stores nothing remotely, and that using internal endpoints may be against a provider's terms (user's choice).

## 7. Phases and tasks

### Phase 0: Decisions and scaffolding (1-2 days)
- [ ] Choose name, license, repo layout; create repo skeleton in this folder (`core/`, `providers/_template/`, `build/`).
- [ ] Port `policy.js`, `diff.js`, `sound.js`, i18n helper and tests from the Zoho/Proton projects into `core/`.
- [ ] Write `core/provider.js` (contract + errors) and a fake provider for tests.
- [ ] Build script: assemble manifests from enabled providers; Chrome and Firefox outputs; zip.
**Done when:** `npm test` passes with the fake provider and a loadable empty extension builds.

### Phase 1: Core and the two verified providers (4-6 days)
- [ ] Scheduler with provider staggering, global concurrency, per-provider backoff, idle handling; unit tests.
- [ ] State model keyed `provider:accountId`; storage migrations.
- [ ] Move Zoho and Proton code into `providers/zoho` and `providers/proton` behind the contract (keep the in-tab write trick inside Zoho's `act`).
- [ ] Optional-host-permission flow in options (enable provider -> permission prompt -> detect accounts).
- [ ] Unified popup: account switcher with provider badges, per-provider theme tokens, capability-driven buttons, pager; options page with provider toggles and per-account enable.
- [ ] **Memory benchmark**: RSS of the extension process during a check and at idle with 4 accounts vs 4 pinned tabs; record in `docs/benchmark.md`.
**Done when:** a Zoho and a Proton account both show in one popup with their own themes and actions; badge sums both; benchmark documented.

### Phase 2: Gmail provider (3-4 days)
- [ ] Phase 0 live probe with a signed-in Gmail: Atom feed shape, multi-account (`/u/0`, `/u/1`), cookie-only access from the extension, rate behavior.
- [ ] Clean-room provider: parse feed (small tolerant XML parser), account discovery, open URLs; actions only if a safe endpoint is verified.
- [ ] Fixtures, tests, theme, README; ask the Gmail Notifier maintainer which license applies and mention the project.
**Done when:** Gmail unread and notifications work with 2 accounts, read-only is acceptable.

### Phase 3: Open-source launch (2-3 days)
- [ ] README with screenshots from test accounts, memory benchmark, supported-provider table with status.
- [ ] `CONTRIBUTING.md`, provider template, sanitize-fixture script, PR/issue templates, CI workflows, `SECURITY.md`, `NOTICE`.
- [ ] Privacy policy and store listing text (reuse the Zoho/Proton versions, make provider-generic).
- [ ] Publish repo; submit to Chrome Web Store and AMO (needs the author's developer accounts).
**Done when:** a new contributor can add a provider from the template using only the docs (test this with a dry run).

### Phase 4: More providers, one at a time (each 2-4 days)
Fastmail (JMAP, optional token) -> Outlook/M365 -> Yahoo/AOL -> GMX/mail.com -> iCloud/Tuta only if a viable path exists. For each: live Phase 0 probe (needs a signed-in test account), fixtures, provider, theme, docs, canary, status entry.

### Phase 5: Ongoing
Weekly canary, triage of provider breakage, translations (Bengali already exists), community providers, release process (semver, changelog, store updates).

## 8. Risks

| Risk | Mitigation |
|---|---|
| Providers change internal endpoints | schema validation, degraded state, status file, canary, fast patch releases |
| Terms-of-service objections or account flags | conservative request policy, same requests as the web app, user opt-in per provider, clear disclaimer, no credentials handled |
| Store rejection for broad hosts | optional host permissions, narrow per-provider hosts, detailed justifications, separate "lite" builds if needed |
| Maintainer burnout (many providers) | provider owners via CODEOWNERS, auto-disable broken providers, keep the core small |
| Security: a malicious PR adds a host or exfiltrates mail | CI permission diff, mandatory review for `hosts`/manifest changes, no network calls outside declared hosts (lint rule), signed releases |
| Privacy expectations (mail metadata handled locally) | everything stays in local storage, no telemetry, documented in the policy |

## 9. Decisions made by default (change if you disagree)
- Default license MPL-2.0; Gmail provider is clean-room, not a fork.
- v1 ships Zoho, Proton and Gmail (read-only); other providers follow by demand and by whether a no-token path exists.
- English docs and UI strings with Bengali translation kept; more locales via contributors.
- Tab-fallback providers are allowed but labeled "needs open tab".
