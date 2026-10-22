# Provider status (last verified 2026-10-22, on one test account each)

| Provider | State | Read | Actions | Notes |
|---|---|---|---|---|
| Gmail | working (3 accounts, with an empty `/u/1` gap, verified) | unread count + 20 newest unread via Atom feed `/mail/u/N/feed/atom` | none (read-only) | needs more than one account to verify `/u/N` shifting; consumer-account use of the feed is undocumented |
| Proton Mail | working (2 accounts verified; links resolve the current `/u/N` slot when opened) | `messages/count` + `messages?Unread=1` with `AUTH-<uid>` cookie + `x-pm-uid` | mark read, archive, spam, trash | bodies are end-to-end encrypted: no preview |
| Zoho Mail | working | `ml.do` with cookies | mark read (runs inside a Zoho tab, because Zoho rejects it from the extension) | archive/trash not captured yet; data centers other than `.com` untested |
