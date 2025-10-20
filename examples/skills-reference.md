# Skills Reference Guide

Complete reference of all security skills included in this package.

## Skill Activation

Skills are automatically triggered when you use relevant keywords in your Claude Code conversations. Each skill includes trigger words that activate it.

## Available Skills

### 1. Security Overview

**Path**: `security-overview/`

**Purpose**: High-level understanding of the defense-in-depth security architecture and when to use other skills.

**Trigger Keywords**:
- "security architecture"
- "defense in depth"
- "security layers"
- "how does security work"
- "OWASP score"
- "security overview"
- "security principles"

**Example Prompts**:
```
"Explain the security architecture"
"What security layers are implemented?"
"Show me the OWASP assessment"
```

**What You Get**:
- 5-layer security model explanation
- OWASP Top 10 coverage
- When to use each security skill
- Architecture decision rationale

---

### 2. CSRF Protection

**Path**: `csrf-protection/`

**Purpose**: Implement Cross-Site Request Forgery protection for API routes.

**Trigger Keywords**:
- "CSRF"
- "cross-site request forgery"
- "protect form"
- "token validation"
- "withCsrf"
- "CSRF token"
- "session fixation"

**Example Prompts**:
```
"Add CSRF protection to my contact form"
"Protect my API routes from CSRF attacks"
"Implement CSRF token validation"
```

**What You Get**:
- HMAC-SHA256 token generation
- Single-use token implementation
- HTTP-only cookie configuration
- Client-side integration examples

**Prevents**:
- Cross-site request forgery
- Session fixation attacks
- Cross-origin form submissions

---

### 3. Rate Limiting

**Path**: `rate-limiting/`

**Purpose**: Prevent brute force attacks, spam, and resource abuse.

**Trigger Keywords**:
- "rate limit"
- "rate limiting"
- "prevent spam"
- "brute force"
- "API abuse"
- "request throttling"
- "DoS protection"

**Example Prompts**:
```
"Add rate limiting to prevent API abuse"
"Protect my login endpoint from brute force"
"Limit requests to 5 per minute"
```

**What You Get**:
- Per-IP rate limiting
- Configurable limits (default: 5 req/min)
- HTTP 429 responses
- In-memory tracking

**Prevents**:
- Brute force password attacks
- Credential stuffing
- API spam and abuse
- Resource exhaustion (DoS)

---

### 4. Input Validation

**Path**: `input-validation/`

**Purpose**: Validate and sanitize all user input to prevent injection attacks.

**Trigger Keywords**:
- "input validation"
- "validate input"
- "sanitize"
- "XSS"
- "injection"
- "Zod validation"
- "safe input"

**Example Prompts**:
```
"Validate user input to prevent XSS"
"Add input sanitization to my form"
"Create Zod schema for user profile"
```

**What You Get**:
- Zod validation schemas
- Automatic XSS sanitization
- Type-safe validation
- Reusable validation utilities

**Prevents**:
- Cross-site scripting (XSS)
- SQL/NoSQL injection
- Command injection
- Template injection

---

### 5. Security Headers

**Path**: `security-headers/`

**Purpose**: Configure browser security headers for multiple attack prevention.

**Trigger Keywords**:
- "security headers"
- "CSP"
- "Content-Security-Policy"
- "X-Frame-Options"
- "HSTS"
- "browser security"
- "clickjacking"

**Example Prompts**:
```
"Add security headers to my Next.js app"
"Configure Content-Security-Policy"
"Prevent clickjacking attacks"
```

**What You Get**:
- Content-Security-Policy configuration
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Environment-aware headers

**Prevents**:
- Clickjacking
- XSS amplification
- MIME confusion attacks
- SSL stripping
- Search engine indexing of private pages

---

### 6. Error Handling

**Path**: `error-handling/`

**Purpose**: Secure error handling that prevents information leakage.

**Trigger Keywords**:
- "error handling"
- "secure errors"
- "hide errors"
- "generic errors"
- "error messages"
- "information leakage"

**Example Prompts**:
```
"Add secure error handling to my API"
"Hide error details in production"
"Implement generic error responses"
```

**What You Get**:
- Environment-aware error responses
- Generic production messages
- Detailed development errors
- HTTP status code helpers
- Secure logging patterns

