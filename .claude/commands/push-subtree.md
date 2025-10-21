---
allowed-tools: Bash(git subtree push:*), Bash(git pull:*), Bash(sed:*), Bash(npm publish:*), Bash(npm version patch:*), Bash(cd:*)
description: Create a git commit
---
1. bump version by running npm version patch --no-git-tag-version --prefix .claude/skills/security
2. git subtree push --prefix=.claude/skills/security \
     https://github.com/harperaa/secure-claude-skills.git main
3. move to ../secure-claude-skills-package, run git pull, run npm publish, then return to cwd