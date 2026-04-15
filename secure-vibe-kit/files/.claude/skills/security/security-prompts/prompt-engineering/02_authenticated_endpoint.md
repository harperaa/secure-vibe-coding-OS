# Authenticated Endpoint with Authorization

**Category**: Prompt Engineering  
**When to Use**: User profile updates, settings changes, data modification  
**Module**: 3.3  
**Time to Implement**: 30 minutes

## Security Controls Applied

- ✅ Authentication (Clerk)
- ✅ Authorization (ownership + permissions)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure error handling

## The Prompt

```
I'm working with Secure Vibe Coding OS and need an endpoint where authenticated users can [describe action, e.g., "update their profile information", "modify their settings"].

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: Clerk auth(), withCsrf, withRateLimit, validateRequest

**Security Requirements**:
- Clerk authentication required (verify userId from session)
- Authorization: User can ONLY [action] their own [resource]
- CSRF protection using withCsrf()
- Rate limiting: [specify limit, e.g., "10 updates per hour"]
- Input validation with Zod schemas
- XSS sanitization on all text fields
- Return 401 for unauthenticated users
- Return 403 for unauthorized access

**Functional Requirements**:
- Fields to [modify]: [list fields]
- Validation rules: [specify for each field]
- Save to database (Convex or your database)
- Return success message with updated data

**Implementation**:
1. Create API route at `app/api/[feature]/route.ts`
2. Check authentication: const { userId } = await auth()
3. Verify authorization: [resource].userId === userId
4. Apply security middleware: withRateLimit(withCsrf(handler))
5. Validate input with Zod schemas
6. Update database only after all checks pass
7. Use handleApiError() for secure error responses

**Verification**:
- Authenticated user can [action] successfully
- Get 401 when not logged in
- Get 403 when trying to [action] another user's [resource]
- Rate limiting works after [limit] requests
- XSS attempts sanitized
- Invalid input rejected with clear errors

Please create the secure authenticated endpoint using Secure Vibe Coding OS utilities.

Reference:
@lib/withCsrf.ts
@lib/withRateLimit.ts
@lib/validateRequest.ts
@lib/validation.ts
```

## Customization Tips

**Change action**:
Specify what users are doing (updating, deleting, creating)

**Change authorization**:
Adjust ownership check for your resource type

**Change rate limits**:
Tune based on expected usage patterns

## Testing Checklist

- [ ] Authentication required
- [ ] Authorization enforced
- [ ] CSRF protection works
- [ ] Rate limiting functions
- [ ] Input validation catches bad data
- [ ] Errors handled securely

## Related Prompts

- **Ownership**: `auth-authorization/03_ownership.md`
- **Simpler version**: `built-in-controls/02_authenticated_update.md`

## Version History

**v1.0** (2025-10-21): Initial version
