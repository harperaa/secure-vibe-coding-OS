See @.cursor/rules/convex_rules.mdc for Convex guidelines.


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

Dynamic Lessons Library (user-generated session learnings):
IMPORTANT: Before starting any new work, ALWAYS check .claude/skills/lessons/ for relevant past learnings.

- Location: .claude/skills/lessons/*/SKILL.md
- Created by: /retrospective command after completing work
- Contains: What worked, what failed, exact parameters, lessons learned from actual sessions
- Discovery: Use /advise command to search lessons OR manually scan folder for relevant topics
- Examples of lessons you might find:
  - lessons/implementing-rate-limiting/ - Rate limiting implementation learnings
  - lessons/fixing-csrf-validation/ - CSRF debugging experiences
  - lessons/optimizing-convex-queries/ - Database query optimization findings
  - lessons/debugging-clerk-webhooks/ - Webhook troubleshooting solutions

How to use lessons:
1. BEFORE starting work: Check if similar work was done before by scanning .claude/skills/lessons/
2. READ relevant lesson SKILL.md files to learn from past successes and failures
3. APPLY exact parameters and approaches that worked
4. AVOID approaches documented in "Failed Attempts" tables
5. AFTER completing work: Run /retrospective to capture YOUR learnings for future sessions

Note: Lessons folder may be empty initially and grows over time. Each lesson is a valuable asset that makes future work faster and more successful.

# Project — Git & CI/CD Conventions

This file is read automatically by Claude Code on every session.
Follow these conventions for all git, CI/CD, and workflow operations.

---

## Branch Rules

| Branch       | Purpose                              | Push method          |
|--------------|--------------------------------------|----------------------|
| `main`       | Production. Always deployable.       | PR only — never direct |
| `testing`    | Shared integration / validation env  | Direct merge from feat branches |
| `feat/name`  | New features                         | Push freely, PR to main when done |
| `fix/name`   | Bug fixes                            | Push freely, PR to main when done |
| `chore/name` | Maintenance / cleanup                | Push freely, PR to main when done |

**Non-negotiable rules:**
- Always branch from `main` — never from `testing` or another feature branch
- Always `git checkout main && git pull origin main` before creating a branch
- PRs go to `main` only — `testing` is a scratchpad, never merge it into `main`
- Minimum 1 reviewer on every PR — you cannot approve your own PR
- Never commit secrets, API keys, or credentials of any kind

---

## Conventional Commit Format

All commit messages must follow this format:

```
<type>: <short description>

[optional body]
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

Examples:
- `feat: add user authentication flow`
- `fix: correct null check on dashboard load`
- `chore: update dependencies`
- `docs: update README with setup steps`

---

## CI Pipeline

Defined in `.github/workflows/ci.yml`. Four jobs run on every push and PR:

1. **lint** — ESLint + TypeScript typecheck
2. **test** — Vitest / Jest unit + integration tests
3. **security** — `npm audit --audit-level=high`
4. **build** — Production build verification

All four must pass before any PR can merge to `main`.

---

## Environments

| Environment | Branch    | URL                        | Triggered by       |
|-------------|-----------|----------------------------|--------------------|
| Production  | `main`    | yourapp.com                | Merge to main      |
| Testing     | `testing` | testing.yourapp.com        | Push to testing    |
| Preview     | Any branch| `[branch].vercel.app`      | Any push to remote |

---

## Available Slash Commands

Run these from Claude Code with `/command-name`:

| Command               | What it does                                          |
|-----------------------|-------------------------------------------------------|
| `/start-feature`      | Checkout main, pull latest, create new branch         |
| `/save`               | Stage all changes and commit with conventional format |
| `/push`               | Smart push — detects first push and sets upstream     |
| `/sync`               | Rebase current branch against latest origin/main      |
| `/pr`                 | Open a pull request to main via GitHub CLI            |
| `/merge-to-testing`   | Merge current branch into testing branch              |
| `/branches`           | List all branches with ahead/behind status            |
| `/status`             | Full workflow status — branch, CI, changes            |
| `/ci-status`          | Check GitHub Actions CI status for current branch     |
| `/standup`            | Summarize today's commits for standup                 |
| `/scan-secrets`       | Run detect-secrets scan on staged/changed files       |
| `/undo`               | Safely undo last commit (keeps changes staged)        |
| `/discard`            | Discard uncommitted changes (with confirmation)       |
| `/cleanup`            | Delete local branches already merged into main        |
| `/setup-hooks`        | Install Husky, lint-staged, and detect-secrets        |

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

## Security Reminders (from Secure Vibe Coding)

- Run `/scan-secrets` before opening any PR
- Never hardcode env vars — use `.env.local` (gitignored) for local dev
- `.env.example` documents required vars without values — keep it updated
- `npm audit` runs in CI but also run locally before a PR if you added packages
- Vercel preview URLs are public by default — authentication is enabled on this project


## Urgent 

Use npm tsc --noEmit to check types after each major change
Use npx convex dev --once --typecheck=enable 2>&1 | tail -20 to check Convex types
