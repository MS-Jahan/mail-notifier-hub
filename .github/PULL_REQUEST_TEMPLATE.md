<!-- PR title must be a Conventional Commit, e.g.  feat(outlook): add Outlook provider   or   fix(gmail): handle empty /u/1 index
     The title becomes the commit on main and decides the release version. Details: docs/PULL_REQUESTS.md -->

## What and why


## How I tested
- [ ] `npm test` passes
- [ ] `node build.mjs` and `npx web-ext@8 lint -s dist/firefox` pass
- [ ] Tried it in a real browser with a test account (which provider / browser):

## Checklist
- [ ] No new host or permission, **or** it is explained below and justified
- [ ] No e-mail addresses, names, tokens, cookies or message text in code, tests, fixtures, screenshots or logs
- [ ] Requests per check did not increase (one request per account in the steady state)
- [ ] Docs updated if behavior changed (`docs/`, `src/providers/STATUS.md`)

## New permissions / hosts (if any)

