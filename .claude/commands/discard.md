---
name: discard
description: Discard uncommitted changes — either for a specific file or all changes. Always shows what will be lost and requires explicit confirmation before doing anything irreversible. Use when a developer wants to throw away changes, start over, or says "discard", "revert my changes", "start fresh", "undo my edits".
---

# Discard Changes

Throw away uncommitted changes. Always confirms before acting — this cannot be undone.

## Instructions

**Step 1 — Check what is actually changed**

Run: `git status --porcelain`

If nothing changed:
> "Nothing to discard — your working tree is clean."
Stop here.

**Step 2 — Determine scope from $ARGUMENTS**

- A specific filename → discard only that file
- `all` or no argument → discard all uncommitted changes
- A glob pattern (e.g. `src/`) → discard changes in that directory

**Step 3 — Show exactly what will be lost**

If discarding a specific file:
Run: `git diff <filename>`
Show the diff so the developer can see what is about to disappear.

If discarding all:
Run: `git diff` and `git status`
Show summary of all changed files.

Display:
```
⚠️  THIS CANNOT BE UNDONE

The following changes will be permanently discarded:
  <list of files or diff output>

This does NOT undo commits — only uncommitted changes.
To undo a commit instead, use: /undo
```

**Step 4 — Require explicit confirmation**

Ask: "Type `yes` to permanently discard these changes, or anything else to cancel."

If not `yes`: stop immediately and say:
> "Cancelled — no changes were discarded."

**Step 5 — Execute the discard**

For a specific file:
```bash
git restore <filename>
```

For all changes (staged and unstaged):
```bash
git restore .
git restore --staged .
```

For untracked files (new files not yet committed), also run:
```bash
git clean -fd
```
But only if the developer explicitly confirms untracked files should also be removed. Show untracked files separately and get separate confirmation.

**Step 6 — Confirm**

Run: `git status`

```
✓ Changes discarded
  Working tree is now clean.
```

$ARGUMENTS
