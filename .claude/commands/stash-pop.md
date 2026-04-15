---
name: stash-pop
description: Restore the most recently stashed changes back to the working tree. Shows what will be restored before applying. Triggers on "restore stash", "pop stash", "get my changes back", "unstash", "stash pop".
---

# Stash Pop

Restore your most recently stashed changes.

## Instructions

**Step 1 — Check that a stash exists**

Run: `git stash list`

If output is empty:
> "No stashed changes to restore."
Stop here.

**Step 2 — Show what will be restored**

Run: `git stash show -p stash@{0} --stat`

Display the file list:
```
About to restore:
  <list of files from stash>

Most recent stash: <stash label>
```

**Step 3 — Pop the stash**

```
git stash pop
```

**Step 4 — Handle conflicts on pop**

If pop has conflicts (non-zero exit):
```
⚠️  Stash conflicts with your current working tree:
  <list conflicting files>

Resolve the conflicts in each file, then:
  git add <file>
  git stash drop   ← removes the stash entry after resolving

The stash has NOT been dropped yet — your changes are safe.
```
Stop here.

**Step 5 — Confirm success**

Run: `git status --short`

```
✓ Stash restored
  Your changes are back in the working tree.

  <git status output>

Run /commit when you are ready to save them.
```

If additional stashes remain:
Run: `git stash list | wc -l`
> "You have <N> more stash entries. Run `git stash list` to see them."

$ARGUMENTS
