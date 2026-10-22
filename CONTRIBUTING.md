# Contributing

Thank you for helping! The short version:

1. **Open an issue first** for anything bigger than a small fix, so we agree on the approach (new providers: use the *Provider request* template).
2. **Fork**, create a branch, make your change, run `npm test` and `node build.mjs`.
3. **Open a pull request** whose **title is a Conventional Commit** (`feat(outlook): add Outlook provider`). The title becomes the commit on `main` and decides the next release version.
4. CI must be green and the maintainer reviews. We squash-merge.

The full, step-by-step guide (with commands, examples and CI troubleshooting) is [docs/PULL_REQUESTS.md](docs/PULL_REQUESTS.md). To add a provider read [docs/ADDING_A_PROVIDER.md](docs/ADDING_A_PROVIDER.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ground rules (they protect users and their accounts)
- Use only the signed-in browser session. No password handling, no embedded API keys, no remote code, no analytics.
- Keep request volume low; do not weaken [`src/core/policy.js`](src/core/policy.js).
- Never put e-mail addresses, names, cookies, tokens or message text in code, tests, fixtures, screenshots or issues.
- Do not use provider logos or imply affiliation.
- Changes to permissions, hosts, `src/core/url.js` or `.github/` get extra scrutiny.
