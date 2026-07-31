---
name: git-workflow
description: The end-to-end branch workflow for this repo — how the slash commands chain together to go from starting a feature to opening a PR, how to park work mid-task, and how to keep branches current. Use when starting new work, when unsure which command comes next, or when a branch has fallen behind main.
---

# Git Workflow

Order of operations for the slash commands in `.claude/commands/`.

## Everyday Workflow

```
/create-feature-branch user-login     ← start
  ... write code ...
/commit                               ← save
/push                                 ← sync to GitHub, get preview URL
  ... test on preview URL ...
/security-assessment                  ← assess before PR
/create-pull-request                  ← open PR for review
```

## When You Need to Step Away Mid-Work

```
/stash-push    ← park your changes
  ... do other things ...
/stash-pop     ← restore and continue
```

## Keeping Branches Current

```
/sync-feature-branch    ← rebase YOUR branch on latest main (personal only)
/sync-testing-branch    ← merge main into testing (shared branch, uses merge)
```

`/sync-feature-branch` rebases and force-pushes, so it is only ever safe on a
branch nobody else has checked out. `testing` is shared, which is why
`/sync-testing-branch` merges instead — see the Branch Rules table in `CLAUDE.md`.
