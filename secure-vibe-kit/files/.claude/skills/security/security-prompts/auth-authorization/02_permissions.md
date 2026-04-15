# Granular Permission System

**Category**: Auth & Authorization  
**When to Use**: Need specific action permissions beyond roles  
**Module**: 3.4  
**Time to Implement**: 45 minutes

## Security Controls Applied

- ✅ Permission storage in Clerk metadata
- ✅ Server-side permission checks
- ✅ Admin auto-permissions
- ✅ Granular action control

## The Prompt

```
CONTEXT:
I have role-based access control working (user, premium, admin roles) in Secure Vibe 
Coding OS. Now I need granular permissions for specific actions like editing content, 
deleting users, accessing analytics, etc. Some actions need combination permissions.

FUNCTIONAL REQUIREMENTS:
- Define specific permissions: can_edit_content, can_delete_content, 
  can_view_analytics, can_manage_users
- Admins get all permissions automatically
- Other users can be granted specific permissions
- Check permissions for each protected action

SECURITY REQUIREMENTS:
Permission Storage:
- Permissions stored in Clerk publicMetadata alongside roles
- Server-controlled only (users cannot grant themselves permissions)
- Permissions loaded with authentication, not queried separately

Permission Checking:
- Check permission before allowing action
- Some actions require multiple permissions (AND logic)
- Some actions allow alternative permissions (OR logic)
- Fail closed (no permission = deny access)
- Log permission denials for audit trail

Permission Structure:
- Each permission is a string identifier
- Permissions grouped by domain (content, user, analytics)
- Clear naming convention: can_<action>_<resource>
- Type-safe permission checks

Error Handling:
- 403 status for insufficient permissions
- Generic error message to user
- Specific permission logged server-side

TECHNICAL SPECIFICATIONS:
- Store permissions array in Clerk publicMetadata
- Create hasPermission() helper function
- Create requirePermission() middleware
- Type definitions for all permissions
- Permission checking in both pages and API routes

Files to modify:
- lib/types.ts - Permission type definitions
- lib/rbac.ts - Add permission checking functions
- convex/http.ts - Set default permissions in webhook
- app/api/admin/grant-permission/route.ts - Admin endpoint

VALIDATION CRITERIA:
After implementation, I should be able to:
1. Create user with specific permissions and verify they work
2. Attempt action without required permission and receive 403
3. Verify admins bypass permission checks (have all permissions)
4. Test combining permissions (user needs can_edit AND can_publish)
5. Check permission in component to conditionally show UI elements
6. Verify permissions can be granted/revoked by admin
7. See permission denial logged with user ID and attempted action

Please implement a granular permission system following Secure Vibe Coding OS standards.

Reference:
@lib/rbac.ts - Existing role checking
@middleware.ts - Current authorization middleware
@docs/security/SECURITY_ARCHITECTURE.md - Security architecture
```

## Customization Tips

**Define your permissions**:
List all permissions your app needs

**Permission naming**:
Follow: can_<action>_<resource> pattern

**Permission groups**:
Group related permissions for easier management

## Testing Checklist

- [ ] Permissions stored in metadata
- [ ] Permission checks work
- [ ] Admin has all permissions
- [ ] Users can't grant themselves permissions
- [ ] Permission denials logged
- [ ] UI respects permissions

## Related Prompts

- **RBAC**: `auth-authorization/01_rbac_implementation.md`
- **Ownership**: `auth-authorization/03_ownership.md`

## Version History

**v1.0** (2025-10-21): Initial version
