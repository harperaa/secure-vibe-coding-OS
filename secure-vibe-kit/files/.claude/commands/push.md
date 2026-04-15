---
name: push
description: Push the current branch to GitHub. Automatically detects whether this is the first push and sets the upstream tracking with -u. Handles the common case where developers forget the -u flag. Use whenever a developer wants to push, sync to GitHub, or get a preview URL.
---

# Push

Push the current branch to GitHub, handling first-push upstream tracking automatically.

## Instructions

**Step 1 — Confirm current branch is not main or testing**

Run: `git branch --show-current`

If the current branch is `main`:
> "You are on `main`. You should not push directly to main — it is a protected branch. Create a feature branch first with `/start-feature`."
Stop here.

If the current branch is `testing`:
> "You are on `testing`. Use `/merge-to-testing` to merge your feature branch into testing rather than pushing to testing directly."
Stop here.

**Step 2 — Check for uncommitted changes**

Run: `git status --porcelain`

If there are uncommitted changes, warn:
> "You have uncommitted changes that won't be included in this push. Run `/save` first if you want to include them."
Ask: "Push anyway without the uncommitted changes? (yes/no)"
If no, stop.

**Step 3 — Detect whether upstream is already set**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If the command returns a value (upstream exists): this is a subsequent push.
  Run: `git push`

If the command returns nothing or an error: this is the first push for this branch.
  Run: `git push -u origin <current-branch-name>`

**Step 4 — Show result**

On success, display:
```
✓ Pushed: <branch-name> → origin/<branch-name>

Preview URL will be available shortly at:
  https://<project>-git-<branch-slug>.vercel.app

  (Check Vercel dashboard or the PR for the exact URL)

Next steps:
  /pr "title"   → open a pull request when ready
```

On failure (e.g., rejected push), show the git error and suggest:
> "Push was rejected. This usually means the remote has changes you don't have locally. Run `/sync` to rebase against the latest remote, then try `/push` again."

$ARGUMENTS
