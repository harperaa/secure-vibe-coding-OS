---
name: hotfix
description: Emergency production fix workflow — branch from main, make the fix, fast-track PR to main with a hotfix label. Use when there is a live production issue that needs immediate attention, a developer says "production is broken", "emergency fix", "hotfix", or "bug in prod".
---

# Hotfix — Emergency Production Fix

Branch from main, fix, and fast-track to production.

## Instructions

**Step 1 — Communicate the urgency context**

Before doing anything, display:
```
⚡ HOTFIX MODE
  You are about to start an emergency production fix.
  Branch: fix/<name> will be created from latest main.
  This still requires a PR — but use the hotfix label
  and ping a teammate for immediate review.
```

**Step 2 — Get hotfix name from $ARGUMENTS**

If no argument: ask "Describe the fix in a few words (e.g. 'login-null-crash'):"
Format as `fix/hotfix-<name>` with hyphens.

**Step 3 — Stash any current work**

Run: `git status --porcelain`
If changes exist:
```bash
git stash push -u -m "WIP before hotfix: $(git branch --show-current)"
```

**Step 4 — Branch from latest main**

```bash
git checkout main
git pull origin main
git checkout -b fix/hotfix-<name>
```

**Step 5 — Confirm and orient**

```
✓ On branch: fix/hotfix-<name>
  Branched from: main (latest)

Make your fix now, then:
  /save "fix: <describe the fix>"
  /push
  /pr "hotfix: <describe>"   → immediately ping a teammate for review
```

**Step 6 — After the fix is committed and pushed (if developer returns to this command)**

If $ARGUMENTS contains "pr" or "open-pr":

Run:
```bash
gh pr create \
  --base main \
  --title "🚨 hotfix: <name>" \
  --label "hotfix" \
  --body "## Emergency fix

**Problem:** <describe the production issue>

**Fix:** <describe what was changed>

**Tested:** <how was it verified>

## Checklist
- [ ] Reproduces the issue locally before fix
- [ ] Fix confirmed working on preview URL
- [ ] No unintended side effects
- [ ] Teammate pinged for immediate review"
```

**Step 7 — Remind about post-fix steps**

After the PR is merged:
```
Post-hotfix checklist:
  1. Verify the fix is live on production
  2. Create a proper issue/ticket documenting the root cause
  3. Consider if a deeper fix or refactor is needed
  4. Run /cleanup after your hotfix branch is merged
```

$ARGUMENTS
