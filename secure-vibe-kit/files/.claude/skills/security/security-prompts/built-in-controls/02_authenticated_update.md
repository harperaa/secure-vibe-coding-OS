# Authenticated Data Update Endpoint

**Category**: Built-In Controls  
**When to Use**: Endpoints where users modify their own data  
**Module**: 3.2  
**Time to Implement**: 20 minutes

## Security Controls Applied

- ✅ Authentication (Clerk)
- ✅ Authorization (ownership verification)
- ✅ CSRF protection (withCsrf)
- ✅ Rate limiting (withRateLimit)
- ✅ Input validation (Zod schemas)
- ✅ XSS sanitization
- ✅ Secure error handling

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS and need an endpoint where authenticated users can update their profile information.

SECURITY FOUNDATION REFERENCE:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: Clerk auth(), withCsrf, withRateLimit, validateRequest

SECURITY REQUIREMENTS:
- Clerk authentication required (verify userId from session)
- Authorization: User can ONLY update their own profile (verify userId matches profile)
- CSRF protection using withCsrf()
- Rate limiting: 10 updates per hour per user
- Input validation with Zod schemas
- XSS sanitization on all text fields
- Return 401 for unauthenticated users
- Return 403 for unauthorized access (trying to edit someone else's profile)

FUNCTIONAL REQUIREMENTS:
- Fields to update: name, bio, avatar URL
- Validate: name (max 100 chars), bio (max 500 chars), avatar URL (HTTPS only, image)
- Save to database (Convex or your database)
- Return success message with updated profile

IMPLEMENTATION:
1. Create API route at `app/api/profile/update/route.ts`
2. Check authentication: const { userId } = await auth()
3. Verify ownership: profile.userId === userId
4. Apply security middleware: withRateLimit(withCsrf(handler))
5. Validate input with Zod schemas
6. Update database only after all checks pass
7. Use handleApiError() for secure error responses

VERIFICATION:
After implementation, I should be able to:
1. Update own profile successfully when logged in
2. Get 401 when not logged in
3. Get 403 when trying to update another user's profile
4. Get 429 after 10 updates in an hour (rate limited)
5. XSS attempts in bio are sanitized
6. Invalid avatar URLs are rejected
7. All security checks logged

Please create the secure profile update endpoint using Secure Vibe Coding OS utilities.

Reference:
@lib/withCsrf.ts
@lib/withRateLimit.ts
@lib/validateRequest.ts
@lib/validation.ts
@lib/errorHandler.ts
```

## Customization Tips

**Change what can be updated**:
Add/remove fields in Zod schema

**Change rate limits**:
Adjust: `10 updates per hour`

**Change authorization logic**:
Modify ownership check for different resources

## Testing Checklist

- [ ] Authenticated user can update own profile
- [ ] Unauthenticated request returns 401
- [ ] User A cannot update User B's profile (403)
- [ ] Rate limiting works after 10 requests
- [ ] Input validation catches bad data
- [ ] XSS attempts sanitized

## Related Prompts

- **Ownership pattern**: See `auth-authorization/03_ownership.md`
- **Admin overrides**: See `prompt-engineering/04_admin_action.md`

## Version History

**v1.0** (2025-10-21): Initial version
