---
allowed-tools: Bash(git subtree push:*), Bash(git -C:*), Bash(npm publish:*), Bash(npm version patch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*)
description: Create a git commit
---
1. bump version: npm version patch --no-git-tag-version --prefix .claude/skills/security
2. commit version bump: git add .claude/skills/security/package.json .claude/skills/security/package-lock.json && git commit -m "Bump security skills package to version X.X.X" && git push
3. push subtree: git subtree push --prefix=.claude/skills/security https://github.com/harperaa/secure-claude-skills.git main
4. pull changes: git -C ../secure-claude-skills-package pull --rebase
5. publish to npm: npm publish ../secure-claude-skills-package