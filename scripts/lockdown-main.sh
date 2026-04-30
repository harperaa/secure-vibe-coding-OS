#!/usr/bin/env bash
#
# Lock down the main branch with GitHub branch protection.
#
# Applies (team mode, default):
#   - Required PR reviews (1 approval)
#   - Required status checks (lint, test, security, build) — must be passing
#   - Strict status checks (branch must be up to date with main before merging)
#   - enforce_admins: true (no direct push, even by repo owner)
#   - Block force pushes and deletions
#
# Solo mode (--solo) keeps everything except the review requirement (0 reviewers),
# so a single developer can self-merge once CI is green. Recommended for solo
# personal projects with no second reviewer.
#
# Idempotent — re-running just overwrites the same protection config.
#
# Usage:
#   ./scripts/lockdown-main.sh           # apply (team mode, 1 reviewer required)
#   ./scripts/lockdown-main.sh --solo    # apply (solo mode, 0 reviewers required)
#   ./scripts/lockdown-main.sh --status  # print current protection
#   ./scripts/lockdown-main.sh --remove  # remove protection (with confirmation)
#

set -euo pipefail

MODE="${1:-apply}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  echo "Install: brew install gh  (macOS) or https://cli.github.com"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: GitHub CLI is not authenticated."
  echo "Run: gh auth login"
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
if [ -z "$REPO" ]; then
  echo "Error: could not determine repo. Run this from inside a git repo with a GitHub remote."
  exit 1
fi

apply_protection() {
  local review_count="$1"
  local mode_label="$2"

  echo "Applying branch protection to $REPO:main ($mode_label)..."

  gh api -X PUT "repos/$REPO/branches/main/protection" \
    --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test", "security", "build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": $review_count,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

  echo ""
  echo "✓ Branch protection applied to $REPO:main ($mode_label)"
  echo ""
  echo "Active rules:"
  echo "  - Direct pushes blocked (must go through PR)"
  if [ "$review_count" -gt 0 ]; then
    echo "  - $review_count approving review(s) required"
    echo "  - Stale reviews dismissed on new commits"
  else
    echo "  - No approving reviews required (solo mode — you can self-merge)"
  fi
  echo "  - Status checks required: lint, test, security, build"
  echo "  - Branch must be up to date with main before merging"
  echo "  - Conversations must be resolved before merging"
  echo "  - Force pushes blocked"
  echo "  - Branch deletion blocked"
  echo "  - Admins included (enforce_admins=true)"
  echo ""
  echo "Verify: ./scripts/lockdown-main.sh --status"
}

case "$MODE" in
  --status)
    echo "Current branch protection on $REPO:main:"
    gh api "repos/$REPO/branches/main/protection" 2>&1 || echo "(no protection set)"
    ;;

  --remove)
    read -r -p "Remove branch protection on $REPO:main? [y/N] " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      gh api -X DELETE "repos/$REPO/branches/main/protection"
      echo "Branch protection removed from $REPO:main."
    else
      echo "Cancelled."
    fi
    ;;

  --solo)
    apply_protection 0 "solo mode"
    ;;

  apply|"")
    apply_protection 1 "team mode"
    ;;

  *)
    echo "Usage: $0 [--solo | --status | --remove]"
    echo ""
    echo "  (no args)  apply team-mode protection (1 reviewer required)"
    echo "  --solo     apply solo-mode protection (0 reviewers required)"
    echo "  --status   print current protection config"
    echo "  --remove   remove protection (with confirmation)"
    exit 1
    ;;
esac
