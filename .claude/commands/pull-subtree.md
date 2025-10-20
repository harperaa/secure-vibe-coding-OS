---
allowed-tools: Bash(git subtree pull:*)
description: Create a git commit
---
git subtree pull --prefix=.claude/skills/security \\
  https://github.com/harperaa/secure-claude-skills.git main --squash