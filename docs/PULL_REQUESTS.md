# How to make a pull request (step by step)

This guide is for first-time contributors and for people (and AI agents) who contribute often. Anyone can contribute by **forking** the repository; you never need write access.

## 0. Before you start
- Small fix (typo, bug)? Go straight to step 1.
- New feature or provider? **Open an issue first** (use the *Provider request* template) and say you want to work on it, so nobody duplicates the effort and the approach is agreed.
- Requirements: Git, Node 22 or newer (`node -v`), a Chromium browser or Firefox for manual tests.

## 1. Fork and clone
1. Click **Fork** (top right of the repository page). GitHub creates `https://github.com/<you>/mail-notifier-hub`.
2. Clone **your fork** and add the original as `upstream`:
```bash
git clone https://github.com/<you>/mail-notifier-hub.git
cd mail-notifier-hub
git remote add upstream https://github.com/MS-Jahan/mail-notifier-hub.git
```

## 2. Create a branch (never work on `main`)
```bash
git fetch upstream
git switch -c feat/outlook-provider upstream/main     # or fix/gmail-empty-index, docs/readme-typo ...
```
Branch names are free-form, but `type/short-description` keeps things tidy.

## 3. Make the change and test it
```bash
npm test                       # unit tests, no network needed
node scripts/security-lint.mjs # no innerHTML/eval/undeclared hosts
node build.mjs                 # builds dist/chrome and dist/firefox
npx --yes web-ext@8 lint -s dist/firefox
```
Then **try it in a browser**: Chrome/Brave/Edge → `chrome://extensions` → Developer mode → *Load unpacked* → `dist/chrome` (reload the extension after each build). Firefox → `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → `dist/firefox/manifest.json`. Use a **test account** whenever you can. If you change behavior, update the docs and, for providers, `src/providers/STATUS.md`.

Rules that apply to every change (CI enforces some of them):
- Use only the browser session; no passwords, API keys or remote code.
- No `innerHTML`, `eval`, inline scripts, or requests to hosts that are not declared in a provider's `hosts`.
- Do not raise the number of requests per check (one per account in the steady state) or weaken `src/core/policy.js`.
- **No personal data anywhere**: no e-mail addresses, names, cookies, tokens, message subjects or screenshots of real mail in code, tests, fixtures, issues or the PR. Use fake data (`a@example.com`).

## 4. Commit with a Conventional Commit message
The release version is computed from commit messages, so the format matters:

```
<type>(<scope>): <short description>
```

| type | meaning | effect on the version |
|---|---|---|
| `feat` | new feature or provider | **minor** (0.1.0 → 0.2.0) |
| `fix` | bug fix | **patch** (0.1.0 → 0.1.1) |
| `perf`, `revert` | speed-up, revert | patch |
| `feat!` / `fix!` or a `BREAKING CHANGE:` line in the body | incompatible change (e.g. storage format) | major (while below 1.0: minor) |
| `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style` | no user-visible change | **no release** |

Scope = the area: `gmail`, `proton`, `zoho`, `core`, `popup`, `options`, `build`, `ci`, `docs`…

Good: `feat(outlook): add Outlook.com provider` · `fix(gmail): resolve a shifted /u/N index with authuser` · `docs: explain diagnostics in troubleshooting`
Bad: `update stuff` · `Fixed bug` · `WIP`

You can make many commits on your branch; only the **PR title** matters on `main` (we squash-merge).

## 5. Push and open the pull request
```bash
git push -u origin feat/outlook-provider
```
GitHub prints a link, or use *Compare & pull request* on your fork's page. Then:
1. **Title:** a Conventional Commit (same format as above). CI rejects other titles.
2. Fill in the template: what and why, how you tested, the checklist, and any new permission or host with the reason.
3. Add screenshots only if they contain **no real mail**.
4. Click **Create pull request** (use *Draft* if it is not ready).

## 6. CI and review
CI runs automatically (a maintainer may need to approve the first run from a new contributor):

| Check | Fails when | How to fix |
|---|---|---|
| `Unit tests` | a test fails | run `npm test` locally and read the failing assertion |
| `Security lint` | forbidden pattern or a host not declared by a provider | remove the pattern, or declare the host in the provider's `hosts` (and justify it in the PR) |
| `Build` / `Lint the Firefox build` | manifest or build error, `web-ext` errors | run the same commands locally |
| `PR title is a Conventional Commit` | the title format is wrong | edit the title on GitHub (no new push needed; CI re-runs) |

The **Permission report** in the job summary shows every permission and host; a reviewer reads it. The maintainer reviews, may request changes, and then **squash-merges** with your PR title as the commit message.

To respond to review: push more commits to the same branch; the PR updates by itself. To catch up with `main`:
```bash
git fetch upstream
git rebase upstream/main          # or: git merge upstream/main
git push --force-with-lease       # only needed after a rebase
```

## 7. After the merge
- The `Release` workflow runs on `main`. If your PR was `feat`/`fix`/`perf`/`revert` (or breaking), a **new version is tagged and published** automatically with the Chrome and Firefox zips and generated notes; `docs`/`chore`/… PRs do not create a release. Details: [RELEASING.md](RELEASING.md).
- Delete your branch; sync your fork: `git switch main && git pull upstream main`.

## Tips for AI agents and frequent contributors
Read [AGENTS.md](../AGENTS.md). In short: never push to `main`, never edit versions by hand, keep one concern per PR, run all checks before pushing, and never run live probes against a real mailbox without the owner's permission.

## Stuck?
Comment on your PR or issue with the exact command and its full output. For extension behavior problems use [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
