---
name: sync-feature-branch
description: Sync a personal feature branch with the latest commits from main using rebase. Fetches, rebases, then force-pushes. Only runs on feature branches — refuses to run on main or testing where rebase would be destructive. Use before opening a PR or when main has moved forward. Triggers on "sync my branch", "update from main", "rebase on main", "my branch is behind main", "sync feature branch".
---

# Sync Feature Branch

Bring a feature branch up to date with the latest main using rebase.

## Why rebase here, not merge

Rebase replays your commits on top of the current tip of main, keeping your branch history clean and linear. It is safe on personal feature branches because only you push to them. It must NOT be used on `testing` or `main` — those are shared branches where rewriting history would break everyone else.

## Instructions

**Step 1 — Guard: refuse on shared branches**

Run: `git branch --show-current`
Store as `CURRENT_BRANCH`.

If `CURRENT_BRANCH` is `main`:
```
⛔  You are on main. This command is for feature branches only.
    main should never be rebased.
```
Stop here.

If `CURRENT_BRANCH` is `testing`:
```
⛔  You are on testing. Rebasing a shared branch would break
    every developer who has testing checked out locally.

    To sync testing with main, use: /sync-testing-branch
    That command uses git merge (safe for shared branches).
```
Stop here.

**Step 2 — Check for unstaged changes**

Run: `git status --porcelain`

If output is non-empty:
```
⚠️  You have uncommitted changes. Stash them first:
  /stash-push  → save temporarily
  /commit      → commit them

Then run /sync-feature-branch again.
```
Stop here.

**Step 3 — Fetch latest from remote**

```
git fetch origin
```

**Step 4 — Check how far behind main we are**

Run: `git rev-list --count HEAD..origin/main`

If output is `0`:
> "Already up to date — no new commits on main."
Stop here.

Show: `main has <N> new commit(s) since this branch was created. Rebasing...`

**Step 5 — Rebase on latest main**

```
git rebase origin/main
```

If rebase conflicts:
```
⚠️  Rebase conflict in:
  <list conflicting files>

For each file: resolve the conflict markers, then:
  git add <file>
  git rebase --continue

To cancel and return to where you started:
  git rebase --abort
```
Stop here.

**Step 6 — Force push the rebased branch**

```
git push --force-with-lease
```

`--force-with-lease` is the safe force push — it refuses if someone else has pushed to this branch since your last fetch.

**Step 7 — Confirm**

```
✓ Feature branch synced with main
  Branch:  <CURRENT_BRANCH>
  Rebased: <N> commit(s) from main incorporated

Your branch is now up to date.
Run /create-pull-request when ready.
```

$ARGUMENTS
