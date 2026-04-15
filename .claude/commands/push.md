---
name: push
description: Push the current branch to GitHub. Checks for unstaged changes first, then handles both first-time pushes (sets upstream with -u) and subsequent pushes automatically. Triggers on "push", "push my code", "sync to GitHub", "get a preview URL", "push to remote".
---

# Push

Push the current branch to GitHub.

## Instructions

**Step 1 — Check for unstaged changes**

Run: `git status --porcelain`

If output is non-empty, stop:

```
⚠️  You have uncommitted changes:
  <list files>

Commit or stash them first:
  /commit      → commit your changes
  /stash-push  → stash them temporarily

Then run /push again.
```

**Step 2 — Guard against pushing main or testing directly**

Run: `git branch --show-current`

If current branch is `main`:
> "⛔  You are on main. Do not push directly to main — use a feature branch and open a PR instead."
Stop here.

If current branch is `testing`:
> "⛔  You are on testing. Use /merge-to-testing to add your feature branch to testing rather than pushing directly."
Stop here.

**Step 3 — Check for commits to push**

Run: `git rev-list --count @{u}..HEAD 2>/dev/null`

If this returns 0 (or fails because no upstream yet), check if there are any commits at all:
Run: `git log --oneline -1`

If no commits exist on the branch:
> "Nothing to push — no commits on this branch yet. Use /commit first."
Stop here.

**Step 4 — Detect first push vs subsequent push**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If no upstream is set → first push. Run:
```
git push -u origin <current-branch>
```

If upstream exists → subsequent push. Run:
```
git push
```

**Step 5 — Confirm**

On success:
```
✓ Pushed: <branch-name> → origin/<branch-name>

Your preview URL will be live shortly:
  https://<project>-git-<branch>.vercel.app

Next:
  /create-pull-request  → open a PR when ready
  /merge-to-testing     → add to testing for integrated validation
```

On failure (rejected):
> "Push was rejected — the remote branch has changes you don't have locally. Run /sync-feature-branch to rebase on the latest, then /push again."

$ARGUMENTS
