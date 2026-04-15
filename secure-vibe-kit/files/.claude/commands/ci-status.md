---
name: ci-status
description: Check the GitHub Actions CI pipeline status for the current branch or a specified PR. Shows which jobs passed or failed and links to the logs. Use when a developer wants to know if CI is green, why CI failed, what checks are running, or before merging a PR.
---

# CI Status

Check GitHub Actions pipeline status for the current branch.

## Instructions

**Step 1 — Check GitHub CLI is available**

Run: `gh --version 2>/dev/null || echo "GH_NOT_FOUND"`

If not found:
> "The GitHub CLI (gh) is not installed. Install from https://cli.github.com"
Stop here.

**Step 2 — Determine target**

If `$ARGUMENTS` is a PR number (e.g. `42`): check that PR's status.
Otherwise: check the current branch's most recent push.

Run: `git branch --show-current` to get current branch.

**Step 3 — Get run status**

For current branch:
```bash
gh run list --branch <current-branch> --limit 5
```

For a specific PR:
```bash
gh pr checks <PR-number>
```

**Step 4 — Get detailed job status for the most recent run**

```bash
gh run view <run-id> --log-failed 2>/dev/null | head -100
```

**Step 5 — Display formatted output**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CI STATUS — feat/your-branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Run #1234   (triggered 3 min ago)

  ✓  lint          2m 14s
  ✓  test          1m 52s
  ✗  security      0m 44s   ← FAILED
  ●  build         (skipped — security failed)

  Failed job: security
  ─────────────────────────────
  <first 50 lines of failure log>
  ─────────────────────────────

  View full logs: https://github.com/<owner>/<repo>/actions/runs/1234

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 6 — Provide actionable guidance for failures**

If `lint` failed:
> "Lint failed. Run `npm run lint` locally to see the errors, fix them, then `/save` and `/push`."

If `test` failed:
> "Tests failed. Run `npm run test` locally to see which tests are failing."

If `security` failed (npm audit):
> "Security audit found high-severity vulnerabilities. Run `npm audit` locally for details. Fix with `npm audit fix` or update the affected packages manually."

If `build` failed:
> "Production build failed. Run `npm run build` locally to reproduce the error."

If all passed:
> "✓ All CI checks passed. If you have a PR open, it is now mergeable (pending reviewer approval)."

$ARGUMENTS
