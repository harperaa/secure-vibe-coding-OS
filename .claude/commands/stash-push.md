---
name: stash-push
description: Temporarily save uncommitted changes so you can switch context or run another command that requires a clean working tree. Includes untracked files. Triggers on "stash", "stash my changes", "save temporarily", "put this aside", "stash push".
---

# Stash Push

Temporarily shelve uncommitted changes.

## Instructions

**Step 1 — Check there is something to stash**

Run: `git status --porcelain`

If output is empty:
> "Nothing to stash — your working tree is clean."
Stop here.

**Step 2 — Show what will be stashed**

Run: `git status --short`
Display the list of files.

**Step 3 — Create the stash with a descriptive label**

Run: `git branch --show-current` to get the branch name.

```
git stash push -u -m "WIP: <branch-name> — <timestamp>"
```

`-u` includes untracked (new) files that haven't been staged yet.

**Step 4 — Confirm**

Run: `git stash list | head -3`

```
✓ Changes stashed
  Label: WIP: <branch-name> — <timestamp>

Your working tree is now clean.

To restore: /stash-pop
To see all stashes: git stash list
```

$ARGUMENTS
