---
allowed-tools: Bash(npx tsc --noEmit), Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git checkout:*), Bash(git merge:*)
description: Create a git commit
---
Run tsc check
If unstaged changes, make a strong commit message, then push to origin.
If changes were made to .claude/skills/security, run .claude/commands/push-subtree.md
