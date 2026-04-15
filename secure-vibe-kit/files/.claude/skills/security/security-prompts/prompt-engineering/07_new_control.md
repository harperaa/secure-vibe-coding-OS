# Extending Security Architecture with New Control

**Category**: Prompt Engineering  
**When to Use**: Adding security controls not in Secure Vibe Coding OS  
**Module**: 3.3  
**Time to Implement**: 60 minutes

## What This Creates

- ✅ New security utility
- ✅ Composable with existing middleware
- ✅ Maintains architecture patterns
- ✅ TypeScript typed
- ✅ Tested and documented

## The Prompt

```
I need to add [new security control name] to Secure Vibe Coding OS.

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Current security stack: CSRF, rate limiting, input validation, auth, headers
- New control fits at: [which layer? Layer 1-5]

**New Security Control Requirements**:
- Name: [descriptive name, e.g., geoBlocking, deviceFingerprinting]
- Purpose: [what attack does it prevent?]
- Implementation: [how should it work?]
- Integration: [how does it fit with existing controls?]

**Maintain Architecture Consistency**:
- Follow existing middleware pattern (higher-order function)
- Accept configuration options like other middlewares
- Return composable function
- Include proper TypeScript types
- Add error handling using handleApiError()
- Log security events for monitoring

**Implementation Steps**:
1. Create new utility file: `lib/[controlName].ts`
2. Implement as composable middleware following existing patterns
3. Add TypeScript types in `lib/types.ts`
4. Include configuration options
5. Add to security architecture docs
6. Create test cases in `__tests__/lib/[controlName].test.ts`
7. Update `.cursor/rules/security_rules.mdc` with usage examples

**Example Signature** (follow this pattern):
```typescript
export function with[ControlName](
  handler: (req: Request) => Promise<Response>,
  options?: [ControlName]Options
): (req: Request) => Promise<Response>
```

**Verification**:
- New control composable with existing middleware
- Maintains OWASP score (doesn't introduce new vulnerabilities)
- Works in development and production environments
- Properly tested with 80%+ coverage
- Documentation updated
- Can be used like: withRateLimit(with[NewControl](handler))

Generate the new security control following Secure Vibe Coding OS patterns.

Reference:
@lib/withRateLimit.ts (as example pattern)
@lib/withCsrf.ts (as example pattern)
@lib/types.ts
@docs/security/SECURITY_ARCHITECTURE.md
```

## Example New Controls

**Geo-blocking**:
Block requests from certain countries

**Device Fingerprinting**:
Track suspicious login patterns

**Content Security Policy Nonce**:
Dynamic CSP nonce generation

**API Key Authentication**:
Machine-to-machine API auth

## Customization Tips

**Study existing utilities**:
Look at withRateLimit and withCsrf for patterns

**Keep it composable**:
Must work with other middleware

**Type everything**:
TypeScript types prevent bugs

## Testing Checklist

- [ ] Middleware composes correctly
- [ ] Configuration options work
- [ ] Error handling functions
- [ ] TypeScript types correct
- [ ] Tests pass (80%+ coverage)
- [ ] Documentation complete

## Related Prompts

- **Testing**: `prompt-engineering/08_security_testing.md`
- **Middleware order**: `prompt-engineering/06_composable_middleware.md`

## Version History

**v1.0** (2025-10-21): Initial version
