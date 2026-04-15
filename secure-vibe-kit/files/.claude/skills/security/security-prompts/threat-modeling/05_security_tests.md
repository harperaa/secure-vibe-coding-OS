# Automated Security Test Generation

**Category**: Threat Modeling  
**When to Use**: Generate comprehensive test suites  
**Module**: 3.5  
**Time to Implement**: 30 minutes

## Test Coverage

- ✅ 20+ security test cases
- ✅ Authentication tests
- ✅ CSRF protection tests
- ✅ Rate limiting tests
- ✅ Input validation tests
- ✅ Error handling tests

## The Prompt

```
Generate comprehensive security test suite for [feature name].

**Feature Context**:
- Feature: [What you built]
- Endpoints: [List API routes]
- Security controls applied: [List them]

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Testing framework: [Jest/Vitest/etc]

**Generate Tests For**:

**1. Authentication Tests** (if applicable):
```javascript
describe('Authentication', () => {
  test('allows access with valid token')
  test('returns 401 with missing token')
  test('returns 401 with expired token')
  test('returns 401 with invalid token')
  test('returns 401 with tampered token')
})
```

**2. Authorization Tests** (if applicable):
```javascript
describe('Authorization', () => {
  test('user can access own resources')
  test('user cannot access other users resources (403)')
  test('admin can access all resources')
  test('non-admin cannot access admin resources (403)')
  test('ownership check prevents unauthorized access')
})
```

**3. CSRF Protection Tests**:
```javascript
describe('CSRF Protection', () => {
  test('POST succeeds with valid CSRF token')
  test('POST fails with missing CSRF token (403)')
  test('POST fails with invalid CSRF token (403)')
  test('GET requests do not require CSRF token')
  test('CSRF token expires correctly')
})
```

**4. Rate Limiting Tests**:
```javascript
describe('Rate Limiting', () => {
  test('requests under limit succeed')
  test('requests over limit return 429')
  test('rate limit resets after time window')
  test('different users have separate rate limits')
  test('rate limit headers included in response')
})
```

**5. Input Validation Tests**:
```javascript
describe('Input Validation', () => {
  test('valid input is accepted')
  test('invalid input returns 400 with error message')
  test('XSS payloads are sanitized: <script>alert("xss")</script>')
  test('SQL injection blocked: "; DROP TABLE users;--')
  test('oversized input rejected (length limits)')
  test('wrong data types rejected')
  test('missing required fields rejected')
})
```

**6. Error Handling Tests**:
```javascript
describe('Error Handling', () => {
  test('production errors do not leak stack traces')
  test('production errors do not leak file paths')
  test('production errors do not leak environment variables')
  test('error responses use generic messages')
  test('detailed errors logged server-side only')
})
```

**7. Security Headers Tests**:
```javascript
describe('Security Headers', () => {
  test('Content-Security-Policy header present')
  test('X-Frame-Options header present')
  test('X-Content-Type-Options header present')
  test('Strict-Transport-Security header present in production')
})
```

**Test Implementation Requirements**:
- Use [Jest/Vitest] for test framework
- Use supertest for HTTP testing
- Mock Clerk authentication
- Mock database (Convex)
- Test both success and failure cases
- Aim for 80%+ code coverage on security utilities
- Include setup and teardown
- Use descriptive test names
- Group related tests in describe blocks

**Output**:
Generate complete test file at `__tests__/api/[feature].security.test.ts` with:
- All test cases implemented
- Proper mocking
- Clear assertions
- Comments explaining security aspects being tested

Generate comprehensive security test suite now.
```

## Test File Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mockAuth, mockDatabase } from './test-utils'

describe('[Feature] Security Tests', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  describe('Authentication', () => {
    // Auth tests
  })

  describe('CSRF Protection', () => {
    // CSRF tests
  })

  // More test groups...
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run security tests only
npm test -- security.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Deliverables

- [ ] Complete test file generated
- [ ] All 20+ test cases implemented
- [ ] Tests passing
- [ ] 80%+ code coverage
- [ ] Mocks working correctly
- [ ] Edge cases covered

## Testing Checklist

After generating tests:
- [ ] All tests pass
- [ ] Coverage meets target (80%+)
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] Tests are maintainable
- [ ] Tests run quickly (<5 seconds)

## Related Prompts

- **Code review**: `threat-modeling/04_code_review.md`
- **Manual testing**: `prompt-engineering/08_security_testing.md`

## Version History

**v1.0** (2025-10-21): Initial version
