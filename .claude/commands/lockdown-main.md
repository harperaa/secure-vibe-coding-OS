---
name: lockdown-main
description: Toggle GitHub branch protection on main. Detects current state — if unprotected, asks whether you're solo or on a team and applies the appropriate ruleset. If already protected, offers to remove or switch modes. Reversible either direction.
allowed-tools: Bash
---

# /lockdown-main — Toggle GitHub branch protection on `main`

This command checks whether `main` is currently protected, asks the right question for the current state, and applies your choice. It does not act without explicit confirmation.

## Instructions

**Step 1 — Check tools**

```bash
gh --version 2>/dev/null || echo "GH_NOT_FOUND"
gh auth status 2>&1 | head -3
```

If `gh` is missing: tell the user to install with `brew install gh` or https://cli.github.com, then stop.
If not authenticated: tell the user to run `gh auth login`, then stop.

**Step 2 — Detect current protection state**

```bash
./scripts/lockdown-main.sh --status 2>&1
```

Parse the output:
- If it contains `"Branch not protected"` or `(no protection set)` → state is **UNPROTECTED**
- If it returns a JSON object with `required_status_checks` → state is **PROTECTED**. Also extract `required_approving_review_count` from the JSON to detect whether it's currently in **team mode** (count >= 1) or **solo mode** (count == 0).

Show the user the current state plainly:

```
Current state of `main`: UNPROTECTED
```
or
```
Current state of `main`: PROTECTED (team mode — 1 reviewer required)
```
or
```
Current state of `main`: PROTECTED (solo mode — 0 reviewers required)
```

**Step 3 — If UNPROTECTED, explain the situation and ask solo vs. team**

Display this verbatim:

```
About to apply branch protection to `main`. This will enforce the workflow
rules described in CLAUDE.md by making them rules GitHub itself enforces —
not just guidance.

Both modes apply these rules:

  ✓ Direct pushes to `main` will be REJECTED. All changes go through PRs.
  ✓ CI must pass before merge: lint, test, security, build.
  ✓ The PR branch must be up to date with `main` before merging.
  ✓ All conversations on the PR must be resolved before merge.
  ✓ Force pushes to `main` blocked.
  ✓ Deleting `main` blocked.
  ✓ Admins included — even the repo owner cannot bypass these rules.

The mode you choose changes the review requirement:

  TEAM MODE (default — recommended for any repo with 2+ developers):
    • 1 approving review required before merge
    • You CANNOT approve your own PR (GitHub blocks self-approval)
    • Stale reviews dismissed when new commits are pushed
    • Use this when there is at least one other person who can review

  SOLO MODE (recommended for solo personal projects only):
    • 0 reviewers required — you can self-merge once CI is green
    • Everything else above still applies (CI gate, no direct push, etc.)
    • Use this when you are the only developer and the team-mode review
      requirement would lock you out of merging your own PRs

Why this question matters: GitHub does not let you approve your own PR. If
you pick TEAM MODE while working solo, every PR you open will sit there
permanently — "1 approving review required" with nobody available to give
it. SOLO MODE drops the review requirement so the CI gate is still enforced
but you can ship your own work.
```

Use AskUserQuestion:
- Question: "Which mode should be applied?"
- Header: "Lockdown mode"
- Options:
  - "Team mode (1 reviewer required) — I work with at least one other developer"
  - "Solo mode (0 reviewers required) — I am the only developer on this repo"
  - "Cancel — don't apply protection"

Based on the answer:
- Team → Step 4a
- Solo → Step 4b
- Cancel → stop, no changes

**Step 4a — Apply team mode**

```bash
./scripts/lockdown-main.sh
```

Show the script output verbatim. Then run `./scripts/lockdown-main.sh --status` so the user sees the active config in JSON.

End with:

```
✓ `main` is now locked down (team mode).

Next time you push directly to main, you'll see:
  ! [remote rejected] main -> main (protected branch hook declined)

Use `/create-pull-request` to ship changes from now on, and have a teammate
review before merging.
```

**Step 4b — Apply solo mode**

```bash
./scripts/lockdown-main.sh --solo
```

Show the script output verbatim. Then run `./scripts/lockdown-main.sh --status`.

End with:

```
✓ `main` is now locked down (solo mode).

Direct pushes to main are blocked, but YOU can self-merge a PR once CI is
green. Workflow stays the same:
  /create-feature-branch → ... → /create-pull-request → wait for CI green → merge

If you add a teammate later, re-run /lockdown-main and pick team mode.
```

**Step 5 — If PROTECTED, explain options and ask**

Display this verbatim, substituting the current mode:

```
`main` is currently protected in [TEAM | SOLO] MODE.

Available actions:

  SWITCH MODE — change between team mode (1 reviewer required) and solo
    mode (0 reviewers required) without removing other protections.

  REMOVE PROTECTION — roll back to the trust-based state where CLAUDE.md
    is guidance only. After this:
      ✗ Direct pushes to `main` allowed again
      ✗ PR reviews not required
      ✗ CI checks not required to merge — a red PR can be merged
      ✗ Force pushes allowed (if you have permission)
      ✗ `main` can be deleted

When switching makes sense:
  • You started solo and now have a teammate → switch from solo to team
  • Team mode is blocking solo work → switch from team to solo

When removing makes sense:
  • Tearing down or migrating the repo
  • Emergency hotfix path that needs to bypass CI (use sparingly)

Reversible: re-run /lockdown-main any time.
```

Use AskUserQuestion. The options shown depend on the current mode:

- If currently in **team mode**:
  - "Switch to solo mode (0 reviewers)"
  - "Remove protection entirely"
  - "Show me the current rules first" → run `./scripts/lockdown-main.sh --status`, display formatted output, then re-ask
  - "Cancel"

- If currently in **solo mode**:
  - "Switch to team mode (1 reviewer)"
  - "Remove protection entirely"
  - "Show me the current rules first" → run `./scripts/lockdown-main.sh --status`, display formatted output, then re-ask
  - "Cancel"

Based on the answer:
- Switch to team → run `./scripts/lockdown-main.sh` then `--status`, show the change
- Switch to solo → run `./scripts/lockdown-main.sh --solo` then `--status`, show the change
- Remove → pipe `y` to `./scripts/lockdown-main.sh --remove`, then run `--status` to confirm `Branch not protected`
- Cancel → stop

After removal, end with:

```
Branch protection removed from `main`.

Reminder: CLAUDE.md still says PRs go through review and CI. That guidance
is now self-enforced. Re-run /lockdown-main when you want GitHub to enforce
it again.
```

## Notes

- The required status check names (`lint`, `test`, `security`, `build`) match the job names in `.github/workflows/ci.yml`. If you rename a CI job, update the contexts list in `scripts/lockdown-main.sh` to match — otherwise PRs will get stuck waiting for a check that never reports.
- `enforce_admins=true` means even the repo owner must go through PRs (this applies in both team and solo modes). Disable in the script if you need an emergency override path.
- Switching modes is just a re-apply — `gh api -X PUT` overwrites the entire protection config, so going from team → solo or solo → team is one API call, no intermediate "remove" step required.

$ARGUMENTS
