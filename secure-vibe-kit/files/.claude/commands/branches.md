---
name: branches
description: List all local and remote branches with their ahead/behind status relative to main, and flag which ones have already been merged. Use when a developer wants to see all branches, find a branch, or figure out what work is in flight across the team.
---

# Branches

List all branches with status relative to `main`.

## Instructions

**Step 1 — Fetch to get current remote info**

Run: `git fetch origin --prune`

The `--prune` flag removes remote-tracking references to branches that no longer exist on the remote.

**Step 2 — Gather branch data**

Run:
```bash
git branch -a --format="%(refname:short) %(upstream:short) %(upstream:track)"
git branch --merged main
git branch --no-merged main
```

**Step 3 — For each local branch, get ahead/behind counts**

For each local branch (not `main` or `testing`):
```bash
git rev-list --count main..<branch>   # commits ahead
git rev-list --count <branch>..main   # commits behind
```

**Step 4 — Display formatted output**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BRANCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  * = current branch   ✓ = merged into main   ⚠ = no upstream

LOCAL BRANCHES
  * feat/current-branch     ↑3 ahead  ↓0 behind  [upstream: origin/feat/current-branch]
    feat/other-feature      ↑1 ahead  ↓2 behind  [upstream: origin/feat/other-feature]
    fix/old-bug          ✓  ↑0 ahead  ↓0 behind  (merged — safe to delete: /cleanup)
    chore/no-upstream    ⚠  (not pushed yet — run /push)

PROTECTED BRANCHES
    main                    (production)
    testing                 (integration validation)

REMOTE BRANCHES (not local)
    origin/feat/teammate-branch    (not checked out locally)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To check out a remote branch:  git checkout <branch-name>
To delete merged branches:     /cleanup
```

**Step 5 — If any branches are merged into main, suggest cleanup**

> "You have <N> branch(es) already merged into main. Run `/cleanup` to remove them."

$ARGUMENTS
