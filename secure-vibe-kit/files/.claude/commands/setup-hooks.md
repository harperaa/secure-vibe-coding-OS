---
name: setup-hooks
description: Install and configure the full pre-commit security stack — Husky for git hooks, lint-staged for per-file linting, and detect-secrets for credentials scanning. Run once per project to enforce code quality and prevent accidental secret commits. Use when setting up a new project, onboarding to an existing project, or when pre-commit hooks are missing.
---

# Setup Pre-commit Hooks

Install Husky, lint-staged, and detect-secrets for the current project.

## Instructions

**Step 1 — Verify this is a Node.js project**

Run: `test -f package.json && echo "OK" || echo "MISSING"`

If package.json is missing:
> "No package.json found. This command is designed for Node.js projects. Are you in the right directory?"
Stop here.

**Step 2 — Check what is already installed**

Run:
```bash
cat package.json | grep -E '"husky|lint-staged|detect-secrets"' 2>/dev/null
ls .husky/ 2>/dev/null || echo "NO_HUSKY_DIR"
detect-secrets --version 2>/dev/null || echo "NO_DETECT_SECRETS"
```

Report what is already in place and what needs installing.

**Step 3 — Install Node packages**

Run:
```bash
npm install --save-dev husky lint-staged
```

**Step 4 — Initialize Husky**

Run:
```bash
npx husky init
```

This creates `.husky/` directory and a default pre-commit hook.

**Step 5 — Write the pre-commit hook**

Write the following content to `.husky/pre-commit`:
```bash
#!/bin/sh
# Run lint-staged on changed files
npx lint-staged

# Scan for secrets before committing
detect-secrets-hook --baseline .secrets.baseline 2>/dev/null || {
  echo "detect-secrets not found — skipping secrets scan"
  echo "Install with: pip install detect-secrets"
}
```

Make it executable:
```bash
chmod +x .husky/pre-commit
```

**Step 6 — Configure lint-staged in package.json**

Check if `lint-staged` key already exists in package.json.

If not, add it. Read the existing package.json, then write back with:
```json
"lint-staged": {
  "*.{js,ts,jsx,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css,yaml,yml}": [
    "prettier --write"
  ]
}
```

Ask the developer to confirm this config matches their project's linter setup before writing.

**Step 7 — Install detect-secrets**

Run: `pip install detect-secrets 2>/dev/null || pip3 install detect-secrets 2>/dev/null`

If pip is unavailable:
> "pip not found. Install detect-secrets manually: `pip install detect-secrets` or `brew install detect-secrets` on Mac."

**Step 8 — Create secrets baseline**

Run: `detect-secrets scan > .secrets.baseline`

**Step 9 — Update .gitignore**

Check `.gitignore` for these entries and add any that are missing:
```
.env
.env.local
.env.*.local
*.pem
*.key
.DS_Store
```

**Step 10 — Stage and commit the new setup files**

Run:
```bash
git add .husky/ package.json package-lock.json .secrets.baseline .gitignore
git commit -m "chore: add pre-commit hooks (husky + lint-staged + detect-secrets)"
```

**Step 11 — Confirm**

```
✓ Pre-commit hooks installed

  ✓  Husky           (.husky/pre-commit)
  ✓  lint-staged     (package.json)
  ✓  detect-secrets  (.secrets.baseline)
  ✓  .gitignore      (updated)

Every future commit will now:
  • Lint and format changed files automatically
  • Scan for secrets before allowing the commit

Test it: make a change, then run /save
```

$ARGUMENTS
