---
name: testing-status
description: Show what commits and feature branches are currently in testing that have not yet been merged to main. Helps the team understand the current state of the integration environment. Use when coordinating a large build, checking if testing is stable, or deciding if it is safe to merge to testing.
---

# Testing Branch Status

Show what is in `testing` vs `main`.

## Instructions

**Step 1 — Fetch latest from remote**

Run: `git fetch origin`

**Step 2 — Gather testing vs main data**

Run:
```bash
git log origin/main..origin/testing --oneline --no-merges
git log origin/main..origin/testing --oneline --merges
git rev-list --count origin/main..origin/testing
```

**Step 3 — Identify which feature branches contributed commits**

For each commit in testing that is not in main, extract the branch name from merge commits or the commit message to group by contributor.

**Step 4 — Check if testing is ahead or behind main**

Run:
```bash
git rev-list --count origin/testing..origin/main
```

If testing is behind main (main has moved forward):
> "⚠️  `testing` is <N> commit(s) behind `main`. The team may want to merge main into testing to stay current."

**Step 5 — Display output**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TESTING STATUS
  URL: testing.yourapp.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commits in testing NOT yet in main: <N>

Feature branches merged into testing:
  feat/auth        (Dr. Bander)  — 3 commits
  feat/reports     (Sam)      — 2 commits
  feat/billing     (Tzipporah)— 5 commits

Individual commits (not yet in main):
  abc1234  feat: add login page
  def5678  feat: add report filter
  ...

Testing is <N> commit(s) ahead of main.
Testing is <N> commit(s) behind main (main has moved).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 6 — Remind about the testing rules**

```
Reminders:
  ✓ testing is a scratchpad — never merge testing → main
  ✓ Each developer PRs their own feature branch → main
  ✓ After validation, run /pr from your feature branch
```

$ARGUMENTS
