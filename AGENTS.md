# AGENTS.md: guide for AI coding agents (and humans in a hurry)

Mail Notifier Hub is a Manifest V3 browser extension (Chrome/Brave/Edge + Firefox). It shows unread counts and notifications for Gmail, Proton Mail and Zoho Mail using the user's existing browser session. Plain JavaScript (ES modules), **no runtime dependencies, no bundler**. Node 22+ for tooling.

## Commands
```bash
npm test                          # unit tests (node:test), no network
node scripts/security-lint.mjs    # forbidden patterns + undeclared hosts
node build.mjs                    # dist/chrome and dist/firefox (dev version 0.0.0)
npx --yes web-ext@8 lint -s dist/firefox
node scripts/next-version.mjs     # version the next release would get (empty = none)
```
Always run tests, security-lint, build and web-ext lint before proposing a change.

## Versions are automatic: write correct commit types
The release version is derived from commit messages on `main`; **never edit a version number by hand** (`src/manifest/base.json` stays `0.0.0`, `package.json` stays `0.0.0`).
- `feat(scope): …` → minor, `fix(scope): …` / `perf` / `revert` → patch, `type!:` or a `BREAKING CHANGE:` line → major (minor while < 1.0).
- `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style` → no release.
- Pick the type by **user-visible effect**: a bug fix is `fix`, a new capability or provider is `feat`; a refactor with no behavior change is `refactor` even if large. If a change adds a feature **and** fixes something, use two commits (or the higher type).
- The PR title must be a Conventional Commit too (CI checks it); we squash-merge, so the PR title is the commit on `main`. See `docs/PULL_REQUESTS.md`, `docs/RELEASING.md`.

## Workflow rules
- Never push to `main`. Work on a branch (`feat/…`, `fix/…`, `docs/…`), open a PR from a fork or branch. One concern per PR.
- Do not commit `dist/`, captures, HAR files or anything from a real mailbox.
- Do not run probes against a real mailbox or tab without the owner's explicit permission; prefer fixtures and fake accounts. Reverse any state change you make while testing (mark unread again, move back) and say so.
- Commit message attribution lines required by your environment go at the end of the commit message.

## Code map
`src/background/index.js` poller · `src/core/*` contract, policy, diff, url, diagnostics · `src/providers/<id>/` per-provider code · `src/popup`, `src/options`, `src/ui` UI and themes · `tests/unit` tests · `docs/ARCHITECTURE.md` for the flow.

## Hard rules (security and account safety)
1. Browser session only: no passwords, API keys, tokens in source, OAuth client secrets, or remote code.
2. No `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function`/inline scripts. Render mail text with `textContent`.
3. Network only to hosts declared in a provider's `hosts` (the manifest is generated from them). Opening a tab goes through `openProviderUrl()` (`src/core/url.js`).
4. Request volume: one request per account per check in the steady state; honor `src/core/policy.js` (2-minute floor, jitter, idle slowdown, backoff). Cache ids; never poll in a loop on errors.
5. Verify account identity in every response (Gmail answers with the default account for an unknown address); never show one account's data under another's label. Store stable identities at detect time; resolve positional URL slots when the link is opened.
6. No personal data in repo, tests, fixtures, logs, diagnostics or docs. Use `example.com` addresses.
7. Do not use provider logos or imply affiliation.
8. Adding a provider: copy `src/providers/_template`, follow `docs/ADDING_A_PROVIDER.md`, register in `src/core/registry.js`, add a theme block, tests with sanitized fixtures, update `src/providers/STATUS.md`.

## Style
Match the surrounding code: small modules, ES modules, no comments that restate code, comments only for non-obvious "why" (provider quirks, verified behavior). Strings go through `chrome.i18n` (`src/_locales/en` and `bn`).
