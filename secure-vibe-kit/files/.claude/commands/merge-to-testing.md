---
name: merge-to-testing
description: Merge the current feature branch into the shared testing branch for integrated validation. Used during large builds when multiple features need to be tested together before any PR to main. Handles the full sequence safely — stash, switch, pull, merge, push, switch back. Use when a developer says "merge to testing", "push to testing", "add to testing", or "combine features".
---

# Merge to Testing

Safely merge the current feature branch into `testing` for integrated validation.

## Instructions

**Important context to communicate:**
- `testing` is a shared scratchpad — multiple developers may be merging simultaneously
- `testing` is never merged back into `main` — each developer will open their own PR from their feature branch to main after validation
- Merging to testing does NOT replace the PR process

---

**Step 1 — Record current branch**

Run: `git branch --show-current`
Store as `FEATURE_BRANCH`.

If on `main` or `testing`:
> "You are on `<branch>`. Switch to your feature branch first."
Stop here.

**Step 2 — Check for uncommitted changes**

Run: `git status --porcelain`

If uncommitted changes exist:
> "You have uncommitted changes. Committing them before merging to testing..."
Run `/save` flow (stage all + prompt for commit message) OR:
> "Stash them first with `/save` or stash manually: `git stash`"
Stop here — require a clean state before switching branches.

**Step 3 — Confirm the feature branch is pushed**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`

If no upstream: push the feature branch first.
```
git push -u origin <FEATURE_BRANCH>
```

**Step 4 — Switch to testing and pull latest**

```
git checkout testing
git pull origin testing
```

If `testing` branch doesn't exist locally:
```
git fetch origin
git checkout -b testing origin/testing
```

If `origin/testing` doesn't exist at all:
> "The `testing` branch doesn't exist on remote. Creating it from main..."
```
git fetch origin
git checkout main
git pull origin main
git checkout -b testing
git push -u origin testing
```

**Step 5 — Merge the feature branch**

Run: `git merge <FEATURE_BRANCH> --no-ff -m "merge <FEATURE_BRANCH> into testing"`

The `--no-ff` flag keeps merge commits visible in testing history.

If merge has conflicts:
> "⚠️  Merge conflict between `<FEATURE_BRANCH>` and `testing`."
Run: `git diff --name-only --diff-filter=U`
Show conflicting files.
Instruct:
```
Resolve each conflict, then:
  git add <resolved-file>
  git merge --continue

To abort and go back to your feature branch:
  git merge --abort
  git checkout <FEATURE_BRANCH>
```
Stop here.

**Step 6 — Push testing**

```
git push origin testing
```

**Step 7 — Switch back to the feature branch**

```
git checkout <FEATURE_BRANCH>
```

**Step 8 — Confirm**

```
✓ Merged to testing
  Feature branch:  <FEATURE_BRANCH>
  Testing URL:     testing.yourapp.com
  (allow ~1 min for Vercel to deploy)

⚠️  Remember:
  testing is a scratchpad — never merge testing into main.
  When validation is complete, open your own PR:
    /pr "your PR title"
```

$ARGUMENTS
