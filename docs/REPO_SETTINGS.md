# Recommended repository settings

Apply these once in *Settings* on GitHub (or with the `gh` commands). They keep `main` safe and make the automatic releases trustworthy.

## Branches → protect `main`
- Require a **pull request** before merging, with **1 approval**, and require review from **Code owners** (`.github/CODEOWNERS`).
- Require **status checks** to pass: `checks` and `pr-title`; require branches to be up to date.
- **Restrict who can push** to `main` (nobody direct), block force pushes and deletions.
- Because the `Release` workflow only creates tags and releases with the workflow token and does not push commits, it works with these protections.

```bash
gh api -X PUT repos/ms-jahan/mail-notifier-hub/branches/main/protection --input - <<'JSON'
{ "required_status_checks": { "strict": true, "contexts": ["checks", "pr-title"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1, "require_code_owner_reviews": true },
  "restrictions": null, "allow_force_pushes": false, "allow_deletions": false }
JSON
```
(With a single maintainer, GitHub does not let you approve your own PR; keep `enforce_admins` off so the owner can merge, or add a second reviewer.)

## Pull requests
- Allow **squash merging only**; default the commit message to the **pull request title**. Disable merge commits and rebase merging.
```bash
gh api -X PATCH repos/ms-jahan/mail-notifier-hub -f allow_squash_merge=true -f allow_merge_commit=false -f allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK -f delete_branch_on_merge=true
```

## Actions
- *Settings → Actions → General*: allow actions from GitHub and verified creators only; **workflow permissions: read-only** by default (the Release workflow requests `contents: write` itself); *Require approval for first-time contributors* (run workflows from forks only after you looked at the PR).
- Never switch CI to `pull_request_target` and never add secrets to workflows that run fork code.
- Dependabot (`.github/dependabot.yml`) proposes action updates weekly; for extra supply-chain safety pin actions to full commit SHAs.

## Security
- Enable **private vulnerability reporting**, **secret scanning** and **push protection**, and Dependabot alerts (*Settings → Code security*).
- Enable **Discussions** if you want Q&A separate from issues.

## Labels
`bug`, `provider`, `docs`, `good first issue`, `help wanted`, `security` (issue templates use `bug` and `provider`).
