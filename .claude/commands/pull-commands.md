---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git fetch:*), Bash(git checkout:*)
description: Force pull latest commands (overwrites local changes)
---
echo "🔍 Checking for local changes in .claude/commands/..."
echo ""

# Check if there are uncommitted changes in the commands folder
if ! git diff --quiet -- .claude/commands/ || ! git diff --cached --quiet -- .claude/commands/; then
  echo "⚠️  WARNING: You have uncommitted changes in .claude/commands/"
  echo ""
  git status -- .claude/commands/
  echo ""
  echo "📋 Review your changes:"
  git diff -- .claude/commands/
  echo ""
  echo "Recommended steps:"
  echo "  1. Commit your changes first:"
  echo "     git add .claude/commands/"
  echo "     git commit -m 'Save local command customizations'"
  echo ""
  echo "  2. Then run this command again to pull updates"
  echo ""
  echo "⚠️  CONTINUING WILL OVERWRITE YOUR CHANGES!"
  echo ""
  echo "Press Ctrl+C to cancel, or Enter to continue and overwrite..."
  read
fi

echo "📥 Pulling latest commands from origin/main..."
echo ""

git fetch origin && git checkout origin/main -- .claude/commands/

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Commands updated successfully from origin/main!"
  echo "Changes are staged - run 'git commit' to save them"
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Review the updated commands and commit them with a descriptive message'"
else
  echo ""
  echo "❌ Failed to update commands. Check git status for details."
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Review the git status and help me understand what went wrong'"
fi
