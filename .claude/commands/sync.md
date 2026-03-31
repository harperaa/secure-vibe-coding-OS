---
name: sync
description: Sync the current feature branch with the latest changes from main. Fetches remote changes and rebases the current branch on top of origin/main. Use before opening a PR, when main has moved forward, or when a push is rejected because of diverged history.
---

# Sync with Main

Fetch the latest from remote and rebase the current branch on top of `origin/main`.

## Instructions

**Step 1 — Confirm not on main**

Run: `git branch --show-current`

If on `main`, just pull and confirm:
```
git pull origin main
```
> "You are on `main` — pulled the latest changes."
Stop here.

**Step 2 — Check for uncommitted changes**

Run: `git status --porcelain`

If there are uncommitted changes:
> "You have uncommitted changes. Stashing them temporarily before syncing..."
Run: `git stash`
Set a flag to restore stash after sync.

**Step 3 — Fetch latest from remote**

Run: `git fetch origin`

Show: `✓ Fetched latest from origin`

**Step 4 — Check how far behind we are**

Run: `git rev-list --count HEAD..origin/main`

If output is `0`:
> "Already up to date — no new commits on main."
If stash was created, pop it: `git stash pop`
Stop here.

Otherwise show: `Your branch is behind main by <N> commit(s). Rebasing...`

**Step 5 — Rebase**

Run: `git rebase origin/main`

If rebase succeeds cleanly, continue.

If rebase has conflicts (exit code non-zero):
> "⚠️  Rebase conflicts detected in the following files:"
Run: `git diff --name-only --diff-filter=U`
Show the conflicting files, then instruct:
```
For each file listed:
  1. Open it and look for <<<<<<< HEAD markers
  2. Resolve the conflict
  3. Run: git add <file>
  4. Run: git rebase --continue

If you want to abandon the sync and go back:
  Run: git rebase --abort
```
Stop here — do not continue until conflicts are resolved.

**Step 6 — Restore stash if we created one**

If we stashed changes earlier, run: `git stash pop`

If pop has conflicts, warn:
> "Your stashed changes conflict with the rebased code. Review the conflicts above."

**Step 7 — Confirm success**

Run: `git log --oneline -5`

Display:
```
✓ Synced with origin/main
  Branch: <branch-name>
  Latest 5 commits:
  <log output>

Run /push to update the remote branch.
```

$ARGUMENTS
