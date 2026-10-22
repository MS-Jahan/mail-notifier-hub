# Trace: how Gmail Notifier (inbasic/ignotifier v3.dev) and our Gmail provider work

## What ignotifier does (read from `v3.dev/accounts.js` and `engines/rss/core.js`, 2026-10-22)
- **Account discovery:** fetches `https://mail.google.com/mail/u/N/feed/atom/inbox` for N = 0, 1, 2 ... (batches of 3, up to 20). The feed `<title>` looks like `Gmail - Inbox for someone@example.com`; the part after ` for ` is the address. It stops at the first index whose response has no such title or repeats an address. Ignored users are filtered from a user-set list.
- **Logged-in check:** `GET https://mail.google.com/mail/?ui=html&zy=h`; logged in if `response.ok` and the final URL does not contain `accounts.google`. Result cached for 1 hour.
- **Cookies:** none handled by the extension; `fetch` from an extension with host permission sends the browser's Google cookies.
- **Two engines in the "RSS" path:** the Atom feed for counts/entries, and Gmail's basic HTML view (`?ui=html`) for label counts and thread lists. The HTML view needs an `at` token scraped from the page and, the first time, a POST to `?a=uia` to accept "use this view". Searches such as `label:INBOX is:unread` are POSTed to the HTML view and the result parsed with a small SAX parser. Actions (mark read, archive, trash) go through the same HTML view. Responses are cached in CacheStorage for 30 minutes.
- Other engines: an `api` engine (Gmail REST API through the `identity` OAuth flow) and a `native` engine (local `notmuch`).
- It is Manifest V2 with non-persistent background scripts.

## What we verified live for our provider (Brave, one signed-in Gmail account)
- From an extension context with only the host permission `https://mail.google.com/*`, `GET /mail/u/0/feed/atom` returns 200 `text/xml` with `<fullcount>` = total unread (338, matching the Gmail Notifier screenshot) and up to 20 `<entry>` items.
- Each entry has `title` (subject), `summary` (about 190 characters of preview), `link`, `modified`/`issued` (ISO time), `id` (`tag:gmail.google.com,2004:<thread id>`) and `author` (`name`, `email`).
- `/feed/atom/inbox` returned `fullcount 0` with 20 entries, so we use the plain `/feed/atom` (unread mail) for the count.
- An index with no signed-in account (`/u/1` here) returns a non-XML body (content type `application/binary`), which is how detection stops.
- The `SID` cookie is visible to the extension through `chrome.cookies.get`, so "signed in" can be checked without a network request.

## Our design (clean-room, MV3)
- Detect: probe `/u/0`, `/u/1`, ... until a response is not a feed or repeats an address; cache the list for 1 hour.
- Poll: one request per account per check to `/mail/u/<index>/feed/atom`; verify the feed's address still matches the cached account (if not, indexes shifted, so re-detect).
- Read-only in v1. Actions would need the basic-HTML view with its `at` token; deferred until verified on a test account.
- No code from ignotifier is used; see `gmail-notifier-license.md`.
