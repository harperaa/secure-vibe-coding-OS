# Security Policy

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Please use GitHub's private vulnerability reporting instead:

1. Go to the [Security Advisories page](https://github.com/harperaa/secure-vibe-coding-OS/security/advisories)
2. Click **"Report a vulnerability"** (or open the [report form](https://github.com/harperaa/secure-vibe-coding-OS/security/advisories/new) directly)
3. Provide as much detail as possible: steps to reproduce, affected components, and potential impact

Reports are private between you and the maintainers until a fix is ready. You'll be credited in the advisory if you'd like.

## What qualifies as a security issue?

- Authentication or authorization bypass (Clerk session handling, Convex function auth, admin-only checks such as the security dashboard, access to another user's data)
- CSRF or rate-limiting bypass in `secure-vibe-runtime`, or missing security headers from `proxy.ts`
- Secret leakage (Clerk, Convex, Stripe or Doppler credentials exposed in logs, the security log, client bundles, build output or script output)
- Webhook signature verification bypass (the Clerk webhook handler in `convex/http.ts`)
- Payment or subscription-gating bypass (Clerk Billing plan checks, payment attempt records)
- Injection, XSS or path traversal in the shipped app or the content modules
- Command injection or unsafe handling of environment values in the setup and deploy scripts
- Supply-chain weaknesses in the template's dependency or CI configuration

Not a security report: how-to questions, and vulnerabilities in an app you built on the template that do not come from the template itself. Open a normal issue or ask in the [Skool community](https://www.skool.com/ai-cyber-value-creators) for those.

## Supported versions

Security fixes are made on `main` and ship in the next release. Only the latest release of the template and the latest published `secure-vibe-runtime` package receive fixes.

## Response timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depends on severity, but critical issues are prioritized immediately
