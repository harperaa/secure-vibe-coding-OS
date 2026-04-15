---
name: security-operations-deployment
description: Operational security guidance for deployment, monitoring, and maintenance. Use this skill when you need to understand which middlewares to apply, configure environment variables, monitor security post-deployment, or follow the pre-deployment checklist. Triggers include "security operations", "deployment security", "security monitoring", "environment variables", "when to use middleware", "pre-deployment", "security checklist", "production security".
---

# Security Operations & Deployment

## When to Apply Each Middleware - Decision Guide

### withRateLimit() - Apply to:

✅ **Always apply to:**
- Any route that could be abused (spam, brute force)
- Login-like operations (even if Clerk handles auth)
- Data creation/modification endpoints
- Contact/support form endpoints
- Webhooks (to prevent DoS)
- File upload endpoints
- Search endpoints
- Data export endpoints
- Any expensive AI/API operations
- Report generation
- Bulk operations

❌ **Usually not needed for:**
- Static asset requests (handled by CDN)
- Simple GET endpoints that only read public data
- Health check endpoints
- Endpoints already protected by authentication rate limits

### withCsrf() - Apply to:

✅ **Always apply to:**
- All POST/PUT/DELETE operations
- Any state-changing operation
- Form submissions
- Account modifications
- Payment operations
- Data deletion operations

❌ **Skip for:**
- GET requests (read-only operations)
- Public read-only endpoints
- Webhooks (use signature verification instead)

### Combining Both Middlewares

**For maximum protection:**
```typescript
// Order matters: rate limit first, then CSRF
export const POST = withRateLimit(withCsrf(handler));
```

**Why order matters:**
1. Rate limiting runs first to block excessive requests early
2. CSRF verification runs on requests that pass rate limiting
3. More efficient: don't waste CSRF verification on rate-limited requests

**Decision Matrix:**

| Route Type | Rate Limit | CSRF | Authentication |
|------------|------------|------|----------------|
| Public form submission | ✅ Yes | ✅ Yes | ❌ No |
| Protected data modification | ✅ Yes | ✅ Yes | ✅ Yes |
| Public read-only API | ❌ No | ❌ No | ❌ No |
| Protected read-only API | ✅ Maybe | ❌ No | ✅ Yes |
| Webhook endpoint | ✅ Yes | ❌ No | ✅ Signature |
| File upload | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Environment Variables & Secrets

### Required Environment Variables for This Project

**Development (.env.local - NEVER commit):**

```bash
# CSRF Protection
# Generate with: node -p "require('crypto').randomBytes(32).toString('base64url')"
CSRF_SECRET=<32-byte-base64url-string>
SESSION_SECRET=<32-byte-base64url-string>

# Clerk Authentication (from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev

# Convex Database (from Convex dashboard)
CONVEX_DEPLOYMENT=dev:...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Optional: Stripe (if using direct Stripe, not Clerk Billing)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Clerk Webhook Secret
CLERK_WEBHOOK_SECRET=whsec_...
```

**Production (Vercel/hosting platform):**

```bash
# CSRF Protection (different from dev!)
CSRF_SECRET=<different-32-byte-string>
SESSION_SECRET=<different-32-byte-string>

# Clerk Production Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.com

# Convex Production
CONVEX_DEPLOYMENT=prod:...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Optional: Stripe Production
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Optional: Clerk Webhook Secret (production)
CLERK_WEBHOOK_SECRET=whsec_...
```

### Generating Secrets

```bash
# Generate CSRF_SECRET (32 bytes)
node -p "require('crypto').randomBytes(32).toString('base64url')"

# Generate SESSION_SECRET (32 bytes)
node -p "require('crypto').randomBytes(32).toString('base64url')"
```

### Environment Variable Best Practices

**✅ DO:**
- Use different secrets for dev/staging/production
- Generate strong random secrets (32+ bytes)
- Add `.env.local` to `.gitignore`
- Store production secrets in hosting platform's secret manager
- Rotate secrets quarterly
- Validate required environment variables on startup

