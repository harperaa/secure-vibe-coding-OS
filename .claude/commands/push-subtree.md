---
allowed-tools: Bash(git subtree push:*)
description: Create a git commit
---
1. bump version in ./claude/skills/security/package.json
2. git subtree push --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main

3. move to ../secure-claude-skills-package, run npm publish, then return to cwd