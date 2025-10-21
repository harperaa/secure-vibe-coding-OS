---
allowed-tools: Bash(git subtree push:*), Bash(git pull:*), Bash(sed:*), Bash(npm publish:*), Bash(cd:*)
description: Create a git commit
---
1. bump version in ./claude/skills/security/package.json using sed.
2. git subtree push --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main

3. move to ../secure-claude-skills-package, run git pull, run npm publish, then return to cwd