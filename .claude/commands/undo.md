---
name: undo
description: Safely undo the last git commit while keeping the changes in the working directory. Use when a developer made a mistake in a commit, wants to reword a commit message, needs to split a commit, or says "undo my last commit", "uncommit", "take back that commit".
---

# Undo Last Commit

Undo the most recent commit while preserving the changes.

## Instructions

**Step 1 — Show what will be undone**

Run: `git log --oneline -3`

Display the last 3 commits so the developer can see exactly what they're undoing:
```
About to undo:
  abc1234  feat: add user login form   ← this commit will be undone
  def5678  chore: update dependencies
  ghi9012  fix: correct redirect URL
```

Ask for confirmation: "Undo the most recent commit and keep the changes? (yes/no)"

If no: stop.

**Step 2 — Determine undo type from $ARGUMENTS**

- No argument or `staged` → `git reset HEAD~1` (undo commit, keep changes staged)
- `unstaged` → `git reset --mixed HEAD~1` (undo commit, unstage changes)
- `discard` → STOP — this is destructive. Tell the user to use `/discard` instead and explain the difference
- A number N (e.g. `3`) → undo the last N commits: `git reset HEAD~N`

**Step 3 — Check if branch has an upstream and warn about force push**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If upstream exists AND the commit being undone has already been pushed:
> "⚠️  This commit has already been pushed to GitHub. After undoing it locally, you will need to force push: `git push --force-with-lease`"
> "This rewrites the remote branch history. If teammates have pulled this branch, they will need to run: `git reset --hard origin/<branch-name>`"
> "Only do this if you are the sole developer on this branch."

**Step 4 — Execute the undo**

Run: `git reset HEAD~1` (or appropriate variant)

**Step 5 — Show result**

Run: `git status` and `git log --oneline -3`

```
✓ Commit undone — changes preserved

Your changes are now staged (ready to re-commit).

Recent history:
  def5678  chore: update dependencies   ← now your HEAD
  ghi9012  fix: correct redirect URL

Your uncommitted changes:
  <git status output>

Next steps:
  /save "new commit message"   → re-commit with a better message
  Or make additional edits before committing
```

$ARGUMENTS
