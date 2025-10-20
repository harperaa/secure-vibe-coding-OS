See @.cursor/rules/convex_rules.mdc for Convex guidelines.

See @.cursor/rules/security_rules.mdc for security guidelines.

See @docs/security/security_risk.md for security risk analysis and mitigation strategies.

Security architecture is implemented through specialized skills in .claude/skills/:
- security-overview: High-level architecture and when to use other skills
- csrf-protection: CSRF protection implementation
- rate-limiting: Rate limiting implementation
- input-validation: Input validation and XSS prevention
- security-headers: Security headers configuration
- error-handling: Secure error handling
- auth-security: Clerk authentication and authorization
- payment-security: Clerk Billing and Stripe payment security
- dependency-security: Dependency and supply chain security
- security-testing: Testing security features

Use npm tsc --noEmit to check types after each major change