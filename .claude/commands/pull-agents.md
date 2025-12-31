---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git fetch:*), Bash(git checkout:*)
description: Force pull latest agents (overwrites local changes)
---
echo "🔍 Checking for local changes in .claude/agents/..."
echo ""

# Check if there are uncommitted changes in the agents folder
if ! git diff --quiet -- .claude/agents/ || ! git diff --cached --quiet -- .claude/agents/; then
  echo "⚠️  WARNING: You have uncommitted changes in .claude/agents/"
  echo ""
  git status -- .claude/agents/
  echo ""
  echo "📋 Review your changes:"
  git diff -- .claude/agents/
  echo ""
  echo "Recommended steps:"
  echo "  1. Commit your changes first:"
  echo "     git add .claude/agents/"
  echo "     git commit -m 'Save local agent customizations'"
  echo ""
  echo "  2. Then run this command again to pull updates"
  echo ""
  echo "⚠️  CONTINUING WILL OVERWRITE YOUR CHANGES!"
  echo ""
  echo "Press Ctrl+C to cancel, or Enter to continue and overwrite..."
  read
fi

echo "📥 Pulling latest agents from origin/main..."
echo ""

git fetch origin && git checkout origin/main -- .claude/agents/

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Agents updated successfully from origin/main!"
  echo "Changes are staged - run 'git commit' to save them"
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Review the updated agents and commit them with a descriptive message'"
else
  echo ""
  echo "❌ Failed to update agents. Check git status for details."
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Review the git status and help me understand what went wrong'"
fi
