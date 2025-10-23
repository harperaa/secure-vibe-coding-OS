# Comprehensive Secure Form

**Category**: Prompt Engineering  
**When to Use**: Full security stack for public forms  
**Module**: 3.3  
**Time to Implement**: 30 minutes

## Security Controls Applied

- ✅ CSRF protection
- ✅ Rate limiting  
- ✅ Input validation
- ✅ XSS sanitization
- ✅ Security headers
- ✅ Secure error handling

## The Prompt

```
I'm adding a public contact form to the application.

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md (Layer 2, 3, 4)
- Existing utilities: withCsrf, withRateLimit, validateRequest from Secure Vibe Coding OS

**Security Requirements**:
- CSRF protection using existing withCsrf() middleware
- Rate limiting: 5 submissions per 15 minutes per IP (using withRateLimit())
- Input validation with Zod schema (using safeTextSchema for name, emailSchema for email)
- XSS sanitization on all text inputs (automatically handled by safeTextSchema)
- Secure error handling (using handleApiError())

**Implementation**:
1. Create API route at `app/api/contact/route.ts`
2. Apply security middleware: withRateLimit(withCsrf(handler))
3. Define Zod schema for validation:
   - name: safeTextSchema (max 100 chars)
   - email: emailSchema
   - message: safeTextSchema (max 1000 chars)
4. Validate input using validateRequest()
5. Return errors using handleApiError() for secure error responses
6. Frontend: Include CSRF token from /api/csrf endpoint

**Verification**:
- Confirm form submission requires valid CSRF token
- Verify rate limiting blocks 6th submission within 15 minutes
- Test XSS payloads are sanitized: `<script>alert('xss')</script>`
- Check error messages don't leak system information

Generate the secure contact form API route following this security pattern.
```

## Customization Tips

Replace these placeholders:
- `[feature]` → your feature name
- `[fields]` → your form fields
- `[rate limit]` → your rate limit

## Testing Checklist

- [ ] CSRF token required
- [ ] Rate limiting works
- [ ] XSS attempts sanitized
- [ ] Validation catches bad input
- [ ] Errors are secure

## Related Prompts

- **Simpler version**: `built-in-controls/01_contact_form.md`
- **With auth**: `prompt-engineering/02_authenticated_endpoint.md`

## Version History

**v1.0** (2025-10-21): Initial version
