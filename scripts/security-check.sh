#!/bin/bash

#
# Security Check Script
# =====================
#
# Runs automated security checks on the project:
# - npm audit: Checks for known vulnerabilities in dependencies
# - npm outdated: Shows packages that need updates
#
# Usage:
# ------
# chmod +x scripts/security-check.sh
# ./scripts/security-check.sh
#
# Or simply:
# bash scripts/security-check.sh
#

echo ""
echo "========================================"
echo "  Security Audit"
echo "========================================"
echo ""

# LIMITS OF THIS SCRIPT — know where each control stops.
#
#   npm audit             -> known CVEs only. Finds nothing on day zero of a
#                            maintainer-account compromise.
#   npm audit signatures  -> would NOT have caught the Aug 2026 keyv worm. The
#                            attacker pushed to the repo's main branch and cut a
#                            release, so the poisoned tarballs carried valid npm
#                            provenance signed by GitHub Actions. Every
#                            signature check passed. Deliberately not run here,
#                            so it can't be mistaken for protection it doesn't
#                            provide.
#   npm ls --all          -> lockfile/tree consistency. A package in
#                            node_modules with no matching lockfile entry is a
#                            signal in its own right, independent of any feed.
#
# The controls that actually cover this threat live elsewhere: the install
# cooldown (.npmrc min-release-age), lockfile pinning, and credential
# blast-radius reduction (Doppler + /rotate).

# Check for known vulnerabilities.
# --production is deprecated; --omit=dev is the supported spelling.
echo "Checking for known vulnerabilities (production deps)..."
echo "--------------------------------------"
npm audit --omit=dev

echo ""
echo "Checking lockfile / node_modules consistency..."
echo "--------------------------------------"
if npm ls --all > /dev/null 2>&1; then
  echo "Dependency tree matches the lockfile."
else
  echo "MISMATCH: the installed tree does not match package-lock.json."
  echo "Investigate before installing anything else — an unexpected package is a signal."
fi

echo ""
echo "========================================"
echo "  Dependency Updates"
echo "========================================"
echo ""

# Check for outdated packages
echo "Checking for outdated packages..."
echo "--------------------------------------"
npm outdated || echo "All packages are up to date!"

echo ""
echo "========================================"
echo "  Security Summary"
echo "========================================"
echo ""
echo "If vulnerabilities were found:"
echo "  - Review the severity and impact"
echo "  - Run 'npm audit fix' for automatic fixes"
echo "  - Run 'npm audit fix --force' for major version updates (review breaking changes!)"
echo ""
echo "If packages are outdated:"
echo "  - Update non-breaking: npm update"
echo "  - Update major versions: npm install package@latest (test thoroughly!)"
echo ""
echo "For more details:"
echo "  - npm audit"
echo "  - npm outdated"
echo ""
