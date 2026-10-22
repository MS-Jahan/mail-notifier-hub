# Security Policy

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's private reporting: *Security → Report a vulnerability* ([direct link](https://github.com/MS-Jahan/mail-notifier-hub/security/advisories/new)). Include what you found, how to reproduce it, and the impact. You should get a first reply within a few days.

Examples of what we want to hear about: reading or sending mail data anywhere but the provider, a way for a web page or another extension to drive this extension, opening attacker-controlled URLs, leaking cookie values or tokens, a pull request or workflow that could run untrusted code with write access.

## Supported versions
Only the latest release receives fixes.

## Design notes
Threat model, what was reviewed, and what is still open: [docs/security.md](docs/security.md). Repository hardening (branch protection, workflows): [docs/REPO_SETTINGS.md](docs/REPO_SETTINGS.md).
