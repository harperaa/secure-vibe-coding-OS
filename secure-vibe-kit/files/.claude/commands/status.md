---
name: status
description: Show a clear, plain-English summary of the current git state — what branch you are on, what has changed, whether you are ahead or behind main, and what to do next. Designed to answer "where am I and what should I do?" at a glance. Triggers on "status", "where am I", "what's going on", "what state am I in", "git status", "show me the status".
---

# Status

Show a clear summary of where things stand.

## Instructions

Run all of these commands to gather the full picture:

```
git branch --show-current
git status --short
git log --oneline -5
git rev-list --count HEAD..origin/main 2>/dev/null
git rev-list --count origin/main..HEAD 2>/dev/null
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
git stash list
```

Then display everything in plain English — no raw git output. Translate each piece into a clear statement a non-expert can understand.

Format the output like this:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch:   feat/user-login
On GitHub: yes — connected to origin/feat/user-login

Position vs main:
  You are 3 commits AHEAD of main
    (your work is not in main yet — that is normal)
  You are 0 commits BEHIND main
    (you have the latest main changes)

Changes in your working folder:
  Modified (not yet committed):
    src/components/LoginForm.tsx
    src/styles/login.css
  New file (not yet committed):
    src/utils/auth.ts

Recent commits on this branch:
  abc1234  feat: add login form layout
  def5678  feat: add email input validation
  ghi9012  chore: create feature branch

Stash: empty

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to do next:
  /commit               → save your uncommitted changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Plain-English rules for the "What to do next" section:**

Provide ONE clear next step based on the actual state. Use this logic:

| State | Suggested next step |
|---|---|
| On `main`, nothing changed | `/create-feature-branch` — start new work |
| On feature branch, uncommitted changes | `/commit` — save your work |
| On feature branch, committed but not pushed | `/push` — sync to GitHub |
| On feature branch, pushed, ahead of main, clean | `/create-pull-request` — open a PR when ready |
| On feature branch, behind main | `/sync-feature-branch` — get latest main changes |
| On `testing`, clean | `/sync-testing-branch` or switch to your feature branch |
| Stash is non-empty | Consider: `/stash-pop` to restore your stashed changes |

Never list multiple options. Pick the single most useful next action and state it clearly.

$ARGUMENTS
