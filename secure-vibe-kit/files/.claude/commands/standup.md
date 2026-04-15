---
name: standup
description: Generate a daily standup summary by analyzing recent git commits, open PRs, and current branch status. Produces a concise, human-readable summary of what was done and what is in progress. Use when a developer needs to prepare for standup, says "what did I do today", "standup summary", "what have I been working on".
---

# Standup Summary

Generate a concise standup from recent git activity.

## Instructions

**Step 1 — Determine time window from $ARGUMENTS**

- No argument → today's activity (since midnight local time)
- `yesterday` → yesterday's activity
- `week` → last 7 days
- A number (e.g. `2`) → last N days

**Step 2 — Gather commit data across all local branches**

Run:
```bash
git log --all --oneline --since="<date>" --author="$(git config user.name)" \
  --format="%h %s (%D)" 2>/dev/null
```

Also run:
```bash
git branch --show-current
git status --porcelain | wc -l
```

**Step 3 — If GitHub CLI is available, get open PRs**

Run: `gh pr list --author "@me" --state open 2>/dev/null`

**Step 4 — Generate the standup output**

Format as a human-ready standup you could paste into Slack:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STANDUP — <Date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT I DID:
• feat: add user login form (feat/auth)
• fix: correct redirect on failed auth (feat/auth)
• chore: update eslint config (merged to main)

IN PROGRESS:
• feat/auth — 3 commits, pushed, PR open
  PR #42: "Add user authentication" — awaiting review

BLOCKERS:
• (none — or describe if relevant)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 5 — If no commits found**

> "No commits found in the specified time window. Either nothing was committed, or commits were made under a different author name."
Show: `git config user.name` and `git config user.email` so the developer can verify their identity is configured correctly.

**Step 6 — Offer Slack-ready formatting**

After showing the standup, offer:
> "Want me to format this as a Slack message you can copy-paste?"

$ARGUMENTS
