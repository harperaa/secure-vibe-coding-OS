# Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.  Not every simple task needs the full rigor.  The goal is reducing costly mistakes on non-trivial work, not slowing down simple tasks.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
# Project — Git & CI/CD Conventions

This file is read automatically by Claude Code on every session.

---

## Branch Rules

| Branch       | Purpose                          | How to sync with main        |
|--------------|----------------------------------|------------------------------|
| `main`       | Production — always deployable   | Never rebase or merge into   |
| `testing`    | Shared integration environment   | `/sync-testing-branch` (merge) |
| `feat/name`  | Feature work                     | `/sync-feature-branch` (rebase) |
| `fix/name`   | Bug fixes                        | `/sync-feature-branch` (rebase) |
| `chore/name` | Maintenance                      | `/sync-feature-branch` (rebase) |

**Rules:**
- Always branch from `main` — never from `testing`
- PRs go to `main` only — never merge `testing` into `main`
- 1 reviewer minimum — you cannot approve your own PR
- Never commit secrets or API keys

---

## Conventional Commit Format

All commit messages must follow this format:

```
<type>: <short description>

[optional body]
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

---

## Environments

| Environment | Branch    | URL                     |
|-------------|-----------|-------------------------|
| Production  | `main`    | yourapp.com             |
| Testing     | `testing` | testing.yourapp.com     |
| Preview     | any branch| branch-name.vercel.app  |

---

## Secrets Management

This project supports two flows for environment variables:

**Doppler mode (recommended)** — single source of truth in Doppler, runtime fetch on Vercel:
- Active when `.doppler.yaml` exists in the repo root.
- Local dev: `npm run dev:doppler` and `npm run convex:doppler` (Doppler CLI injects env).
- Vercel: only `DOPPLER_TOKEN` lives in Vercel env. The build fetches from Doppler via `scripts/vercel-prebuild.mjs`; runtime fetches via `lib/secrets.ts` + `instrumentation.ts`.
- Rotation: run `/rotate` for incident response — revokes the Vercel-side token in seconds (containment), then walks per-credential rotation.

**Legacy `.env.local` mode** — values live in `.env.local`, pushed to Vercel via `vercel env add`. Use when Doppler is unavailable or unwanted. Same scripts and skills support it without Doppler.

`/install` asks which mode to use. Both can coexist on the same machine across different repos.

---

## Content Modules

Optional page/content modules live in `templates/modules/<name>/` (homepage-content, blog, dashboard-sample, pricing). The default site is minimal — login homepage + blank dashboard. `/install` asks which modules to copy in; `/add-module` installs any of them later; `node scripts/modules.mjs install <name...> --apply-edits` does it headlessly. Modules only add pages and content — the security backend (convex/, lib/, middleware.ts, app/api/) is always installed and never gated.

Conventions (do not break these):
- `templates/modules/**/files/` mirrors the repo root and is type-checked/linted in place. Imports between two files of the SAME module must use **relative paths** (depth is identical before/after copy); `@/` imports are only allowed for always-installed targets.
- Anchor comments mark deterministic insertion points for module edits — preserve them when editing the default files: `// modules:nav` (header menuItems + sidebar navMain), `// modules:imports` and `{/* modules:sections */}` (homepage), `{/* modules:footer */}` (blog layout).

---

## Security

Run `/security-assessment` before opening any PR.
The command invokes the security orchestrator agent in `.claude/agents/`
which runs a comprehensive assessment across OWASP Top 10, authentication,
injection risks, secrets exposure, and dependency vulnerabilities.

---

## Security Reminders

- Never hardcode env vars — use `.env.local` (gitignored) for local dev
- `.env.example` documents required vars without values — keep it updated
- `npm audit` runs in CI but also run locally before a PR if you added packages

---

## Dynamic Lessons Library

IMPORTANT: Before starting any new work, ALWAYS check .claude/skills/lessons/ for relevant past learnings.

- Location: .claude/skills/lessons/*/SKILL.md
- Created by: /retrospective command after completing work
- Discovery: Use /advise command to search lessons OR manually scan folder for relevant topics

How to use lessons:
1. BEFORE starting work: Check if similar work was done before by scanning .claude/skills/lessons/
2. READ relevant lesson SKILL.md files to learn from past successes and failures
3. APPLY exact parameters and approaches that worked
4. AVOID approaches documented in "Failed Attempts" tables
5. AFTER completing work: Run /retrospective to capture YOUR learnings for future sessions

## Urgent

Use npm tsc --noEmit to check types after each major change
Use npx convex dev --once --typecheck=enable 2>&1 | tail -20 to check Convex types
