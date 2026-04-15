---
name: create-pull-request
description: Open a pull request from the current feature branch to main. Checks for unstaged changes, confirms the correct branch, syncs with latest main via rebase, force-pushes the updated branch, then creates the PR via GitHub CLI with a strong title. Triggers on "open a PR", "create PR", "submit for review", "pull request", "ready for review".
---

# Create Pull Request

Pre-flight check, sync with main, then open the PR.

## Instructions

**Step 1 — Check for unstaged changes**

Run: `git status --porcelain`

If output is non-empty, stop:

```
⚠️  You have uncommitted changes:
  <list files>

Commit or stash them first:
  /commit      → commit your changes
  /stash-push  → stash them temporarily

Then run /create-pull-request again.
```

**Step 2 — Confirm we are on a feature branch**

Run: `git branch --show-current`
Store as `CURRENT_BRANCH`.

If on `main`:
> "⛔  You are on main. Switch to your feature branch before opening a PR."
Stop here.

If on `testing`:
> "⛔  You are on testing. PRs must come from your feature branch, not from testing. Switch to your feature branch."
Stop here.

If branch name does not match a known prefix (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`), warn but continue:
> "⚠️  Branch `<name>` doesn't follow the standard naming convention. Continuing anyway."

**Step 3 — Check GitHub CLI is installed**

Run: `gh --version 2>/dev/null || echo "NOT_FOUND"`

If not found:
> "⛔  GitHub CLI (gh) is not installed. Install from https://cli.github.com then run `gh auth login`."
Stop here.

**Step 4 — Fetch latest from remote**

```
git fetch origin
```

**Step 5 — Rebase on latest main**

```
git rebase origin/main
```

This replays your commits on top of the current tip of main so the PR diff is clean and up to date.

If rebase has conflicts:
```
⚠️  Rebase conflict — your branch conflicts with recent changes on main:
  <list conflicting files>

Resolve each file, then:
  git add <file>
  git rebase --continue

To cancel:
  git rebase --abort

Then run /create-pull-request again.
```
Stop here.

**Step 6 — Force push the rebased branch**

```
git push --force-with-lease
```

`--force-with-lease` safely overwrites the remote branch after rebase. It refuses if someone else has pushed to the branch since your last fetch.

If push is rejected:
> "Push rejected — someone else pushed to this branch. Run `git fetch` and review before retrying."
Stop here.

**Step 7 — Determine the PR title**

If `$ARGUMENTS` is provided, use it as the PR title.

If not provided:
- Run: `git log origin/main..HEAD --oneline`
- Look at the commits on this branch
- Generate a strong, specific PR title in imperative mood
- Show: "Proposed PR title: `Add user login with email and password auth`"
- Ask: "Use this title? (yes / type your own)"

A strong title:
- States what the PR does, not what you changed
- Is specific enough that anyone can understand it without context
- Does NOT start with the branch name or ticket number alone

**Step 8 — Create the PR**

```
gh pr create \
  --base main \
  --head <CURRENT_BRANCH> \
  --title "<PR TITLE>" \
  --body "## What does this PR do?

<!-- Briefly describe the change and why it was made -->

## How to test

<!-- Steps to verify. Preview URL: -->

## Checklist

- [ ] Tested on preview URL
- [ ] No console errors
- [ ] No hardcoded secrets or API keys
- [ ] New env vars added to .env.example
- [ ] Tests pass (npm run test)"
```

**Step 9 — Confirm**

```
✓ Pull request created
  Title:  <PR title>
  Branch: <CURRENT_BRANCH> → main
  URL:    <PR URL>

Share the URL with a teammate for review.
The PR cannot merge until at least one person approves it
(you cannot approve your own PR).
```

$ARGUMENTS
