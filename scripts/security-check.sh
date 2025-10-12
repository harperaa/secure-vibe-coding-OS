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

# Check for known vulnerabilities
echo "Checking for known vulnerabilities..."
echo "--------------------------------------"
npm audit --production 2>&1 | grep -v "npm warn config"

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
