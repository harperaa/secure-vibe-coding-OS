---
name: scan-secrets
description: Run a secrets scan on the repository to find accidentally committed API keys, passwords, tokens, or credentials. Uses detect-secrets to scan staged files, changed files, or the full repo. Use before any PR, when adding new environment variables, when installing new packages, or any time a developer wants to verify no secrets are exposed.
---

# Scan for Secrets

Scan for accidentally included secrets, API keys, tokens, or credentials.

## Instructions

**Step 1 — Determine scan scope from $ARGUMENTS**

- `staged` or no argument → scan only currently staged files
- `changed` → scan all uncommitted changed files
- `full` → scan the entire repository
- `diff` → scan only files changed since last commit on this branch vs main

Default (no argument): scan staged + changed files.

**Step 2 — Check detect-secrets is installed**

Run: `detect-secrets --version 2>/dev/null || echo "NOT_INSTALLED"`

If not installed:
> "detect-secrets is not installed. Run `/setup-hooks` to install it, or manually: `pip install detect-secrets`"
Stop here.

**Step 3 — Check if baseline exists**

Run: `test -f .secrets.baseline && echo "EXISTS" || echo "MISSING"`

If baseline is missing:
> "No .secrets.baseline found. Creating one now..."
Run: `detect-secrets scan > .secrets.baseline`
> "Baseline created at .secrets.baseline. This file should be committed to the repo."

**Step 4 — Run the scan**

For staged/changed scope:
```bash
git diff --name-only HEAD 2>/dev/null
git diff --name-only --cached 2>/dev/null
```
Collect unique file paths, then:
```bash
detect-secrets scan --baseline .secrets.baseline <file1> <file2> ...
```

For full repo:
```bash
detect-secrets scan --baseline .secrets.baseline
```

**Step 5 — Compare against baseline**

Run: `detect-secrets audit .secrets.baseline`

**Step 6 — Report results**

If no new secrets found:
```
✓ Secrets scan passed — no new secrets detected
  Scanned: <N> files
  Baseline: .secrets.baseline (up to date)
```

If potential secrets found:
```
⚠️  POTENTIAL SECRETS DETECTED

The following files contain patterns that look like secrets:
  <filename>:<line number> — <type> (e.g. AWS Access Key, Generic API Key)

Review each finding:
  - If it IS a real secret: remove it immediately, rotate the key/token, then re-commit
  - If it is a FALSE POSITIVE: update the baseline:
      detect-secrets scan > .secrets.baseline
      git add .secrets.baseline
      git commit -m "chore: update secrets baseline"

DO NOT open a PR until all real secrets are removed.
```

**Step 7 — Check .gitignore for common secret file patterns**

Run: `cat .gitignore 2>/dev/null`

Warn if any of these are NOT in .gitignore:
- `.env`
- `.env.local`
- `.env.*.local`
- `*.pem`
- `*.key`
- `secrets.json`

If missing:
> "⚠️  These patterns should be in your .gitignore: <list>"

$ARGUMENTS
