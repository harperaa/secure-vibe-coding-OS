#!/bin/bash

# Script to update security skills from secure-claude-skills repository
# This pulls the latest skills from the npm package repo via git subtree

REPO_URL="https://github.com/harperaa/secure-claude-skills.git"
PREFIX=".claude/skills/security"

echo "🔄 Updating security skills from secure-claude-skills repo..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Commit your changes first to avoid conflicts"
    exit 1
fi

# Pull from subtree
echo "Pulling latest changes..."
if git subtree pull --prefix="$PREFIX" "$REPO_URL" main --squash; then
    echo ""
    echo "✅ Security skills updated successfully!"
    echo ""
    echo "Updated skills in: $PREFIX"
    echo ""
    echo "What changed:"
    git log --oneline -1
else
    echo ""
    echo "❌ Failed to update security skills"
    echo "   This might be due to merge conflicts"
    echo "   Resolve conflicts and run: git commit"
    exit 1
fi
