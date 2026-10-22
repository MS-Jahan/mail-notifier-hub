// The contract every provider implements (see docs/plan.md section 3).
//
//   id            folder name, e.g. 'proton'
//   name          display name (nominative use only; never our branding)
//   hosts         host patterns the provider talks to
//   capabilities  { markRead, archive, spam, trash, preview } booleans; the popup hides unsupported buttons
//   hasSession()  cheap check (cookies, no network) that the user looks signed in
//   detect(known) -> Account[]  every signed-in account; `known` are previously detected accounts of this
//                 provider so ids and folder ids can be reused instead of re-fetched
//   listUnread(account, limit) -> { total, messages: [{ id, from, fromAddress, subject, summary, time(ms) }] }
//   act(account, action, message)  action is one of 'markRead' | 'archive' | 'spam' | 'trash'
//   openUrl(account, message?)  link into the provider's web app. May return a Promise: providers whose links use a
//                 positional slot (Proton /u/<n>/) look the current slot up when the user actually opens the link.
//
// Account: { id, email, ...providerSpecificMeta }. The hub stores it under the key `${provider.id}:${account.id}`.

export class SignedOutError extends Error {}
export class SchemaChangedError extends Error {}
export class AccountsChangedError extends Error {} // account list moved (e.g. Gmail /u/N indexes): re-run detect()
export class RateLimitError extends Error {
  constructor(msg, retryAfterSec = 0) { super(msg); this.retryAfterSec = retryAfterSec; }
}
