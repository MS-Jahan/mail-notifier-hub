# Security notes (review 2026-10-22)

## The "address the account by e-mail in the URL" trick (tested live, Gmail)
| Form | Result |
|---|---|
| `https://mail.google.com/mail/?authuser=<email>` (and `.../mail/feed/atom?authuser=<email>`) | **Works.** Gmail redirects to the right `/u/N/` for any signed-in account. |
| `https://mail.google.com/mail/u/<email>/...` | **Does not work for non-default accounts**: it falls back to `/u/0`, i.e. the wrong account. Not used. |
| `authuser=<an address that is not signed in>` | Gmail silently answers with the **default account**. So the response is never trusted by URL alone: the feed title's address is compared with the expected account, otherwise the account is treated as gone. |

Used for: (a) opening links, so they survive index changes; (b) repairing a stale `/u/N` index with one request instead of re-probing every index. Proton accounts are addressed by `/u/<LocalID>/` (stable per sign-in); no address-in-URL form was found for Proton. Zoho has one session per data center.

## Issues found and fixed
1. **Wrong-account data risk (Gmail):** a missing or shifted index could make the extension show another account's mail under the wrong label. Fixed: identity check on every poll.
2. **URLs from provider data were opened unchecked** (Gmail entry links come from feed data; notification targets came from storage). Fixed: `src/core/url.js` allows only `https:` URLs on the provider's own hosts, no embedded credentials; used by the popup and the notification click. Unit tests cover `javascript:`, `data:`, `http:`, look-alike hosts and `user@host` tricks.
3. **E-mail addresses placed in URLs** are always passed through `encodeURIComponent`.
4. **Background commands** (`refresh`, `rescan`, `act`) now ignore messages whose sender is not this extension.
5. **No DOM injection:** all mail text (subject, sender, preview) is written with `textContent`; there is no `innerHTML`, `eval` or inline script anywhere (checked with grep).

## Still open / for the maintainer
- **Broad host permissions at install** (Gmail, Proton, Zoho hosts). The build has `--optional-hosts` but the options page does not yet request them per provider.
- **Mail metadata (sender, subject, preview) is stored in `chrome.storage.local`** in clear text so the popup opens instantly. Anyone with access to the browser profile can read it; it is never synced or sent anywhere. Consider a setting to disable the cache or to store only counts.
- **`cookies` permission** is powerful. It is used only to check that a session cookie exists (Gmail `SID`, Proton `AUTH-*` name, Zoho `zmcsr`) and to read Zoho's CSRF cookie for the mark-as-read request. Values are never stored or logged; keep it that way in reviews.
- Zoho's mark-as-read opens a short-lived background tab on a Zoho URL and runs a script in it; the script is a fixed function with fixed arguments, not remote code.
- Internal endpoints can change without notice; failures degrade to an amber badge and backoff, never to guessing.
- Provider PRs should be reviewed for: new hosts, any network call outside `hosts`, any logging of tokens or bodies, any use of `eval`/`innerHTML`.
