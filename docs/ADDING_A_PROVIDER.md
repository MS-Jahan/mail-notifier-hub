# Adding a provider

1. **Probe the web app** while signed in (browser DevTools, Network tab): how does it list unread mail? Prefer endpoints that work with the session cookie alone. Note the auth headers, the response shape, and how multiple accounts are addressed. Do not use passwords, API keys you embed, or anything that needs the user to paste secrets (an optional user-created token is acceptable if there is no alternative; flag it in the PR).
2. `cp -r src/providers/_template src/providers/<name>` and implement `hasSession`, `detect`, `listUnread` (and `act` only for actions you verified on a test account).
3. Register it in `src/core/registry.js` and add a theme block to `src/ui/themes.css` (accent, surface, hover, border; light and dark).
4. Add **sanitized fixtures** under `tests/fixtures/<name>/` (remove cookies, emails, names, ids) and unit tests that run the parser/mapping against them.
5. `npm test && node build.mjs && npx web-ext lint -s dist/firefox`.
6. In the PR describe: hosts requested and why, requests per check (must be 1 per account in the steady state), how errors map to `SignedOutError` / `RateLimitError` / `SchemaChangedError`, and which actions were verified (and how they were reversed on the test account).

## Rules every provider follows
- Use only the signed-in browser session. No credential collection, no remote code, no analytics, no requests outside `hosts`.
- Keep request volume low: the core scheduler enforces a 2-minute floor, jitter, a global single in-flight check, idle slowdown and exponential backoff. Cache anything that rarely changes (ids, folder ids).
- Never log or store message bodies, cookie values or tokens.
- Do not copy code from other projects unless its license allows it; keep license headers, list it in `NOTICE`.
- Do not use a provider's logo or imply affiliation. Colors only.
- Mark what you could not verify in `providers/STATUS.md`.

## Account identity and links (important for multi-account providers)
- At `detect()` time save each account's **stable identity** in the account object (it is kept in local storage and reused): e-mail, user id, username, whatever the provider exposes. Never identify an account by its position alone (`/u/<n>`).
- **Check identity on every poll.** If the response does not belong to the saved identity (Gmail answers with the default account for an unknown address), throw `AccountsChangedError` or return a patch (`{ account: { index } }`) after resolving it; never show another account's data under this label.
- **Build links from the stable identity** when the provider supports it (Gmail: `?authuser=<email>`). If the link needs a positional slot (Proton `/u/<n>/`), make `openUrl()` async and look the current slot up when the user opens the link (one user-initiated request), falling back to the cached slot.
- Always URL-encode identities, and let the hub open links only through `openProviderUrl` (https on the provider's hosts).
