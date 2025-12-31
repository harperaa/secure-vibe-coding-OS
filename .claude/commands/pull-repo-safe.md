---
allowed-tools: Bash(git fetch:*), Bash(git status:*), Bash(git diff:*), Bash(git merge:*)
description: Safely pull latest updates with conflict detection
---
echo "🔍 Fetching latest changes from origin/main..."
echo ""

# Fetch latest changes from origin
git fetch origin

if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch from origin. Check your network connection."
  exit 1
fi

echo "📊 Current Status:"
echo "════════════════════════════════════════"
git status
echo ""

echo "📝 Files Changed in Latest Updates:"
echo "════════════════════════════════════════"
git diff --name-status HEAD origin/main

if ! git diff --quiet HEAD origin/main; then
  echo ""
  echo "📋 Detailed Changes:"
  echo "════════════════════════════════════════"
  git diff HEAD origin/main
  echo ""

  # Check for uncommitted local changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️  You have uncommitted local changes!"
    echo ""
  fi

  echo "════════════════════════════════════════"
  echo "📋 Review the changes above"
  echo ""
  echo "To apply these updates:"
  echo "  1. Commit your local changes first:"
  echo "     git add . && git commit -m 'Save my work'"
  echo ""
  echo "  2. Then merge the updates:"
  echo "     git merge origin/main"
  echo ""
  echo "  3. If conflicts occur, resolve them:"
  echo "     - Edit conflicted files"
  echo "     - git add resolved-files"
  echo "     - git commit -m 'Merge updates from template'"
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Commit my current changes, then merge the updates from"
  echo "       origin/main, resolving any conflicts while preserving my"
  echo "       customizations'"
  echo ""
  echo "  Or: 'Review the pending updates and help me merge them safely'"
  echo "════════════════════════════════════════"
else
  echo ""
  echo "✅ Your repository is up to date with origin/main!"
fi
