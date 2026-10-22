# Can we fork "Gmail Notifier" (inbasic/ignotifier)? Findings

Checked 2026-10-22 by reading the repository directly (not legal advice).

## What the repository actually says
- Repo: https://github.com/inbasic/ignotifier. Not archived; last push 2026-10-05; about 640 commits, 160 open issues; main author `inbasic` (578 of ~620 contributions).
- **The root `LICENSE` file is the Mozilla Public License 1.1** (not 2.0). The extension listing page at webextension.org says "MPL 2.0", so the listing and the repo disagree. GitHub cannot classify the file (`NOASSERTION`), because its Exhibit A still names an unrelated project (`ibus-avro`) as "Original Code".
- The repo holds several lines: `v1`, `v2`, `v3.classic`, `v3.dev`. `v3.dev/LICENSE` is a symlink to the root MPL 1.1 file. Source files such as `v3.dev/worker.js` carry no per-file license header.
- `v3.dev` is **Manifest V2** (`persistent: false` background scripts, permissions `notifications, storage, alarms, identity, idle, contextMenus`) with three engines: `rss` (Atom feed), `api` (Gmail API via `identity` OAuth) and `native`. It would need a rewrite for MV3 anyway.
- Translations are managed on Transifex; the README has no trademark or branding statement. "Gmail" is Google's trademark, so a fork or clone must not be named "Gmail ..." or use Google's logo.

## What MPL (1.1 / 2.0) lets us do
- **Yes, forking and redistributing is allowed**, including commercially, as long as modified/copied files stay under MPL and their source is available.
- MPL is **file-level copyleft**: files taken from the project (and our changes to them) stay MPL; our own new files can have a different license (MPL 1.1 section 3.7 "Larger Work", MPL 2.0 section 3.3). So a hub with a permissive license can include a few MPL files.
- Obligations when we copy or modify its files: keep the license text; keep or add the notice header in those files; record a change log / clearly mark modified files and the date and origin; make the source of those files available; do not use "Mozilla"/"MPL" names for a differently licensed derivative; patent clause applies.
- Credit: not mandatory beyond the license notices, but we will credit the author in the README, `NOTICE` file and the options "About" page.

## Recommendation
1. **Do not fork the whole repo.** It is MV2, three engines, 4 sub-versions and a custom build; it carries a large legacy surface and its license text is internally inconsistent.
2. **Write the Gmail provider clean-room in our MV3 architecture.** The Atom feed URL (`https://mail.google.com/mail/u/<n>/feed/atom`) and Gmail's response format are public facts, not copyrightable code. Treat the ignotifier code only as reference for behavior and edge cases (account indexes, label feeds, `spreauth`).
3. **If we later copy specific files** (e.g. its SAX/Atom parser), copy them as separate files with their MPL header intact, list them in `NOTICE`, and keep the rest of our code under our own license.
4. **Ask the maintainer** (one issue or email) which MPL version applies and whether they want to collaborate; being on good terms matters more than the legal minimum.
5. Pick our own license deliberately (see `plan.md`): MPL-2.0 keeps improvements to our files open and is compatible with including MPL files; MIT/Apache is simpler for contributors.
