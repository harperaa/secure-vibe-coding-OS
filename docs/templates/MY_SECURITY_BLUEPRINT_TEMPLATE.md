# [Your App Name] Security Architecture Blueprint

**Version:** 1.0
**Last Updated:** [Date]
**Author:** [Your Name]

## Executive Summary

**What This App Does:**
[2-3 sentences describing your SaaS application]

**Why Security Matters:**
[Explain what you're protecting - user data, payments, etc.]

**Key Security Principles:**
1. Defense-in-depth (multiple security layers)
2. Fail-secure (errors deny access by default)
3. Least privilege (minimum access needed)

**Overall Security Posture:**
- Built on Secure Vibe Coding OS (90/100 OWASP score baseline)
- Custom features: [Number] added with security controls
- External integrations: [List services - Stripe, AI, etc.]

---

## 1. Visual Architecture

### System Components

```
User Browser
    ↓
[Next.js Frontend] ← Security Headers (CSP, HSTS, X-Frame-Options)
    ↓
[Middleware] ← Rate Limiting, CSRF Protection
    ↓
[API Routes] ← Input Validation, Auth Checks
    ↓
┌─────────┬──────────┬─────────┐
│  Clerk  │  Convex  │ Stripe  │
│  (Auth) │   (DB)   │ (Pay)   │
└─────────┴──────────┴─────────┘
```

### Data Flow Map

**User Sign-Up Flow:**
1. User → Frontend (form submission)
2. Frontend → Clerk (authentication)
3. Clerk → Webhook → Convex (user record created)
4. Convex → Frontend (user data synced)

**Protected Feature Access:**
1. User → Frontend (requests protected feature)
2. Middleware → Checks authentication (Clerk session)
3. Middleware → Checks authorization (subscription tier)
4. API Route → Rate limiting check
5. API Route → CSRF validation
6. API Route → Input validation
7. Handler → Business logic
8. Convex → Database operation
9. Response → User

**Payment Flow:**
1. User → Clerk Billing widget
2. Clerk → Stripe (payment processing)
3. Stripe → Clerk (payment confirmed)
4. Clerk → Webhook → Convex (subscription updated)
5. App → Checks subscription status → Grants access

---

## 2. Security Decision Log

### Decision 1: Why Clerk for Authentication?

**DECISION:** Use Clerk for authentication and user management
**ALTERNATIVES CONSIDERED:**
- Auth0: More expensive, complex setup
- NextAuth: More control, but requires security expertise
- Supabase Auth: Good, but tied to Supabase ecosystem
- Custom auth: Most flexible, but highest security risk

**RATIONALE:**
- Clerk is security-first (SOC 2 certified)
- Handles MFA, session management, user sync
- Integrates with Convex seamlessly
- Clerk Billing simplifies payments
- Reduces our security attack surface

**TRADE-OFFS:**
- Less customization than building custom
- Vendor lock-in
- Monthly cost per user

**RISKS:**
- Clerk service outage affects our app
- Pricing changes could impact costs

**MITIGATION:**
- Clerk has 99.99% uptime SLA
- Monitor their status page
- Budget for scaling costs

### Decision 2: Why Convex for Database?

**DECISION:** [Fill in your reasoning]
**ALTERNATIVES:** [List alternatives]
**RATIONALE:** [Why Convex?]
**TRADE-OFFS:** [What you gave up]
**RISKS:** [What could go wrong]
**MITIGATION:** [How you handle it]

### Decision 3: Why [Your Other Decisions]

[Continue for each major technology choice]

---

## 3. Threat Model

### Assets to Protect

**User Data:**
- Email addresses
- Profile information
- Subscription status
- [Your app-specific user data]

**Business Data:**
- [List your business-critical data]

**System Access:**
- API keys (Clerk, Convex, Stripe, AI services)
- Database credentials
- Webhook secrets

**Intellectual Property:**
- [Your app's unique features/algorithms]

### Threat Actors

**Malicious Users:**
- Trying to access other users' data
- Attempting to bypass payment requirements
- Spamming features to cause costs

**Automated Attacks:**
- Bots attempting brute force
- Script kiddies using automated tools
- Credential stuffing attacks

**Competitors:**
- Trying to steal business logic
- Analyzing features and pricing

### Attack Scenarios & Mitigations

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|---------|------------|--------|
| CSRF attack on payment forms | Medium | High | withCsrf() middleware | ✅ Active |
| Brute force login attempts | High | Medium | Rate limiting (5/min) | ✅ Active |
| XSS via user input | High | High | Zod validation, sanitization | ✅ Active |
| SQL injection | Low | High | Convex (NoSQL, parameterized) | ✅ Active |
| Unauthorized data access | Medium | High | Clerk auth + authorization | ✅ Active |
| API key leakage | Medium | High | Environment variables only | ✅ Active |
| Webhook forgery | Medium | High | Signature verification (Clerk) | ✅ Active |
| [Your custom threat] | [L/M/H] | [L/M/H] | [Your mitigation] | [Status] |

---

## 4. Component Security Details

### Authentication Layer (Clerk)

**Purpose:** User identity and session management
**Security Controls:**
- OAuth 2.0 / OIDC standard
- MFA support available
- Secure session cookies (httpOnly, sameSite=strict)
- Automatic session expiration

**Threats Mitigated:**
- Credential theft
- Session hijacking
- Weak passwords (Clerk enforces strength)

**Configuration:**
- Environment variables in `.env.local`
- JWT template for Convex integration
- Webhooks for user sync

### Database Layer (Convex)

**Purpose:** Real-time serverless database
**Security Controls:**
- Type-safe queries (TypeScript)
- Built-in validation (Convex schema)
- Input validation (Zod schemas in mutations)
- User-scoped queries (ctx.auth.userId)

**Threats Mitigated:**
- SQL/NoSQL injection (ORM-style API)
- Unauthorized data access (authentication required)
- Data tampering (validation on writes)

### Payment Layer (Clerk Billing + Stripe)

**Purpose:** Subscription billing and payment processing
**Security Controls:**
- PCI compliance (Stripe hosted)
- No card data storage (Stripe handles)
- Webhook signature verification (Clerk)
- Test/production mode separation

**Threats Mitigated:**
- Card data breach (no cards stored)
- Fake payment confirmations (webhook signatures)
- Payment bypass attempts (server-side checks)

### [Your Additional Components]

[Document each component you add]

---

## 5. Implementation Roadmap

### Phase 1: Foundation ✅ (Already Complete)
- [x] Secure Vibe Coding OS installed
- [x] Environment variables configured
- [x] Clerk authentication working
- [x] Convex database connected
- [x] CSRF protection active
- [x] Rate limiting implemented
- [x] Input validation ready
- [x] Security headers applied

### Phase 2: Customization (Your Work)
- [ ] App branded with your name/colors
- [ ] Landing page customized
- [ ] Subscription plans configured
- [ ] Custom validation schemas created (if needed)

### Phase 3: Core Features (Your Work)
- [ ] Feature 1: [Name] - [Security controls applied]
- [ ] Feature 2: [Name] - [Security controls applied]
- [ ] Feature 3: [Name] - [Security controls applied]

### Phase 4: Testing
- [ ] Rate limiting tested
- [ ] CSRF protection verified
- [ ] Input validation tested with XSS payloads
- [ ] Authentication flow tested
- [ ] Subscription gating verified
- [ ] Security headers confirmed

### Phase 5: Production Deployment
- [ ] Production Clerk instance created
- [ ] Production Convex deployment created
- [ ] Vercel configured with prod env vars
- [ ] Production webhooks configured
- [ ] All security tests passing in prod
- [ ] Monitoring configured

---

## 6. Security Standards

### For All New Code:

**API Routes MUST:**
- Use `withRateLimit()` for abuse-prone endpoints
- Use `withCsrf()` for POST/PUT/DELETE
- Validate input with Zod schemas from `lib/validation.ts`
- Use `handleApiError()` for error handling
- Check authentication with `auth()` from Clerk
- Set `runtime: 'nodejs'` in config

**Convex Mutations MUST:**
- Validate args with Zod schemas
- Check authentication via `ctx.auth`
- Associate data with user ID
- Throw errors for invalid input

**Frontend Components MUST:**
- Use Clerk's `Protect` for subscription gating
- Never trust client-side auth checks
- Sanitize any user-generated content display

---

## 7. Incident Response Plan

**If Security Incident Detected:**

**Immediate Actions:**
1. Roll back deployment (Vercel dashboard or `git revert`)
2. Revoke compromised credentials
3. Check logs (Clerk, Convex, Vercel)

**Investigation:**
1. Identify scope of breach
2. Review affected user accounts
3. Document timeline
4. Preserve evidence

**Resolution:**
1. Patch vulnerability
2. Test fix in dev/staging
3. Deploy to production
4. Verify fix effective

**Post-Incident:**
1. Update security documentation
2. Add tests to prevent recurrence
3. Review similar code patterns
4. Notify affected users if required

---

## 8. Ongoing Security Maintenance

**Daily:**
- Monitor error logs for security events
- Check for failed authentication attempts

**Weekly:**
- Export database backup
- Review recent code changes for security

**Monthly:**
- Run `npm audit` and fix vulnerabilities
- Update dependencies
- Review security logs

**Quarterly:**
- Update OWASP assessment
- Review and update threat model
- Security architecture review
- Rotate secrets if needed

---

## 9. Reference

**Project Security Documentation:**
- This file: Security Architecture Blueprint
- `docs/security/OWASP_TOP_10_ASSESSMENT.md` - Security scoring
- `docs/security/security_risk.md` - Risk analysis examples
- `.cursor/rules/security_rules.mdc` - AI coding security rules
- `DEPLOYMENT.md` - Deployment security guide

**Testing:**
- `scripts/test-rate-limit.js` - Rate limiting tests
- `scripts/security-check.sh` - Dependency audit
- `app/api/example-protected/route.ts` - Security pattern example

**External Resources:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Clerk Security: https://clerk.com/docs/security
- Convex Security: https://docs.convex.dev/production/

---

## 10. Blueprint Updates

**When to Update This Document:**
- Adding new features (update threat model, add to roadmap)
- Changing architecture (update diagrams, decision log)
- After security incidents (update incident response, add lessons learned)
- Quarterly reviews (update dates, verify accuracy)

**Version History:**
- v1.0 - [Date] - Initial blueprint based on Secure Vibe Coding OS
- v1.1 - [Date] - [Your first update]

---

**This blueprint is a living document. Update it as your app evolves.**
