# Security Code Review

**Category**: Threat Modeling  
**When to Use**: After implementing features, before deployment  
**Module**: 3.5  
**Time to Implement**: 30 minutes

## Review Coverage

- ✅ Authentication & Authorization
- ✅ Input Validation
- ✅ Security Middleware
- ✅ Error Handling
- ✅ Data Protection
- ✅ OWASP Top 10

## The Prompt

```
Review this code for security vulnerabilities and alignment with Secure Vibe Coding OS security architecture.

**Code to Review**:
[Paste your code or reference file path]

**Security Review Checklist**:

**1. Authentication & Authorization**:
- [ ] Authentication required where needed?
- [ ] Clerk session properly checked?
- [ ] Authorization checks present (user can only access own resources)?
- [ ] Admin role verification if admin-only endpoint?
- [ ] 401 returned for unauthenticated requests?
- [ ] 403 returned for unauthorized requests?

**2. Input Validation & Sanitization**:
- [ ] All user input validated with Zod schemas?
- [ ] XSS prevention (safeTextSchema used for text fields)?
- [ ] SQL injection prevention (parameterized queries)?
- [ ] File upload validation (type, size, signature)?
- [ ] Length limits enforced?
- [ ] Type coercion prevented?

**3. Security Middleware**:
- [ ] CSRF protection applied (withCsrf) for state-changing operations?
- [ ] Rate limiting applied (withRateLimit)?
- [ ] Middleware composed in correct order (rate limit → CSRF → handler)?
- [ ] GET requests don't use CSRF (read-only operations)?

**4. Error Handling**:
- [ ] Errors use handleApiError() for secure responses?
- [ ] Stack traces not leaked in production?
- [ ] Error messages generic to users?
- [ ] Detailed errors logged server-side?
- [ ] No sensitive data in error responses?

**5. Data Protection**:
- [ ] Sensitive data encrypted at rest?
- [ ] HTTPS enforced in production?
- [ ] API keys in environment variables, not code?
- [ ] Secrets never logged?
- [ ] Database queries follow least privilege?

**6. OWASP Top 10**:
- [ ] Injection prevention (A03:2021)?
- [ ] Broken authentication prevention (A07:2021)?
- [ ] Sensitive data exposure prevention (A02:2021)?
- [ ] XML external entities prevention (A04:2021)?
- [ ] Broken access control prevention (A01:2021)?
- [ ] Security misconfiguration prevention (A05:2021)?
- [ ] XSS prevention (A03:2021)?
- [ ] Insecure deserialization prevention (A08:2021)?
- [ ] Using components with known vulnerabilities prevention (A06:2021)?
- [ ] Insufficient logging & monitoring prevention (A09:2021)?

**For Each Vulnerability Found, Provide**:
- Severity: Critical / High / Medium / Low
- Category: Which OWASP Top 10 or security control
- Attack Scenario: How could this be exploited?
- Current Code: What's wrong
- Secure Fix: How to fix it
- Code Example: Show the secure implementation

**Additional Analysis**:
- Are there any logic flaws that could lead to security issues?
- Are there any race conditions?
- Are there any timing vulnerabilities?
- Is the code following Secure Vibe Coding OS patterns?

Generate comprehensive security review report.

Context: This code is built on Secure Vibe Coding OS with:
- 90/100 OWASP baseline score
- CSRF protection, rate limiting, input validation
- Reference: @docs/security/SECURITY_ARCHITECTURE.md

Focus on:
- Proper use of existing security utilities
- Feature-specific vulnerabilities
- Gaps in the security controls
```

## Customization Tips

**Focus areas**:
Add specific concerns for your code type

**Code context**:
Provide info about what the code does

**Review depth**:
Adjust checklist for complexity

## Deliverables

- [ ] Security review report
- [ ] List of vulnerabilities
- [ ] Severity ratings
- [ ] Fix recommendations
- [ ] Code examples
- [ ] Save to: `docs/security/CODE_REVIEW_[date].md`

## Related Prompts

- **Security tests**: `prompt-engineering/08_security_testing.md`
- **Threat model**: `threat-modeling/01_stride_analysis.md`

## Version History

**v1.0** (2025-10-21): Initial version
