---
name: status
description: Show a comprehensive workflow status for the current branch — what branch you are on, how many commits ahead or behind main, uncommitted changes, whether the branch is pushed, and recent commit history. Use whenever a developer wants to know where they are, what state things are in, or says "what's my status", "where am I", "what's going on".
---

# Workflow Status

Show a complete picture of the current working state.

## Instructions

Gather and display all of the following in one clean summary.

**Gather data — run all commands:**

```bash
git branch --show-current
git status --porcelain
git log --oneline -5
git rev-list --count HEAD..origin/main 2>/dev/null || echo "0"
git rev-list --count origin/main..HEAD 2>/dev/null || echo "0"
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "NO_UPSTREAM"
git stash list
```

**Format and display the results:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKFLOW STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch:       <current branch>
Upstream:     <origin/branch-name or "not set — run /push to create">

Position vs main:
  <N> commits ahead of main   (your work not yet in main)
  <N> commits behind main     (main has moved — run /sync before PR)

Uncommitted changes:
  <list of modified/added/deleted files, or "Clean — nothing to commit">

Stash:
  <number> stash entries  (or "Empty")

Recent commits (last 5):
  <git log --oneline output>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Suggested next step:
  <context-aware suggestion based on state — see below>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Context-aware next step logic:**

- If on `main` with clean state → "You are on main. Run `/start-feature <name>` to begin new work."
- If on feature branch with uncommitted changes → "Run `/save` to commit your work."
- If on feature branch, clean, no upstream → "Run `/push` to push your branch and get a preview URL."
- If on feature branch, clean, upstream set, 0 commits ahead → "Nothing new to push."
- If on feature branch, behind main by > 0 → "Run `/sync` to rebase against latest main before opening a PR."
- If on feature branch, ahead of main, upstream set, clean → "Ready for PR. Run `/pr` when you are satisfied with the preview."
- If stash is non-empty → "You have stashed changes — run `git stash pop` to restore them."

$ARGUMENTS
