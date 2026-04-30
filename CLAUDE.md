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

## The 11 Commands

```
/create-feature-branch [purpose]   Start new work from latest main
/commit                            Stage all and commit with strong message
/push                              Push branch to GitHub
/merge-to-testing                  Add feature branch to testing environment
/create-pull-request               Sync with main, open PR via GitHub CLI
/stash-push                        Temporarily save uncommitted changes
/stash-pop                         Restore most recently stashed changes
/sync-feature-branch               Rebase feature branch on latest main
/sync-testing-branch               Merge main into testing (safe for shared branch)
/status                            Plain-English summary of current state
/security-assessment               Run comprehensive security assessment via agents
```

---

## Everyday Workflow

```
/create-feature-branch user-login     ← start
  ... write code ...
/commit                               ← save
/push                                 ← sync to GitHub, get preview URL
  ... test on preview URL ...
/security-assessment                  ← assess before PR
/create-pull-request                  ← open PR for review
```

## When You Need to Step Away Mid-Work

```
/stash-push    ← park your changes
  ... do other things ...
/stash-pop     ← restore and continue
```

## Keeping Branches Current

```
/sync-feature-branch    ← rebase YOUR branch on latest main (personal only)
/sync-testing-branch    ← merge main into testing (shared branch, uses merge)
```

---

## Conventional Commit Format

All commit messages must follow this format:

```
<type>: <short description>

[optional body]
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

---

## CI Pipeline (runs automatically)

1. lint — ESLint + TypeScript
2. test — unit + integration tests
3. security — npm audit
4. build — production build check

---

## Environments

| Environment | Branch    | URL                     |
|-------------|-----------|-------------------------|
| Production  | `main`    | yourapp.com             |
| Testing     | `testing` | testing.yourapp.com     |
| Preview     | any branch| branch-name.vercel.app  |

---

## Project Stack Defaults

Adjust per-project in a local CLAUDE.md override:

```
Node version: 20
Package manager: npm
Test runner: Vitest
Linter: ESLint + Biome
CI: GitHub Actions
Deploy: Vercel
```

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

## Security

Run `/security-assessment` before opening any PR.
The command invokes the security orchestrator agent in `.claude/agents/`
which runs a comprehensive assessment across OWASP Top 10, authentication,
injection risks, secrets exposure, and dependency vulnerabilities.

Security architecture is implemented through specialized skills at .claude/skills/security/:

Implementation Skills (how to build securely):
- security-overview: High-level defense-in-depth architecture and skill directory
- csrf-protection: CSRF protection implementation
- rate-limiting: Rate limiting implementation
- input-validation: Input validation and XSS prevention
- ai-chat-protection: AI chatbot protection and prompt injection prevention
- security-headers: Security headers configuration
- error-handling: Secure error handling
- auth-security: Clerk authentication and authorization
- payment-security: Clerk Billing and Stripe payment security
- dependency-security: Dependency and supply chain security
- security-testing: Testing security features

Awareness Skills (understanding AI code vulnerabilities):
- security-awareness/awareness-overview: Vibe coding security risks overview
- security-awareness/injection-vulnerabilities: SQL injection, command injection, XSS in AI code
- security-awareness/auth-vulnerabilities: Insecure passwords, broken sessions, access control
- security-awareness/information-leakage: Hardcoded secrets, verbose logging
- security-awareness/supply-chain-risks: Vulnerable dependencies, typosquatting
- security-awareness/business-logic-flaws: Race conditions, integer overflow
- security-awareness/resource-exhaustion: Unbounded operations, DoS, cost explosion

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
