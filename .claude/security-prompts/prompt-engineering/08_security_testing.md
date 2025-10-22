# Comprehensive Security Testing

**Category**: Prompt Engineering  
**When to Use**: After implementing features, before deployment  
**Module**: 3.3  
**Time to Implement**: 30 minutes

## Test Coverage

- ✅ Authentication tests
- ✅ Authorization tests
- ✅ CSRF tests
- ✅ Rate limiting tests
- ✅ Input validation tests
- ✅ Error handling tests

## The Prompt

```
I've implemented [feature name] with security controls. Generate comprehensive security tests.

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Feature: [what you built]
- Security controls applied: [list them]

**Generate Tests For**:

1. **Authentication Tests**:
   - Valid authentication allows access
   - Missing auth token returns 401
   - Expired auth token returns 401
   - Tampered auth token returns 401

2. **Authorization Tests**:
   - User can access their own resources
   - User cannot access other users' resources (403)
   - Admin can access admin resources
   - Non-admin cannot access admin resources (403)

3. **CSRF Tests**:
   - Request with valid CSRF token succeeds
   - Request with missing CSRF token returns 403
   - Request with invalid CSRF token returns 403
   - GET requests don't require CSRF (read-only)

4. **Rate Limiting Tests**:
   - Requests under limit succeed
   - Requests over limit return 429
   - Rate limit resets after window expires
   - Different users have separate rate limit buckets

5. **Input Validation Tests**:
   - Valid input accepted
   - Invalid input returns 400 with clear message
   - XSS payloads sanitized: `<script>alert('xss')</script>`
   - SQL injection attempts blocked: `'; DROP TABLE users;--`
   - Oversized input rejected (length limits enforced)

6. **Error Handling Tests**:
   - Errors in production don't leak stack traces
   - Errors in production don't leak file paths
   - Errors in production don't leak environment variables
   - Error responses use generic messages

**Test Implementation**:
- Use Jest or Vitest for test framework
- Use supertest for HTTP testing
- Mock authentication (Clerk) for testing
- Mock database (Convex) for isolation
- Test both success and failure cases
- Measure code coverage (aim for 80%+ on security utilities)

Generate test file at `__tests__/api/[feature].security.test.ts` with all test cases.
```

## Customization Tips

**Add feature-specific tests**:
Include tests for your specific functionality

**Change test framework**:
Adapt for your testing setup

**Add performance tests**:
Test response times under load

## Testing Checklist

- [ ] All authentication tests pass
- [ ] All authorization tests pass
- [ ] CSRF protection verified
- [ ] Rate limiting verified
- [ ] Input validation verified
- [ ] Error handling verified
- [ ] 80%+ code coverage

## Related Prompts

- **Code review**: `threat-modeling/04_code_review.md`
- **Threat model**: `threat-modeling/01_stride_analysis.md`

## Version History

**v1.0** (2025-10-21): Initial version
