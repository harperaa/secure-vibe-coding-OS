---
name: start-feature
description: Start a new feature, fix, or chore branch. Checks out main, pulls the latest changes, then creates a correctly named branch. Use whenever a developer says they want to start new work, begin a feature, create a branch, or start a fix.
---

# Start Feature

Start new work by ensuring you are on the latest `main` before branching.

## Instructions

The user wants to create a new branch. The argument passed is the branch name or a description of the work.

**Step 1 — Parse the branch name from $ARGUMENTS**

If `$ARGUMENTS` is provided:
- If it already starts with `feat/`, `fix/`, or `chore/`, use it as-is
- If the user described a feature (e.g. "user authentication"), prefix with `feat/` and convert spaces to hyphens → `feat/user-authentication`
- If the user described a bug fix (e.g. "fix login redirect"), prefix with `fix/` → `fix/login-redirect`
- If no arguments provided, ask the user: "What are you working on? I'll create the branch."

**Step 2 — Check for uncommitted changes**

Run: `git status --porcelain`

If there are uncommitted changes, stop and tell the user:
> "You have uncommitted changes on the current branch. Please commit or stash them first before starting a new branch. Run `/save` to commit, or `/discard` to throw them away."

**Step 3 — Switch to main and pull latest**

Run these commands in sequence and show output:
```
git checkout main
git pull origin main
```

If `git checkout main` fails because main doesn't exist locally yet, run:
```
git fetch origin
git checkout -b main origin/main
```

**Step 4 — Create the branch**

Run:
```
git checkout -b <branch-name>
```

**Step 5 — Confirm and orient the developer**

Print a clear summary:
```
✓ On branch: <branch-name>
✓ Branched from: main (up to date with origin)

Next steps:
  Make your changes, then:
  /save "feat: describe what you did"   → commit
  /push                                 → push to GitHub (creates preview URL)
  /pr "PR title"                        → open pull request when ready
```

$ARGUMENTS
