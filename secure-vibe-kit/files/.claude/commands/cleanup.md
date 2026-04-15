---
name: cleanup
description: Delete local branches that have already been merged into main, and optionally prune remote-tracking references. Keeps the local repo tidy. Use when a developer wants to clean up old branches, says "delete merged branches", "prune branches", or the branches command shows many merged branches.
---

# Cleanup Merged Branches

Delete local branches already merged into `main`.

## Instructions

**Step 1 — Ensure we are on main and it is current**

Run: `git branch --show-current`

If not on main:
```bash
git checkout main
git pull origin main
```

**Step 2 — Find merged branches**

Run: `git branch --merged main`

Filter out protected branches: remove `main`, `testing`, and the current branch from the list.

If the list is empty:
> "No merged branches to clean up. All local branches are either unmerged or protected."
Stop here.

**Step 3 — Show what will be deleted**

```
The following local branches have been merged into main:
  feat/old-login
  fix/header-bug
  chore/update-deps

These branches are safe to delete — all their commits exist in main.
```

Ask: "Delete all <N> merged branches? (yes/no)"

If no: offer to delete individually by name.

**Step 4 — Delete merged local branches**

For each branch in the merged list (excluding protected):
```bash
git branch -d <branch-name>
```

Use `-d` (safe delete) not `-D` (force delete) — if a branch is not fully merged, git will refuse and that is correct behavior.

**Step 5 — Prune remote-tracking references**

Run: `git remote prune origin`

This removes local references to remote branches that no longer exist (e.g., branches deleted on GitHub after a PR merge).

Show: "Pruned stale remote-tracking references."

**Step 6 — Confirm**

```
✓ Cleanup complete

  Deleted: <N> merged local branches
  Pruned:  <N> stale remote-tracking refs

  Remaining local branches:
  <git branch output>
```

$ARGUMENTS
