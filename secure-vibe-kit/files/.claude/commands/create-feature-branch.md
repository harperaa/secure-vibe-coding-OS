---
name: create-feature-branch
description: Start new work by creating a properly named feature branch from the latest main. Checks for unstaged changes first, switches to main, pulls latest, then creates the branch. Use when starting any new feature, bug fix, or maintenance task. Triggers on "start a feature", "new branch", "create branch", "begin work on", "start working on".
---

# Create Feature Branch

Start clean from the latest main.

## Instructions

**Step 1 — Check for unstaged changes**

Run: `git status --porcelain`

If output is non-empty, stop and tell the user:

```
⚠️  You have uncommitted changes:
  <list files from git status>

Please handle these before creating a new branch:
  /commit      → commit your changes
  /stash-push  → stash them temporarily

Then run /create-feature-branch again.
```

**Step 2 — Determine branch type and name**

If `$ARGUMENTS` is provided, infer the prefix from the description:
- Describes a new capability, screen, or feature → `feat/`
- Describes a bug, error, or broken behavior → `fix/`
- Describes cleanup, dependency update, or config change → `chore/`
- Describes documentation changes → `docs/`
- If unclear, default to `feat/` and tell the user which was chosen

Convert the description to kebab-case (lowercase, hyphens):
- "user login page" → `feat/user-login-page`
- "fix null crash on dashboard" → `fix/null-crash-dashboard`
- "update dependencies" → `chore/update-dependencies`

If no `$ARGUMENTS` provided, ask:
> "What are you working on? (e.g. 'user login page', 'fix redirect bug', 'update deps')"

Show the proposed branch name and ask: "Create branch `<name>`? (yes/no)"

**Step 3 — Switch to main**

```
git checkout main
```

**Step 4 — Pull latest main**

```
git pull origin main
```

Show how many new commits arrived: "Pulled <N> new commit(s) from main."

If pull fails (diverged history):
> "Could not pull main cleanly. Check your local main branch — it may have commits that aren't on the remote. Run `git log origin/main..main` to inspect."
Stop here.

**Step 5 — Create the feature branch**

```
git checkout -b <branch-name>
```

**Step 6 — Confirm**

```
✓ Ready to work
  Branch:  <branch-name>
  Based on: main (up to date)

Next steps:
  Write your code, then:
  /commit          → save your work
  /push            → push to GitHub (creates preview URL)
```

$ARGUMENTS
