# Mail Notifier Hub

One open-source browser extension (Chrome, Brave, Edge and Firefox) that shows **unread counts and desktop notifications for several webmail providers at once**, using the browser session you are already signed in with. No passwords, no API keys, no OAuth, no server, and no pinned tab per account.

| Provider | Unread count | Preview | Actions | Multi-account |
|---|---|---|---|---|
| **Gmail** | yes | yes | open only (read-only) | yes |
| **Proton Mail** | yes | no (end-to-end encrypted) | mark read, archive, spam, trash | yes |
| **Zoho Mail** | yes | yes | mark read | one per data center |

More providers are welcome: see [Adding a provider](docs/ADDING_A_PROVIDER.md). Current health of each provider: [`src/providers/STATUS.md`](src/providers/STATUS.md).

## Why

A pinned tab per mailbox costs about 150–200 MB each, all day. This extension is a background worker that wakes every couple of minutes, makes **one small request per account**, and goes to sleep again. Its JavaScript heap measured **0.5 MB** right after a check (a mail tab: about 50 MB heap, far more in total process memory).

## Install

**From a release (recommended):** download the zip for your browser from the [Releases page](https://github.com/MS-Jahan/mail-notifier-hub/releases).

- **Chrome / Brave / Edge:** unzip `mail-notifier-hub-chrome-<version>.zip` into a folder → open `chrome://extensions` → turn on *Developer mode* → *Load unpacked* → pick the folder.
- **Firefox:** open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → pick `manifest.json` from the unzipped `mail-notifier-hub-firefox-<version>.zip` (temporary add-ons are removed when Firefox closes until the store version is published).

**From source:**

```bash
git clone https://github.com/MS-Jahan/mail-notifier-hub.git
cd mail-notifier-hub
npm test                 # unit tests (Node 22+)
node build.mjs           # writes dist/chrome and dist/firefox (dev version 0.0.0)
node build.mjs --zip --version 1.2.3   # also writes store zips with a given version
```

Sign in to your mail in the same browser. The extension finds the sessions by itself; open its popup from the toolbar.

## Using it

- The **badge** shows the total unread across all enabled accounts (`×` = no signed-in account found, `!` = a provider is failing; see [Troubleshooting](docs/TROUBLESHOOTING.md)).
- The **popup** shows one unread message at a time with the sender, subject, time and preview, a pager, and the actions the selected provider supports. Choosing an account switches the popup to that provider's colors.
- **Settings** (gear icon): providers on/off, accounts on/off, check interval (minimum 2 minutes), notifications, sound, theme, *Rescan accounts*, and *Copy diagnostics* for bug reports.
- Accounts are kept up to date automatically: signing in or out is noticed from the session cookies, and opening a provider's site triggers a rescan of just that provider (at most once per 5 minutes).

## Privacy and safety

- Everything stays in your browser. Nothing is sent anywhere except the requests to the mail providers' own websites that your browser would make anyway. No analytics, no remote code. Details: [Privacy policy](docs/privacy-policy.md).
- The extension is deliberately **gentle**: 2-minute minimum interval, random jitter, one request per account per check, slower while the computer is idle or locked, exponential backoff on errors. See [`src/core/policy.js`](src/core/policy.js).
- It uses providers' **internal web endpoints** (the same ones their web apps use), which are not public APIs and can change without notice; the extension degrades to an amber `!` badge instead of guessing. Using them may be outside some providers' terms of service; you decide whether to enable a provider.
- Security notes and how to report a vulnerability: [SECURITY.md](SECURITY.md), [docs/security.md](docs/security.md).

## Contributing

Pull requests are welcome, from small fixes to whole new providers.

1. Read [docs/PULL_REQUESTS.md](docs/PULL_REQUESTS.md): the step-by-step fork → branch → PR workflow, the commit/PR-title rules (they decide the release version), and what CI checks.
2. New provider? Follow [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md).
3. Found a bug? Use *Settings → Copy diagnostics* and open an issue; [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) explains how to investigate first.

Project docs: [Architecture](docs/ARCHITECTURE.md) · [Releasing](docs/RELEASING.md) · [Repository settings](docs/REPO_SETTINGS.md) · [Agents guide](AGENTS.md) · [Roadmap](docs/plan.md).

## Credits and license

Licensed under the [Mozilla Public License 2.0](LICENSE). Not affiliated with Google, Proton, Zoho or any other provider; provider names only say what a feature works with. Prior art: [Gmail Notifier](https://github.com/inbasic/ignotifier) by inbasic showed that Gmail's Atom feed can be used from a browser session; no code from it is included (see [NOTICE](NOTICE)).
