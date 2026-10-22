# Releasing

Releases are **automatic**. Nobody edits version numbers by hand.

## How a version is decided
When a pull request is squash-merged, its title becomes the commit on `main`. The `Release` workflow (`.github/workflows/release.yml`) then runs `scripts/next-version.mjs`, which looks at all commits since the last `vX.Y.Z` tag:

| Commit type | Bump |
|---|---|
| `feat` | minor |
| `fix`, `perf`, `revert` | patch |
| `type!:` or a `BREAKING CHANGE:` line | major (below 1.0 it bumps the minor) |
| `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style` | none |

The highest level since the last tag wins. If nothing releasable is found the workflow stops without publishing. The first release is `v0.1.0`. The repository keeps version `0.0.0` in `src/manifest/base.json`: the real version is injected at build time (`node build.mjs --version X.Y.Z`), so there are **no bot commits** back to `main`.

## What the workflow does
1. checks out the full history and tags;
2. runs the unit tests and `security-lint`;
3. computes the version (stops if there is none);
4. builds both browsers with that version and lints the Firefox build with `web-ext`;
5. writes release notes grouped by commit type (`scripts/release-notes.mjs`);
6. creates the tag `vX.Y.Z` and a **GitHub Release** with `mail-notifier-hub-chrome-X.Y.Z.zip` and `mail-notifier-hub-firefox-X.Y.Z.zip` attached.

## Publishing to the stores (manual for now)
Upload the release zips to the Chrome Web Store and to addons.mozilla.org. Texts for the listing and privacy policy: `docs/privacy-policy.md`. The Firefox add-on ID in `build.mjs` (`mail-notifier-hub@MS-Jahan.github.io`) must stay the same forever once published.

## Hotfixes and mistakes
- A broken release: merge a `fix:` PR (patch release) or `revert:`; do not delete tags that others may have installed.
- Force a specific bump (rare): merge a commit with the right type, for example an empty `feat:`/`fix:` commit message via a PR.
- Re-run a failed release: *Actions → Release → Re-run jobs* (the version is recomputed from the same commits, so it is the same).

## Why squash-merge only
Each PR is one commit with a Conventional Commit title, so the history, the release notes and the version stay clean. Merge commits and rebase-merges of many commits would each count separately.
