#!/bin/bash
echo "Updating security skills from secure-claude-skills repo..."
git subtree pull --prefix=.claude/skills/security \
  https://github.com/harperaa/secure-claude-skills.git main --squash
echo "✅ Security skills updated!"
