See @.cursor/rules/convex_rules.mdc for Convex guidelines.


Security architecture is implemented through specialized skills at .claude/skills/security/:

Implementation Skills (how to build securely):
- security-overview: High-level defense-in-depth architecture and skill directory
- csrf-protection: CSRF protection implementation
- rate-limiting: Rate limiting implementation
- input-validation: Input validation and XSS prevention
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

Use npm tsc --noEmit to check types after each major change