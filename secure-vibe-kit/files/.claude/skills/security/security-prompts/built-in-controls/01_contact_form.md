# Contact Form with Security Stack

**Category**: Built-In Controls  
**When to Use**: Creating public forms that accept user input  
**Module**: 3.2  
**Time to Implement**: 20 minutes

## Security Controls Applied

- ✅ CSRF protection (withCsrf)
- ✅ Rate limiting (withRateLimit - 5 per 15 min)
- ✅ Input validation (Zod schemas)
- ✅ XSS sanitization (safeTextSchema)
- ✅ Secure error handling (handleApiError)

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS and need an endpoint where users can submit a contact form.

SECURITY FOUNDATION REFERENCE:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md (Layer 2, 3, 4)
- Existing utilities: withCsrf, withRateLimit, validateRequest from Secure Vibe Coding OS

SECURITY REQUIREMENTS:
- CSRF protection using existing withCsrf() middleware
- Rate limiting: 5 submissions per 15 minutes per IP (using withRateLimit())
- Input validation with Zod schema (using safeTextSchema for name, emailSchema for email)
- XSS sanitization on all text inputs (automatically handled by safeTextSchema)
- Secure error handling (using handleApiError())

FUNCTIONAL REQUIREMENTS:
- Accept: name (string, max 100 chars), email (valid email), message (string, max 1000 chars)
- Send email notification to admin@myapp.com
- Return success message to user
- Log all submissions for monitoring

IMPLEMENTATION:
1. Create API route at `app/api/contact/route.ts`
2. Apply security middleware: withRateLimit(withCsrf(handler))
3. Define Zod schema for validation:
   - name: safeTextSchema (max 100 chars)
   - email: emailSchema
   - message: safeTextSchema (max 1000 chars)
4. Validate input using validateRequest()
5. Return errors using handleApiError() for secure error responses
6. Frontend: Include CSRF token from /api/csrf endpoint

VERIFICATION:
After implementation, I should be able to:
1. Submit valid form → succeeds with 200 status
2. Submit without CSRF token → fails with 403
3. Submit 6 times rapidly → 5 succeed, 6th gets 429 (rate limited)
4. Submit with XSS attempt in message → sanitized automatically
5. Submit with invalid email → fails with 400 and helpful error
6. See submissions logged for monitoring

Please create the secure contact form API route using Secure Vibe Coding OS security utilities.

Reference:
@lib/withCsrf.ts
@lib/withRateLimit.ts
@lib/validateRequest.ts
@lib/validation.ts
@lib/errorHandler.ts
@app/api/example-protected/route.ts
```

## Customization Tips

**Change rate limit**:
Replace: `5 submissions per 15 minutes`  
With: Your desired limit

**Change validation**:
Modify Zod schema requirements:
- name length
- message length
- Additional fields

**Change functionality**:
Replace: "Send email notification"  
With: Your desired action (save to database, send to Slack, etc.)

## Testing Checklist

After implementation:
- [ ] Form submission works with valid data
- [ ] CSRF token required (try without - should fail 403)
- [ ] Rate limiting blocks 6th submission
- [ ] XSS payloads sanitized
- [ ] Error messages don't leak system info

## Related Prompts

- **More comprehensive**: See `prompt-engineering/01_secure_form.md`
- **Authenticated forms**: See `built-in-controls/02_authenticated_update.md`

## Version History

**v1.0** (2025-10-21): Initial version
