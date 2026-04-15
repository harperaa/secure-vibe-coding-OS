---
name: commit
description: Stage all changes and create a well-formed conventional commit. Analyzes what changed to suggest a strong commit message if one is not provided. Triggers on "commit", "save my work", "checkpoint", "commit this".
---

# Commit

Stage all changes and create a commit with a strong, descriptive message.

## Instructions

**Step 1 — Check there is something to commit**

Run: `git status --porcelain`

If output is empty:
> "Nothing to commit — your working tree is clean."
Stop here.

**Step 2 — Show what will be committed**

Run: `git diff --stat HEAD`

Display the changed files so the developer can see what is being committed.

**Step 3 — Determine the commit message**

If `$ARGUMENTS` is provided, use it as the message. Validate it follows conventional format:
- Must start with one of: `feat:` `fix:` `chore:` `docs:` `refactor:` `test:` `style:` `perf:`
- Must have a meaningful description (not just "update" or "changes")
- Should be under 72 characters
- Written in the imperative mood: "add login form" not "added login form"

If the message does not follow the format, suggest the corrected version:
> "Did you mean: `feat: add user login form`? (yes / type your own)"

If `$ARGUMENTS` is NOT provided:
- Run: `git diff HEAD` to read what changed
- Analyze the diff: what files changed, what was added/removed
- Propose a commit message based on the actual changes
- Show: "Based on the changes, suggested message: `feat: add login form with email validation`"
- Ask: "Use this message? (yes / type your own)"

**Step 4 — Stage and commit**

```
git add .
git commit -m "<message>"
```

**Step 5 — Confirm**

```
✓ Committed
  Message: <commit message>
  Branch:  <current branch>
  Files:   <N> changed

Next: /push to sync with GitHub
```

$ARGUMENTS
