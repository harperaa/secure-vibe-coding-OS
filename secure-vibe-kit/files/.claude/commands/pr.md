---
name: pr
description: Open a pull request from the current branch to main using the GitHub CLI (gh). Runs a secrets scan, checks CI readiness, pushes if needed, then creates the PR with the team template. Use whenever a developer is ready to submit work for review or says "open a PR", "create PR", "submit for review".
---

# Open Pull Request

Pre-flight check, then open a PR to `main` via the GitHub CLI.

## Instructions

**Step 1 — Confirm we are on a feature branch**

Run: `git branch --show-current`
Store as `CURRENT_BRANCH`.

If `CURRENT_BRANCH` is `main` or `testing`:
> "You cannot open a PR from `<branch>`. Switch to a feature branch first."
Stop here.

**Step 2 — Check GitHub CLI is installed**

Run: `gh --version 2>/dev/null || echo "GH_NOT_FOUND"`

If output contains `GH_NOT_FOUND`:
> "The GitHub CLI (gh) is not installed. Install it from https://cli.github.com then run `gh auth login`."
Stop here.

**Step 3 — Run secrets scan**

Run: `detect-secrets-hook --baseline .secrets.baseline 2>/dev/null || echo "SCAN_UNAVAILABLE"`

If potential secrets detected:
> "⚠️  Potential secrets detected. Resolve before opening a PR."
Stop here.

If scan unavailable, warn but continue:
> "detect-secrets not installed — skipping scan. Run `/setup-hooks` to install it."

**Step 4 — Ensure branch is pushed**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If no upstream is set, push now:
```
git push -u origin <CURRENT_BRANCH>
```

Otherwise check for unpushed commits:
Run: `git rev-list --count @{u}..HEAD`
If count > 0: `git push`

**Step 5 — Sync with main before opening PR**

Run: `git fetch origin`
Run: `git rev-list --count HEAD..origin/main`

If behind by more than 0 commits:
> "Your branch is behind main by <N> commit(s). Syncing before opening PR..."
Run: `git rebase origin/main`
If conflicts, stop and tell the developer to resolve with `/sync`.

**Step 6 — Determine PR title**

If `$ARGUMENTS` is provided, use it as the PR title.

If not provided, generate a title from the branch name and recent commits:
- Run: `git log origin/main..HEAD --oneline`
- Suggest a title based on the commits: "How about: `feat: add user authentication flow`?"
- Wait for developer to confirm or provide their own.

**Step 7 — Create the PR**

Run:
```
gh pr create \
  --base main \
  --head <CURRENT_BRANCH> \
  --title "<PR TITLE>" \
  --body "## What does this PR do?

<!-- Briefly describe the change and why it was made -->

## How to test

<!-- Steps to verify the change works. Preview URL: -->

## Checklist

- [ ] Tested on preview URL
- [ ] No console errors
- [ ] No hardcoded secrets or API keys
- [ ] New env vars documented in .env.example
- [ ] Tests pass locally (npm run test)

## Screenshots (if UI change)

<!-- Paste before/after screenshots here -->"
```

**Step 8 — Show result**

Display the PR URL returned by `gh pr create`.

```
✓ Pull request opened!
  Title:    <PR title>
  Branch:   <CURRENT_BRANCH> → main
  URL:      <PR URL>

Share the URL with a teammate for review.
They must approve before you can merge.
```

$ARGUMENTS
