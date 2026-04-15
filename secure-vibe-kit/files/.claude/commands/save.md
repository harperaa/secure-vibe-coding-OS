---
name: save
description: Stage all changed files and create a git commit using conventional commit format. Use whenever a developer wants to commit, save work, checkpoint progress, or says "commit this". Guides the user to write a properly formatted commit message if they don't provide one.
---

# Save (Stage + Commit)

Stage all changes and create a well-formatted commit.

## Instructions

**Step 1 — Check there is something to commit**

Run: `git status --porcelain`

If output is empty, tell the user:
> "Nothing to commit — your working tree is clean."
Stop here.

**Step 2 — Show what will be committed**

Run: `git diff --stat HEAD`

Display the list of changed files so the developer can confirm before committing.

**Step 3 — Determine the commit message**

If `$ARGUMENTS` is provided, use it as the commit message. Validate it follows conventional commit format:
- Must start with one of: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`
- If it doesn't start with a valid prefix, suggest the correct prefix based on context and ask the developer to confirm, e.g.:
  > "That looks like a feature — did you mean `feat: <message>`?"

If `$ARGUMENTS` is NOT provided:
- Look at the changed files and infer what type of work was done
- Suggest a commit message: "Based on the changes, how about: `feat: add user login form`?"
- Wait for the developer to confirm or provide their own message

**Step 4 — Run secrets scan before committing**

Run: `detect-secrets-hook --baseline .secrets.baseline 2>/dev/null || echo "SECRETS_SCAN_UNAVAILABLE"`

If the scan finds potential secrets (exit code non-zero and output is not SECRETS_SCAN_UNAVAILABLE):
> "⚠️  Potential secrets detected in the changed files. Review the output above before committing. If these are false positives, update the baseline with: `detect-secrets scan > .secrets.baseline`"
Stop here and do NOT commit.

If detect-secrets is not installed (SECRETS_SCAN_UNAVAILABLE):
Warn the user: "detect-secrets is not installed. Run `/setup-hooks` to install it. Proceeding with commit — be sure no secrets are in your changes."

**Step 5 — Stage and commit**

Run:
```
git add .
git commit -m "<commit message>"
```

**Step 6 — Confirm**

Show:
```
✓ Committed: <commit message>
  Branch: <current branch>
  Files changed: <number>

Next: run /push to sync with GitHub
```

$ARGUMENTS
