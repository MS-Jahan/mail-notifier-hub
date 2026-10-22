# Privacy Policy: Mail Notifier Hub

Last updated: 2026-10-22

Mail Notifier Hub is an independent, open-source browser extension. It is not made, endorsed or supported by Google, Proton, Zoho or any other mail provider.

## What it does with your data
- It checks your inbox on each enabled provider using the session you are already signed in with in this browser. It never asks for, reads or stores your password.
- It reads message **metadata** (sender, subject, time, and a short preview where the provider offers one) and your unread counts, only to show the badge, notifications and the popup.
- When you click Mark as Read, Archive, Spam or Trash, it sends that single action to the provider.

## What is stored, and where
- Settings are kept in the browser's extension storage and may sync through your browser's own sync.
- The latest unread list is kept in local extension storage on your device so the popup opens instantly. It is never uploaded.
- Cookie values and CSRF tokens are used only in memory for requests; they are not stored or logged.

## What is sent where
- Requests go only to the mail provider websites you use (for example `mail.google.com`, `mail.proton.me`, `mail.zoho.*`). Nothing is sent to the developers or any third party. No analytics, no advertising, no remote code.

## Permissions and why
`cookies` (is a session present; Zoho's CSRF cookie), `alarms` (scheduled checks), `idle` (check less often when idle or locked), `notifications`, `storage`, `scripting` (Zoho's mark-as-read must run inside a Zoho page), `offscreen` (Chrome only, optional sound), and access to the provider hosts.

## Your control
Turn providers, accounts, notifications and sound off in Settings, or uninstall the extension to delete all stored data. *Copy diagnostics* produces a report without e-mail addresses or message text, which you may choose to share.

## Contact
Open an issue at https://github.com/MS-Jahan/mail-notifier-hub/issues (use a private security advisory for vulnerabilities).