**Prevents**:
- Information disclosure
- System fingerprinting
- Database structure revelation
- Attack surface reconnaissance

---

### 7. Auth Security

**Path**: `auth-security/`

**Purpose**: Clerk authentication and authorization best practices.

**Trigger Keywords**:
- "authentication"
- "Clerk security"
- "auth"
- "sessions"
- "user permissions"
- "access control"

**Example Prompts**:
```
"Implement Clerk authentication"
"Add authorization checks to my API"
"Protect routes with Clerk"
```

**What You Get**:
- Clerk integration patterns
- Session management
- Authorization checks
- Subscription-based access control
- SOC 2 compliance guidance

**Prevents**:
- Weak password storage
- Session hijacking
- Authentication bypass
- Privilege escalation

---

### 8. Payment Security

**Path**: `payment-security/`

**Purpose**: Secure payment handling with Clerk Billing and Stripe.

**Trigger Keywords**:
- "payment security"
- "PCI compliance"
- "Stripe"
- "Clerk Billing"
- "credit card"
- "subscription"

**Example Prompts**:
```
"Add payment processing securely"
"Implement Clerk Billing"
"Ensure PCI compliance"
```

**What You Get**:
- Clerk Billing integration
- Never-touch-card-data architecture
- Webhook security
- Subscription management
- PCI-DSS avoidance patterns

**Prevents**:
- Card data breaches
- PCI-DSS compliance burden
- Payment fraud
- Webhook forgery

---

### 9. Dependency Security

**Path**: `dependency-security/`

**Purpose**: Manage and audit dependencies for supply chain security.

**Trigger Keywords**:
- "dependency security"
- "npm audit"
- "supply chain"
- "vulnerabilities"
- "package security"
- "npm packages"

**Example Prompts**:
```
"Audit dependencies for vulnerabilities"
"Update insecure packages"
"Check for supply chain risks"
```

**What You Get**:
- npm audit automation
- Vulnerability scanning
- Update strategies
- Dependency verification
- Supply chain best practices

**Prevents**:
- Known vulnerability exploitation
- Malicious package injection
- Supply chain attacks
- Dependency confusion

---

### 10. Security Testing

**Path**: `security-testing/`

**Purpose**: Automated testing of security features.

**Trigger Keywords**:
- "security testing"
- "test security"
- "verify security"
- "security checks"
- "penetration testing"

**Example Prompts**:
```
"Add security tests for CSRF protection"
"Test rate limiting implementation"
"Verify input sanitization"
```

**What You Get**:
- Test scripts for each security feature
- CSRF protection tests
- Rate limiting verification
- Input validation tests
- Security header checks

**Tests**:
- CSRF token validation
- Rate limit enforcement
- Input sanitization
- Header presence
- Error message safety

---

## Skill Combinations

Many security features work together. You can trigger multiple skills in one prompt:

### Example: Secure API Endpoint

```
You: Create a secure contact form API with CSRF protection,
rate limiting, and input validation
```

This triggers:
- `csrf-protection` → CSRF middleware
- `rate-limiting` → Rate limit middleware
- `input-validation` → Zod validation schemas

### Example: Complete Security Setup

```
You: Set up complete security for my Next.js app following
the security architecture
```

This triggers:
- `security-overview` → Architecture understanding
- `security-headers` → Middleware headers
- `csrf-protection` → CSRF setup
- `rate-limiting` → Rate limiting setup
- `input-validation` → Validation utilities
- `error-handling` → Error handlers

## Explicit Skill Invocation

You can explicitly tell Claude to use a specific skill:

```
You: Use the csrf-protection skill to secure my API
```

## Customizing Skills

After installation, you can customize skills:

1. Edit skill files in `.claude/skills/security/`
2. Add your own examples
3. Adjust security levels
4. Add project-specific patterns

If installed with subtree, consider forking before major customizations.

## Contributing New Skills

Want to add a skill? See [Contributing Guide](../README.md#contributing).

Potential future skills:
- SQL injection prevention (specific to raw SQL queries)
- API key rotation
- Secrets management
- Security monitoring
- Incident response

## Getting Help

- **Can't trigger a skill?** Try more explicit keywords
- **Skill not working as expected?** Check skill file in `.claude/skills/security/`
- **Need new skill?** Open an issue: https://github.com/harperaa/secure-claude-skills/issues
