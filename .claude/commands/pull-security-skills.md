---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git subtree pull:*)
description: Pull the latest security skills from the secure-claude-skills repository
---
echo "🔍 Checking for local changes in .claude/skills/security/..."
echo ""

# Check if there are uncommitted changes in the security skills folder
if ! git diff --quiet -- .claude/skills/security/ || ! git diff --cached --quiet -- .claude/skills/security/; then
  echo "⚠️  WARNING: You have uncommitted changes in .claude/skills/security/"
  echo ""
  git status -- .claude/skills/security/
  echo ""
  echo "📋 Review your changes:"
  git diff -- .claude/skills/security/
  echo ""
  echo "Recommended steps:"
  echo "  1. Commit your changes first:"
  echo "     git add .claude/skills/security/"
  echo "     git commit -m 'Save local security skills changes'"
  echo ""
  echo "  2. Then run this command again to pull updates"
  echo ""
  echo "Press Ctrl+C to cancel, or Enter to continue anyway..."
  read
fi

echo "📥 Pulling latest security skills from remote repository..."
echo ""

git subtree pull --prefix=.claude/skills/security \\
  https://github.com/harperaa/secure-claude-skills.git main --squash

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Security skills updated successfully!"
else
  echo ""
  echo "❌ Merge conflicts detected. Resolve conflicts and commit the result."
  echo ""
  echo "Manual resolution:"
  echo "  1. See conflicted files: git status"
  echo "  2. Resolve conflicts manually"
  echo "  3. Stage resolved files: git add ."
  echo "  4. Commit: git commit -m 'Merge security skills updates'"
  echo ""
  echo "💡 Let Claude Code help you:"
  echo "  Ask: 'Review the merge conflicts and resolve them intelligently,"
  echo "       preserving my customizations while integrating new features'"
  echo ""
  echo "  Or: 'Help me merge the security skills updates'"
fi
