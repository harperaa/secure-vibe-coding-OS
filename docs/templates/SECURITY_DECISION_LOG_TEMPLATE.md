# Security Decision Log

**Project:** [Your App Name]
**Last Updated:** [Date]

## Purpose

This document records WHY we made each major security decision. Future you (and your team) will thank you for documenting the reasoning.

---

## Decision Template

For each major decision, document using this format:

### Decision [Number]: [Decision Title]

**DECISION:** [What we chose]

**ALTERNATIVES CONSIDERED:**
- Option 1: [Alternative] - [Why not chosen]
- Option 2: [Alternative] - [Why not chosen]
- Option 3: [Alternative] - [Why not chosen]

**RATIONALE:** [Why we chose this option - be specific]

**TRADE-OFFS:** [What we gave up by choosing this]

**RISKS:** [What could go wrong with this choice]

**MITIGATION:** [How we handle the risks]

**STATUS:** [Active / Under Review / Deprecated]

---

## Example Decisions (Inherited from Secure Vibe Coding OS)

### Decision 1: Use Clerk for Authentication

**DECISION:** Use Clerk as our authentication and user management provider

**ALTERNATIVES CONSIDERED:**
- Auth0: Enterprise-grade but more expensive (~$25/month vs Clerk's ~$25/month)
- NextAuth.js: Free and flexible, but requires security expertise to implement safely
- Supabase Auth: Good option, but ties us to Supabase ecosystem
- Custom authentication: Maximum control, but 10x development time and highest security risk

**RATIONALE:**
- Clerk is built security-first (SOC 2 certified)
- Handles complex security features (MFA, session management) automatically
- Integrates seamlessly with Convex via JWT
- Clerk Billing eliminates need for direct Stripe integration
- Reduces our security attack surface significantly

**TRADE-OFFS:**
- Less customization than building our own auth
- Vendor lock-in to Clerk
- Monthly cost scales with user count
- Must trust Clerk's security practices

**RISKS:**
- Clerk service outage would affect our app
- Pricing changes could impact our business model
- Migration away from Clerk would be complex

**MITIGATION:**
- Clerk has 99.99% uptime SLA
- Monitor Clerk's status page
- Budget for scaling costs
- Abstract Clerk calls behind our own functions where possible

**STATUS:** Active

---

### Decision 2: Use HMAC-SHA256 for CSRF Tokens

**DECISION:** Implement CSRF protection using HMAC-SHA256 signed tokens

**ALTERNATIVES CONSIDERED:**
- Double-submit cookies: Simpler, but less secure
- Synchronizer tokens: Secure, but requires session storage
- SameSite cookies only: Not sufficient alone

**RATIONALE:**
- HMAC-SHA256 provides cryptographic verification
- Session-bound tokens prevent token theft across sessions
- Single-use tokens prevent replay attacks
- Industry-standard approach

**TRADE-OFFS:**
- Slightly more complex than double-submit
- Requires secure secret management

**RISKS:**
- If CSRF_SECRET leaks, tokens can be forged

**MITIGATION:**
- Store CSRF_SECRET in environment variables
- Never commit secrets to Git
- Rotate secrets if compromise suspected

**STATUS:** Active

---

## Your Custom Decisions

### Decision 3: [Your First Major Decision]

**DECISION:** [What you chose for your app]

**ALTERNATIVES CONSIDERED:**
- [Alternative 1]: [Why not]
- [Alternative 2]: [Why not]

**RATIONALE:** [Why this choice makes sense for your app]

**TRADE-OFFS:** [What you're giving up]

**RISKS:** [What could go wrong]

**MITIGATION:** [How you'll handle it]

**STATUS:** [Active]

---

### Decision 4: [Your Second Major Decision]

[Use template above]

---

### Decision 5: [Your Third Major Decision]

[Use template above]

---

## Security Patterns We Follow

- ✅ Defense-in-depth (multiple layers of security)
- ✅ Fail-secure (errors deny access)
- ✅ Least privilege (minimum access needed)
- ✅ Input validation (validate all user data)
- ✅ Output encoding (prevent XSS)
- ✅ Secure by default (opt-in to relaxed security)

## Security Patterns We Don't Follow (And Why)

**Pattern:** [Security pattern name]
**Why not:** [Reason it doesn't apply to our app]
**Risk accepted:** [What risk we're accepting]

Example:
- **Pattern:** Field-level database encryption
- **Why not:** Our data isn't highly sensitive (no health records, no financial data)
- **Risk accepted:** Database compromise would expose user profiles (mitigated by strong access controls)

---

## Compliance Requirements

**Current Requirements:**
- GDPR (if EU users): [Yes/No] - [Status]
- CCPA (if CA users): [Yes/No] - [Status]
- PCI-DSS: Handled by Stripe ✅
- HIPAA: [Not applicable / Compliant]

**Future Requirements:**
- [Any compliance you'll need as you scale]

---

## Notes

**Document your decisions as you make them, not after.** When you're choosing between options, write down why. Future you will be grateful.

**Update this log when decisions change.** If you switch technologies or change approaches, document why and what changed.
