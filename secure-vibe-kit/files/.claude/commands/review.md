---
name: review
description: Pull down a teammate's PR branch for local review, show the diff, run tests, and submit an approval or request-changes review via GitHub CLI. Use when a developer is asked to review a PR, wants to test a teammate's branch, or says "review PR", "check out their branch", "approve the PR".
---

# Review a Pull Request

Check out a teammate's PR locally, review the changes, and submit a GitHub review.

## Instructions

**Step 1 — Require a PR number from $ARGUMENTS**

If no argument: ask "Which PR number do you want to review?"

**Step 2 — Check GitHub CLI**
Run: `gh --version 2>/dev/null || echo "NOT_FOUND"`
If missing: "Install gh CLI from https://cli.github.com" — stop.

**Step 3 — Fetch PR details**

Run: `gh pr view <PR-NUMBER>`

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PR #<N> — <title>
  Author:    <author>
  Branch:    <head> → main
  Status:    <open/draft>
  CI:        <passing/failing/pending>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<PR body>
```

**Step 4 — Check current CI status**

Run: `gh pr checks <PR-NUMBER>`

If CI is failing: warn the reviewer before they invest time in local review.
"⚠️  CI is currently failing on this PR. You may want to wait for it to pass before reviewing."

**Step 5 — Stash any current work**

Run: `git status --porcelain`
If changes exist: `git stash push -u -m "WIP before reviewing PR #<N>"`

**Step 6 — Check out the PR branch locally**

Run: `gh pr checkout <PR-NUMBER>`

This fetches and checks out the PR's branch.

**Step 7 — Show the diff summary**

Run:
```bash
git diff main..HEAD --stat
git log main..HEAD --oneline
```

Display:
```
Changes vs main:
  <N> files changed, <X> insertions, <Y> deletions

Commits:
  <log>
```

Ask: "Would you like to see the full diff? (yes/no)"
If yes: `git diff main..HEAD`

**Step 8 — Run tests**

Ask: "Run the test suite now? (yes/no)"
If yes:
```bash
npm run lint 2>&1 | tail -20
npm run test 2>&1 | tail -30
```

Report results clearly.

**Step 9 — Submit the review**

Ask: "Submit your review as: [1] Approve  [2] Request changes  [3] Comment only  [4] Skip"

If approve:
```bash
gh pr review <PR-NUMBER> --approve --body "<optional comment>"
```

If request changes: prompt for feedback comment, then:
```bash
gh pr review <PR-NUMBER> --request-changes --body "<feedback>"
```

If comment only:
```bash
gh pr review <PR-NUMBER> --comment --body "<comment>"
```

**Step 10 — Return to previous branch and restore stash**

```bash
git checkout -
git stash pop 2>/dev/null || true
```

"✓ Review submitted. Switched back to your previous branch."

$ARGUMENTS
