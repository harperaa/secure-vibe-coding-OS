---
name: sync-testing-branch
description: Sync the testing branch with the latest commits from main using merge. Testing is shared — merge is used instead of rebase to avoid rewriting history and breaking teammates. Switches to testing, pulls, merges main, pushes, then returns to the original branch. Triggers on "sync testing", "update testing from main", "testing is out of date", "sync testing branch", "keep testing current".
---

# Sync Testing Branch

Merge the latest main into testing so the integration environment stays representative of production.

## Why merge here, not rebase

`testing` is a shared branch. Rebasing would rewrite its entire commit history — every developer with `testing` checked out locally would have a broken copy. Merge adds a single new merge commit on top, keeping history intact and allowing everyone to `git pull` cleanly.

Use `/sync-feature-branch` for your personal feature branch — that uses rebase, which is appropriate there.

## Instructions

**Step 1 — Guard: refuse on feature branches and main**

Run: `git branch --show-current`
Store as `CURRENT_BRANCH`.
Store as `RETURN_BRANCH` to switch back at the end.

If `CURRENT_BRANCH` matches a feature prefix (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`):
```
⛔  You are on a feature branch: <CURRENT_BRANCH>

    /sync-testing-branch syncs the shared testing branch with main.
    Did you mean /sync-feature-branch instead?
    That rebases your feature branch on the latest main.
```
Ask: "Switch to testing and sync it? (yes/no)"
If no, stop.

If `CURRENT_BRANCH` is `main`:
> "You are on main. Switching to testing to run the sync."

**Step 2 — Check for uncommitted changes on current branch**

Run: `git status --porcelain`

If non-empty:
```
⚠️  You have uncommitted changes on <CURRENT_BRANCH>.
    Stash them first so you can switch branches cleanly:
    /stash-push
```
Stop here.

**Step 3 — Switch to testing and pull latest**

```
git checkout testing
git pull origin testing
```

If `testing` does not exist locally:
```
git fetch origin
git checkout -b testing origin/testing
```

If `origin/testing` does not exist:
> "The testing branch does not exist yet. Create it by running /merge-to-testing from your feature branch first."
Stop here.

**Step 4 — Check how far behind main testing is**

Run:
```
git fetch origin main
git rev-list --count testing..origin/main
```

If output is `0`:
> "testing is already up to date with main."
Switch back to `RETURN_BRANCH` and stop.

Show: `testing is behind main by <N> commit(s). Merging...`

**Step 5 — Merge main into testing**

```
git merge origin/main --no-ff -m "chore: sync testing with main"
```

If merge conflicts:
```
⚠️  Merge conflict — a feature previously merged into testing
    conflicts with a recent change on main:
  <list conflicting files>

Resolve each file, then:
  git add <file>
  git merge --continue

To cancel:
  git merge --abort
```
Stop here.

**Step 6 — Push testing**

```
git push origin testing
```

This is a regular push (no force needed — merge does not rewrite history).

**Step 7 — Return to original branch**

```
git checkout <RETURN_BRANCH>
```

**Step 8 — Confirm**

```
✓ testing synced with main
  New commits merged: <N>
  testing URL rebuilding: testing.yourapp.com (~1 min)

Back on: <RETURN_BRANCH>
```

$ARGUMENTS
