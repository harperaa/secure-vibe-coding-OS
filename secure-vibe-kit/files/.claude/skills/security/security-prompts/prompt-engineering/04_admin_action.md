# Admin-Only Action

**Category**: Prompt Engineering  
**When to Use**: Admin dashboard, user management, system configuration  
**Module**: 3.3  
**Time to Implement**: 30 minutes

## Security Controls Applied

- ✅ Authentication (Clerk)
- ✅ Role verification (admin only)
- ✅ CSRF protection
- ✅ Aggressive rate limiting
- ✅ Input validation
- ✅ Audit logging

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS and need an admin-only endpoint for [describe admin action, e.g., "deleting users", "changing user roles", "viewing system logs"].

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: Clerk auth(), withCsrf, withRateLimit, validateRequest
- RBAC: @lib/rbac.ts

**Security Requirements**:
- Clerk authentication required
- Role verification: Only users with role="admin" can access
- CSRF protection using withCsrf()
- Aggressive rate limiting: 10 requests per hour per admin
- Input validation for all parameters
- Audit logging: Log every admin action with userId, action type, timestamp
- Return 401 for unauthenticated users
- Return 403 for non-admin users

**Functional Requirements**:
- [Describe what the admin action does]
- [List input parameters]
- [Describe success response]

**Implementation**:
1. Create API route at `app/api/admin/[action]/route.ts`
2. Check authentication: const { userId } = await auth()
3. Verify admin role: const { sessionClaims } = await auth()
4. Check: sessionClaims.publicMetadata.role === 'admin'
5. Apply security middleware: withRateLimit(withCsrf(handler))
6. Validate all input parameters
7. Perform admin action
8. Log action to audit trail (Convex or your database)
9. Return success/error response

**Verification**:
- Admin can perform action successfully
- Non-admin gets 403 Forbidden
- Unauthenticated request gets 401
- Rate limiting blocks excessive admin requests
- All actions logged with timestamp and userId
- Input validation catches bad data

Generate the secure admin-only endpoint following this security pattern.

Reference:
@lib/rbac.ts
@lib/withCsrf.ts
@lib/withRateLimit.ts
@lib/validateRequest.ts
```

## Customization Tips

**Change admin action**:
Replace action description with your specific need

**Change rate limits**:
Adjust for sensitivity: 10/hour for dangerous actions, 60/hour for safe ones

**Add permissions**:
Beyond role, check specific permissions

## Testing Checklist

- [ ] Admin can perform action
- [ ] Regular user gets 403
- [ ] Unauthenticated gets 401
- [ ] Rate limiting works
- [ ] Actions logged in audit trail
- [ ] Input validation works

## Related Prompts

- **RBAC setup**: `auth-authorization/01_rbac_implementation.md`
- **Permissions**: `auth-authorization/02_permissions.md`

## Version History

**v1.0** (2025-10-21): Initial version
