# Ownership-Based Authorization

**Category**: Auth & Authorization  
**When to Use**: Users should manage their own content  
**Module**: 3.4  
**Time to Implement**: 30 minutes

## Security Controls Applied

- ✅ Resource ownership verification
- ✅ Combined with role checks
- ✅ Combined with permission checks
- ✅ Three-layer authorization

## The Prompt

```
CONTEXT:
I have roles and permissions working. Now I need ownership-based authorization 
so users can edit their own blog posts even without special permissions.

SECURITY REQUIREMENTS:
Ownership Verification:
- Check if resource.authorId === userId
- Always verify server-side (never trust client)
- Combined with existing role/permission checks
- Authorization logic: admin OR permission OR ownership

Resource Pattern:
- Every resource has authorId/userId/ownerId field
- Stored in database with resource
- Verified before any modification
- Return 403 if ownership check fails

Authorization Flow (in order):
1. Check if user is admin → Allow (admins can do anything)
2. Check if user has specific permission → Allow
3. Check if user owns resource → Allow
4. Deny (403 Forbidden)

IMPLEMENTATION REQUIREMENTS:
- Create canModifyResource() helper function
- Accept: userId, resourceId, action type
- Check all three authorization layers
- Return true/false
- Log authorization decisions

Error Handling:
- 401 for unauthenticated
- 403 for failed authorization
- Include which check failed in logs (not to user)

TECHNICAL SPECIFICATIONS:
- Add to: lib/auth-utils.ts or lib/authorization.ts
- Use with: API routes that modify resources
- Integrate with: Existing RBAC and permission system

VALIDATION CRITERIA:
After implementation, I should be able to:
1. Regular user can edit own blog post
2. Regular user cannot edit others' posts (403)
3. Admin can edit any post
4. User with can_edit_content permission can edit any post
5. Verify authorization logic: admin OR permission OR ownership

Generate the ownership authorization system.

Reference:
@lib/rbac.ts
@lib/types.ts
```

## Customization Tips

**Change ownership field**:
Use: authorId, userId, ownerId, creatorId

**Add co-ownership**:
Support multiple owners per resource

**Add delegation**:
Allow owners to grant access to others

## Testing Checklist

- [ ] User can edit own content
- [ ] User cannot edit others' content
- [ ] Admin can edit any content
- [ ] Permission holders can edit any
- [ ] Authorization order correct
- [ ] All checks logged

## Related Prompts

- **RBAC**: `auth-authorization/01_rbac_implementation.md`
- **Permissions**: `auth-authorization/02_permissions.md`

## Version History

**v1.0** (2025-10-21): Initial version