**❌ NEVER:**
- Hardcode API keys, tokens, or secrets in code
- Commit `.env.local` to version control
- Log environment variables
- Expose secrets in client-side code
- Use `.env.local` values in `NEXT_PUBLIC_*` variables (they're exposed to browser!)
- Share secrets via email, Slack, or insecure channels

### Validating Configuration on Startup

```typescript
// lib/config.ts
const requiredEnvVars = [
  'CSRF_SECRET',
  'SESSION_SECRET',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CONVEX_URL'
];

export function validateConfig() {
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate secret lengths
  if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length < 32) {
    throw new Error('CSRF_SECRET must be at least 32 characters');
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
}

// In your app startup (e.g., middleware.ts or layout.tsx)
validateConfig();
```

---

## Pre-Deployment Security Checklist

Run through this checklist before **every** production deployment:

### Environment & Configuration

- [ ] All environment variables set in production environment
- [ ] `CSRF_SECRET` generated and configured (32+ bytes)
- [ ] `SESSION_SECRET` generated and configured (32+ bytes)
- [ ] Clerk production keys configured (`pk_live_...`, `sk_live_...`)
- [ ] Convex production deployment configured
- [ ] Stripe live mode keys configured (if using direct Stripe)
- [ ] `.env.local` NOT committed to git (check with `git status`)
- [ ] Different secrets used for dev vs production

### Dependencies

- [ ] Run `npm audit --production` - **0 vulnerabilities**
- [ ] Run `npm outdated` - Check for critical security updates
- [ ] `package-lock.json` committed to git
- [ ] Next.js on latest stable version (currently 15.5.4+)
- [ ] All critical packages updated

### Security Features

- [ ] CSRF protection tested (see `security-testing` skill)
- [ ] Rate limiting tested (`node scripts/test-rate-limit.js`)
- [ ] Input validation tested with malicious input
- [ ] Security headers verified (`curl -I https://yourapp.com`)
- [ ] HSTS enabled in production (automatic in middleware)
- [ ] Error messages are generic in production (no stack traces)

### Authentication & Authorization

- [ ] Protected routes require authentication
- [ ] Resource ownership checked before access
- [ ] Subscription status verified for premium features
- [ ] Webhook signatures verified (Clerk, Stripe)
- [ ] Session expiration handled gracefully
- [ ] No hardcoded credentials in code

### API Security

- [ ] All POST/PUT/DELETE routes have CSRF protection
- [ ] All public endpoints have rate limiting
- [ ] All user input validated with Zod schemas
- [ ] All errors handled with error handler utilities
- [ ] No sensitive data in logs (passwords, tokens, cards, PII)
- [ ] No hardcoded secrets in code (grep check below)

### Payment Security (if applicable)

- [ ] Using Clerk Billing + Stripe (not handling cards directly)
- [ ] Webhooks verified with Svix signatures
- [ ] Subscription status checked on server
- [ ] Test mode disabled in production
- [ ] No card data logged anywhere

### Testing

- [ ] Rate limit test passes: `node scripts/test-rate-limit.js`
- [ ] CSRF protection tested manually
- [ ] Input validation tested with XSS payloads
- [ ] Security headers checked: `curl -I https://yourapp.com`
- [ ] Authentication flows tested
- [ ] Error handling tested in production mode

### Final Checks

```bash
# Check for hardcoded secrets
grep -r "sk_live" . --exclude-dir=node_modules
grep -r "AKIA" . --exclude-dir=node_modules
grep -r "api_key.*=" . --exclude-dir=node_modules

# Verify .env.local not in git
git status | grep .env.local  # Should return nothing

# Run full security audit
npm audit --production
bash scripts/security-check.sh

# Test production build
npm run build
NODE_ENV=production npm start
```

---

## Security Monitoring Post-Deployment

### What to Monitor

#### Server Logs (Daily)

Monitor for these patterns that indicate potential attacks:

**Rate Limit Violations (HTTP 429):**
```
- Repeated 429 errors from same IP → potential abuse/brute force
- High volume of 429s → possible distributed attack
- 429s on login endpoints → credential stuffing attempt
```

**CSRF Failures (HTTP 403):**
```
- Repeated 403 with "CSRF token invalid" → potential CSRF attack
- Sudden spike in CSRF failures → possible automated attack
- 403s without prior token fetch → attack bypass attempt
```

**Authentication Failures (HTTP 401/403):**
```
- 401 spikes → potential brute force on protected endpoints
- 403 spikes → unauthorized access attempts
- Pattern of 401 followed by 403 → enumeration attack
```

**Unusual Error Patterns:**
```
- Sudden increase in 500 errors → potential attack or system issue
- 400 errors with validation failures → input attack attempts
- Errors from unusual geographic locations
```

#### Metrics to Track (Weekly)

**Authentication Metrics:**
- Failed authentication attempts per hour
- Account lockouts (if implemented)
- Geographic distribution of login attempts
- Unusual login times (3am mass logins = bot)

**Rate Limiting Metrics:**
- Rate limit violations per IP
- Top IPs hitting rate limits
- Endpoints most frequently rate-limited
- Rate limit violation trends over time

**CSRF Protection Metrics:**
- CSRF validation failures
- CSRF token generation rate
- Token reuse attempts
- Missing token attempts

**Input Validation Metrics:**
- Validation failures by field
- XSS attempt patterns (script tags in input)
- SQL injection attempt patterns
- Excessive input length attempts

**Error Rate Metrics:**
- Error rates by endpoint
- Error rates by HTTP status code
- Error rate trends over time
- Geographic distribution of errors

### Setting Up Monitoring

#### Vercel Logs (Built-in)

```bash
# View logs in Vercel dashboard
https://vercel.com/your-project/logs

# Filter by status code
Status: 429  # Rate limited
Status: 403  # CSRF/Forbidden
Status: 401  # Unauthorized
```

#### Clerk Dashboard (Authentication)

Monitor in Clerk dashboard:
- Failed sign-in attempts
- Account creation rate
- Session activity
- Suspicious IP addresses

#### Custom Logging

```typescript
// lib/security-logger.ts
export function logSecurityEvent(event: {
  type: 'RATE_LIMIT' | 'CSRF_FAILURE' | 'AUTH_FAILURE' | 'VALIDATION_FAILURE';
  ip?: string;
  userId?: string;
  endpoint?: string;
  details?: Record<string, any>;
}) {
  const log = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...event
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(log));
    // Optional: Send to external service (Datadog, LogRocket, etc.)
  } else {
    console.log('Security Event:', log);
  }
}

// Usage in middleware/routes
if (rateLimitExceeded) {
  logSecurityEvent({
    type: 'RATE_LIMIT',
    ip: clientIp,
    endpoint: request.nextUrl.pathname
  });
}
```

### Response Procedures

**High-Priority Alerts (Immediate Response):**
- Massive spike in failed authentication (>100/min)
- CSRF failures from many IPs (coordinated attack)
- Sudden 500 error rate increase (>10x normal)
- Known vulnerability being exploited

**Medium-Priority (24-hour Response):**
- Gradual increase in rate limit violations
- Single IP with persistent failed auth attempts
- New error patterns in logs
- Unusual traffic from new geographic regions

**Low-Priority (Weekly Review):**
- Normal background failed auth attempts
- Occasional rate limit hits
- Standard input validation failures
- Routine error patterns

### Automated Alerting

Set up alerts in your hosting platform:

**Vercel:**
```
Alerts → New Alert Rule
- Error rate > 10% for 5 minutes → Email/Slack
- 429 responses > 100/min → Email/Slack
- 500 responses > 50/min → Email/Slack
```

**Custom Alerts:**
```typescript
// Monitor and alert on patterns
if (rateLimitViolations > THRESHOLD) {
  await sendAlert({
    severity: 'HIGH',
    message: `Rate limit violations: ${rateLimitViolations}/min`,
    ip: attackerIp
  });
}
```

---

## Resources & Documentation

### Project Security Documentation

**Implementation Guides:**
- `.claude/skills/security/security-overview/SKILL.md` - Overall architecture
- `.claude/skills/security/*/SKILL.md` - Individual security features
- `docs/security/SECURITY_IMPLEMENTATION.md` - Complete implementation guide
- `README.md` - Security Configuration section

**Awareness & Learning:**
- `.claude/skills/security/security-awareness/` - AI code vulnerability analysis
- `.claude/skills/security/security-awareness/awareness-overview/` - Complete security overview

### Testing & Verification Scripts

**Security Testing:**
- `scripts/test-rate-limit.js` - Rate limiting verification
- `scripts/security-check.sh` - Dependency audit
- `scripts/security-test.sh` - Comprehensive security test suite (if created)

**Example Implementations:**
- `app/api/example-protected/route.ts` - Complete security stack example
- `app/api/test-rate-limit/route.ts` - Rate limiting test endpoint
- `app/api/csrf/route.ts` - CSRF token generation

### External Security Resources

**OWASP (Security Standards):**
- OWASP Top 10 2021: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org
- OWASP API Security Top 10: https://owasp.org/www-project-api-security/

**Framework & Service Docs:**
- Next.js Security: https://nextjs.org/docs/app/guides/security
- Clerk Security: https://clerk.com/docs/security
- Convex Security: https://docs.convex.dev/production/hosting/authentication
- Stripe Security: https://stripe.com/docs/security

**Testing Tools:**
- Security Headers Scanner: https://securityheaders.com/
- Mozilla Observatory: https://observatory.mozilla.org/
- SSL Labs Test: https://www.ssllabs.com/ssltest/

---

## Maintenance Schedule

### Daily
- Check error logs in Vercel dashboard
- Monitor Clerk dashboard for failed auth attempts
- Review any security alerts

### Weekly
- Run `npm audit --production`
- Check GitHub Dependabot alerts
- Review error logs for patterns
- Check rate limit violation trends

### Monthly
- Full security audit: `bash scripts/security-check.sh`
- Update dependencies: `npm update` + test
- Review and rotate any compromised secrets
- Re-run security testing suite
- Check security headers: https://securityheaders.com/

### Quarterly
- Rotate CSRF_SECRET and SESSION_SECRET
- Major framework updates (Next.js, React)
- Full penetration test (manual XSS, CSRF, auth bypass attempts)
- Review and update security policies
- Security awareness training (review skills)

---

## Quick Reference Commands

```bash
# Generate secrets
node -p "require('crypto').randomBytes(32).toString('base64url')"

# Check for vulnerabilities
npm audit --production

# Check for outdated packages
npm outdated

# Run security test suite
node scripts/test-rate-limit.js
bash scripts/security-check.sh

# Check for hardcoded secrets
grep -r "sk_live" . --exclude-dir=node_modules
grep -r "AKIA" . --exclude-dir=node_modules

# Test security headers
curl -I https://yourapp.com

# Verify .env.local not committed
git status | grep .env.local

# Production build test
npm run build
NODE_ENV=production npm start
```

---

## Summary: Security Operations Principles

🔒 **Before Deployment:**
- Checklist must be 100% complete
- 0 npm audit vulnerabilities
- All tests passing
- All environment variables configured

🔒 **After Deployment:**
- Monitor logs daily
- Respond to alerts immediately
- Review metrics weekly
- Update dependencies monthly

🔒 **Continuous:**
- Security is never "done"
- Stay updated on new vulnerabilities
- Keep dependencies current
- Test security features regularly

**For implementation details, refer to individual security skills.**
**For vulnerability awareness, refer to security-awareness skills.**
