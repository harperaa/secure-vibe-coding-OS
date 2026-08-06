---
allowed-tools: AskUserQuestion, Bash(git status:*), Bash(git diff:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git remote:*), Bash(git log:*), Read
description: Review and pull latest agents from the template (diff-first, never blind)
---

# /pull-agents — Review and pull template agent updates

Updates `.claude/agents/` from the template repo. **Every incoming change is
shown and confirmed before anything is written.**

> **Why this is diff-first and not a force-pull.** Agent definitions are prompts
> that run with tool access inside this repo. Pulling them from a moving branch
> without review means whoever controls the upstream account controls what those
> agents do. The August 2026 keyv/npm worm planted Claude Code and VS Code hooks
> for persistence; a force-overwrite suppresses exactly the diff that would
> reveal it. Never restore the old `git checkout upstream/main -- ...` behavior.

## Step 1: Protect local work

Run `git status --porcelain -- .claude/agents/`.

If there are uncommitted changes, show them (`git diff -- .claude/agents/`) and
**AskUserQuestion**: "You have uncommitted changes in `.claude/agents/`. Commit
them before pulling?"
- "Commit first (recommended)" — stop and let the user commit.
- "Discard and pull" — proceed; the diff in Step 3 still gates the write.
- "Cancel"

## Step 2: Fetch (fetch only — do NOT write to the working tree)

```bash
UPSTREAM_URL="https://github.com/harperaa/secure-vibe-coding-OS.git"
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git fetch upstream
```

If `origin` still points at `harperaa/secure-vibe-coding-OS`, STOP and tell the
user to run `/deploy-to-dev` first to create their own repository.

## Step 3: Show the INCOMING diff and require confirmation

```bash
git diff --stat HEAD..upstream/main -- .claude/agents/
git diff HEAD..upstream/main -- .claude/agents/
git log --oneline -10 HEAD..upstream/main -- .claude/agents/
```

Summarize which agents change and what each change does. **Call out any change to
an agent's capability or reach**, specifically: edits to the `tools:` frontmatter
(especially anything granting `Bash`, `Write`, or `*`), a `model:` change, and any
instruction that adds a network call or writes outside the repo. An agent quietly
gaining `Bash` is the change most worth catching here.

If the diff is empty: report "Already up to date" and STOP.

Then **AskUserQuestion**: "Apply these agent updates?"
- "Apply all"
- "Apply only some" — then apply per-file with `git checkout upstream/main -- .claude/agents/<file>`
- "Cancel" (recommended if anything above looked unexplained)

**Do not write anything before this answer.**

## Step 4: Apply and report

Only after confirmation:

```bash
git checkout upstream/main -- .claude/agents/
```

Report what changed and remind the user the changes are staged, not committed.
