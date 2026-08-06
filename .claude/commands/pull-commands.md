---
allowed-tools: AskUserQuestion, Bash(git status:*), Bash(git diff:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git remote:*), Bash(git log:*), Read
description: Review and pull latest commands from the template (diff-first, never blind)
---

# /pull-commands — Review and pull template command updates

Updates `.claude/commands/` from the template repo. **Every incoming change is
shown and confirmed before anything is written.**

> **Why this is diff-first and not a force-pull.** Files under `.claude/` are
> executed as instructions inside every Claude Code session in this repo. Pulling
> them from a moving branch without review means: whoever controls the upstream
> account controls what runs on your machine. That is not hypothetical — the
> August 2026 keyv/npm worm planted Claude Code and VS Code hooks for persistence,
> and earlier waves of the same family used AI-agent `SessionStart` hooks as their
> execution vector. A force-overwrite suppresses exactly the diff that would
> reveal it. Never restore the old `git checkout upstream/main -- ...` behavior.

## Step 1: Protect local work

Run `git status --porcelain -- .claude/commands/`.

If there are uncommitted changes, show them (`git diff -- .claude/commands/`) and
**AskUserQuestion**: "You have uncommitted changes in `.claude/commands/`. Commit
them before pulling?"
- "Commit first (recommended)" — stop and let the user commit.
- "Discard and pull" — proceed; the diff in Step 3 still gates the write.
- "Cancel"

## Step 2: Fetch (fetch only — do NOT write to the working tree)

Set up the upstream remote if missing:

```bash
UPSTREAM_URL="https://github.com/harperaa/secure-vibe-coding-OS.git"
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git fetch upstream
```

If `origin` still points at `harperaa/secure-vibe-coding-OS`, STOP and tell the
user to run `/deploy-to-dev` first to create their own repository.

## Step 3: Show the INCOMING diff and require confirmation

This is the step that matters. Show what upstream would change:

```bash
git diff --stat HEAD..upstream/main -- .claude/commands/
git diff HEAD..upstream/main -- .claude/commands/
```

Also show provenance, so the user can judge whether the change looks legitimate:

```bash
git log --oneline -10 HEAD..upstream/main -- .claude/commands/
```

Summarize for the user in plain language: which files change, what each change
does, and **call out anything that adds or modifies an execution path** —
new `Bash(...)` entries in `allowed-tools`, new network calls (`curl`, `wget`,
`npx`), new `postinstall`/hook wiring, or writes to `.claude/settings.json`,
`.claude/hooks/`, or `.vscode/`. Those deserve a sentence each, not a summary line.

If the diff is empty: report "Already up to date" and STOP.

Then **AskUserQuestion**: "Apply these command updates?"
- "Apply all"
- "Apply only some" — then apply per-file with `git checkout upstream/main -- .claude/commands/<file>`
- "Cancel" (recommended if anything above looked unexplained)

**Do not write anything before this answer.**

## Step 4: Apply and report

Only after confirmation:

```bash
git checkout upstream/main -- .claude/commands/
```

Report what changed and remind the user the changes are staged, not committed, so
`git diff --cached` gives them one more review before it lands in history.
