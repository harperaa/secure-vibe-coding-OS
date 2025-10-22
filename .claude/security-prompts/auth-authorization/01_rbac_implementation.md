# RBAC Implementation

**Category**: Auth & Authorization  
**When to Use**: First time adding roles (user, premium, admin)  
**Module**: 3.4  
**Time to Implement**: 60 minutes

## Security Controls Applied

- ✅ Server-side role storage
- ✅ Clerk publicMetadata
- ✅ Webhook integration
- ✅ Role-based routing
- ✅ Middleware protection

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS which has Clerk authentication already configured. 
I need to add Role-Based Access Control (RBAC) with three roles: "user" (default), 
"premium" (paid subscribers via Clerk Billing), and "admin" (staff). All role checks 
must happen server-side using Clerk's publicMetadata.

FUNCTIONAL REQUIREMENTS:
- New users automatically get "user" role on signup
- Premium role assigned via Clerk Billing webhook (when user subscribes)
- Admin role manually assigned only by existing admins
- Users cannot change their own roles
- Each role has different route and feature access

Role Access Matrix:
- User role: /dashboard, /profile, /settings
- Premium role: user access + /premium-features, /advanced-analytics
- Admin role: all access + /admin, /admin/users

SECURITY REQUIREMENTS:
Authorization:
- Roles stored in Clerk publicMetadata (server-controlled)
- ALL role checks happen server-side (never trust client claims)
- Middleware checks roles before route access
- API endpoints verify roles in every handler
- Default role "user" assigned on webhook user creation
- Only admins can modify roles (never user-controlled)
- 403 Forbidden for insufficient permissions
- 401 Unauthorized for unauthenticated requests

Role Storage:
- Store as: publicMetadata.role = "user" | "premium" | "admin"
- Read from: auth().sessionClaims.publicMetadata.role
- Never expose role change endpoints publicly
- Log all role changes for audit trail

Webhook Integration:
- On user.created event → set role: "user" in publicMetadata
- On subscription.created event → set role: "premium"
- On subscription.canceled event → revert role to "user"
- Verify webhook signatures (already configured in project)

TECHNICAL SPECIFICATIONS:
- Framework: Next.js 14 (existing Secure Vibe Coding OS setup)
- Auth: Clerk (already configured)
- Middleware: middleware.ts (extend existing protection)
- Database: Convex (webhook handler in convex/http.ts)
- TypeScript types for roles: lib/types.ts

Files to modify:
1. convex/http.ts - Add role assignment in webhook handler
2. middleware.ts - Add role-based route protection
3. lib/types.ts - Add role type definitions
4. lib/auth-utils.ts - Create role checking utilities
5. app/admin - Create admin-only pages

Files to create:
- lib/rbac.ts - Role checking functions
- app/api/admin/change-role/route.ts - Admin endpoint to change roles

VALIDATION CRITERIA:
After implementation, I should be able to:
1. Sign up new account and verify role="user" in Clerk Dashboard
2. Try to access /admin as user and receive 403 error
3. Manually set role="admin" in Clerk Dashboard and access /admin successfully
4. Subscribe via Clerk Billing and verify role changes to "premium"
5. Call admin API endpoint as non-admin and get rejected
6. Verify all role checks happen server-side (can't bypass with browser tools)
7. See role changes logged in Convex database

Please implement RBAC following Secure Vibe Coding OS architecture.

Reference:
@middleware.ts
@convex/http.ts
@lib/clerk.ts
```

## Customization Tips

**Add more roles**:
Add: "moderator", "editor", etc.

**Change role names**:
Rename to match your app

**Add role hierarchy**:
Define which roles inherit from others

## Testing Checklist

- [ ] New signups get "user" role
- [ ] Cannot access admin routes as user
- [ ] Admin role grants access
- [ ] Roles synced from Clerk
- [ ] Server-side checks enforced
- [ ] Role changes logged

## Related Prompts

- **Permissions**: `auth-authorization/02_permissions.md`
- **Ownership**: `auth-authorization/03_ownership.md`

## Version History

**v1.0** (2025-10-21): Initial version
