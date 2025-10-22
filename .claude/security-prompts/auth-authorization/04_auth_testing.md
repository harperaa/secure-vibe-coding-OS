# Authorization Testing

**Category**: Auth & Authorization  
**When to Use**: Verify all authorization layers work correctly  
**Module**: 3.4  
**Time to Implement**: 30 minutes

## Test Coverage

- ✅ Role-based access control
- ✅ Permission checks
- ✅ Ownership verification
- ✅ Security boundary tests
- ✅ Authorization combinations

## The Prompt

```
Before launching, I need to test that all authorization controls work correctly.

**Context**:
I have implemented:
- RBAC with roles: [list roles]
- Permissions: [list permissions]
- Ownership checks for: [list resources]

**Security Requirements**:
Test Coverage:
- Role-based access control working
- Permission checks enforcing access
- Ownership checks allowing user content management
- All checks happen server-side
- Bypasses are impossible

Please create a comprehensive authorization test plan:

**1. ROLE TESTS**:
- Access [protected route] as each role (user, premium, admin)
- Verify role assignment on signup
- Test role changes via Clerk Dashboard
- Verify role changes via subscription webhook (if applicable)

**2. PERMISSION TESTS**:
- Call protected endpoints with/without permissions
- Test permission grant/revoke as admin
- Verify client cannot modify own permissions
- Test AND logic (multiple permissions required)
- Test OR logic (alternative permissions)

**3. OWNERSHIP TESTS**:
- Edit own content as regular user
- Try to edit others' content (should fail)
- Verify admin can edit any content
- Test combined ownership + permission checks

**4. SECURITY BOUNDARY TESTS**:
- Attempt role escalation via API
- Try to bypass middleware with direct API calls
- Modify metadata via client (should fail)
- Use expired/invalid tokens
- Test IDOR (Insecure Direct Object Reference) vulnerabilities

**5. COMBINED AUTHORIZATION TESTS**:
- Test: Admin OR Permission OR Ownership logic
- Verify authorization order (admin checked first)
- Test edge cases (no role, empty permissions)

For each test provide:
- Exact steps to perform
- Expected result (success/failure + status code)
- How to verify in Clerk Dashboard
- What logs should show
- How to test via curl or Postman

Create a checklist I can work through before deployment.

Reference:
@lib/rbac.ts
@lib/auth-utils.ts
@middleware.ts
```

## Test Script Template

```bash
# Test 1: User cannot access admin route
curl http://localhost:3000/admin \
  -H "Authorization: Bearer [USER_TOKEN]"
# Expected: 403 Forbidden

# Test 2: Admin can access admin route
curl http://localhost:3000/admin \
  -H "Authorization: Bearer [ADMIN_TOKEN]"
# Expected: 200 OK

# Add more tests...
```

## Deliverables

- [ ] Role test suite
- [ ] Permission test suite
- [ ] Ownership test suite
- [ ] Security boundary tests
- [ ] Combined authorization tests
- [ ] Test results documented
- [ ] All tests passing

## Testing Checklist

**Role Tests**:
- [ ] New signups get default role
- [ ] Admin routes blocked for non-admins
- [ ] Premium routes blocked for free users
- [ ] Role changes sync from Clerk

**Permission Tests**:
- [ ] Users without permissions blocked
- [ ] Users with permissions allowed
- [ ] Admins bypass permission checks
- [ ] Permissions cannot be self-granted

**Ownership Tests**:
- [ ] Users can modify own resources
- [ ] Users blocked from others' resources
- [ ] Admins can modify any resource
- [ ] Ownership combined with permissions

**Security Boundaries**:
- [ ] Cannot escalate role via API
- [ ] Cannot bypass middleware
- [ ] Cannot modify own metadata
- [ ] Expired tokens rejected

## Related Prompts

- **RBAC setup**: `auth-authorization/01_rbac_implementation.md`
- **Permissions**: `auth-authorization/02_permissions.md`
- **Ownership**: `auth-authorization/03_ownership.md`

## Version History

**v1.0** (2025-10-21): Initial version
