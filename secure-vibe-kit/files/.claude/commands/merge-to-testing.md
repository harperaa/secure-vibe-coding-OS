---
name: merge-to-testing
description: Merge the current feature branch into the shared testing branch for integrated validation. Used when multiple features need to be tested together before any PR to main. Checks for unstaged changes, records the source branch, switches to testing, merges, then switches back. Triggers on "merge to testing", "push to testing", "add to testing", "test together", "integration test".
---

# Merge to Testing

Add the current feature branch to the shared testing environment.

## When to use this

Use testing when you need to validate your feature alongside other features before opening a PR. For solo feature validation, your preview URL is sufficient — testing is for integrated validation only.

**Remember:** testing is a scratchpad. Never merge testing into main. Each developer PRs their own feature branch to main independently after testing.

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

Then run /merge-to-testing again.
```

**Step 2 — Record the current feature branch**

Run: `git branch --show-current`
Store as `FEATURE_BRANCH`.

If current branch is `main` or `testing`:
> "⛔  You must be on a feature branch to run /merge-to-testing. Switch to your feature branch first."
Stop here.

**Step 3 — Ensure the feature branch is pushed to remote**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If no upstream — push first so the feature branch exists on remote:
```
git push -u origin <FEATURE_BRANCH>
```

**Step 4 — Switch to testing and pull latest**

```
git checkout testing
git pull origin testing
```

If `testing` does not exist locally:
```
git fetch origin
git checkout -b testing origin/testing
```

If `origin/testing` does not exist at all, create it from main:
```
git fetch origin
git checkout main
git pull origin main
git checkout -b testing
git push -u origin testing
```
> "Created the testing branch from main."

**Step 5 — Merge the feature branch**

```
git merge <FEATURE_BRANCH> --no-ff -m "merge <FEATURE_BRANCH> into testing"
```

`--no-ff` keeps a visible merge commit in the history.

If merge conflicts:
```
⚠️  Merge conflict between <FEATURE_BRANCH> and testing:
  <list conflicting files>

Resolve each file, then:
  git add <file>
  git merge --continue

To cancel and go back:
  git merge --abort
  git checkout <FEATURE_BRANCH>
```
Stop here.

**Step 6 — Push testing**

```
git push origin testing
```

**Step 7 — Return to feature branch**

```
git checkout <FEATURE_BRANCH>
```

**Step 8 — Confirm**

```
✓ Merged to testing
  From:    <FEATURE_BRANCH>
  To:      testing
  URL:     testing.yourapp.com (rebuilding — ~1 min)

Back on:   <FEATURE_BRANCH>

⚠️  Remember:
  testing is a scratchpad — never merge testing → main
  When validation passes, use /create-pull-request
```

$ARGUMENTS
