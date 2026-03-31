---
name: log
description: Show a clean, readable git log for the current branch — commits not yet in main, with author, date, and file summary. Use when a developer wants to review their work, see commit history, understand what changed, or prepare a PR description.
---

# Git Log

Show a readable history of commits on the current branch.

## Instructions

**Step 1 — Determine scope from $ARGUMENTS**

- No argument → commits on this branch not yet in main (`origin/main..HEAD`)
- `all` → full repo history, last 20 commits
- `main` → last 10 commits on main
- A number N (e.g. `10`) → last N commits on current branch
- A branch name → commits on that branch not in main

**Step 2 — Gather data**

For branch-vs-main view:
```bash
git log origin/main..HEAD \
  --pretty=format:"%C(yellow)%h%Creset  %s  %C(dim)%an · %ar%Creset" \
  --stat
```

For full history:
```bash
git log --oneline -20 --graph --decorate
```

**Step 3 — Also show diff summary for the branch**

Run:
```bash
git diff --stat origin/main...HEAD
```

**Step 4 — Display output**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BRANCH LOG — feat/your-branch
  Commits not yet in main: <N>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abc1234  feat: add login form           Dr. Bander · 2 hours ago
         src/components/LoginForm.tsx   (+82, -0)
         src/styles/login.css           (+24, -0)

def5678  fix: correct redirect path     Dr. Bander · 1 hour ago
         src/app/api/auth/route.ts      (+3, -1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total changes vs main:  +109 lines  -1 line  across 3 files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 5 — If no commits ahead of main**

> "No commits on this branch yet that aren't in main."

$ARGUMENTS
