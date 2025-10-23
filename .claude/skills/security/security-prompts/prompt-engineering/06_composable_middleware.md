# Composable Security Middleware

**Category**: Prompt Engineering  
**When to Use**: Complex endpoints requiring multiple security layers  
**Module**: 3.3  
**Time to Implement**: 20 minutes

## Security Controls Applied

- ✅ Multiple middleware layers
- ✅ Correct ordering (critical!)
- ✅ Defense-in-depth composition
- ✅ Type-safe middleware

## The Prompt

```
I'm building [feature description] that requires multiple security controls.

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Utilities: [list all utilities needed, e.g., withRateLimit, withCsrf, auth()]

**Security Stack for this Endpoint**:
Layer 1: Authentication [yes/no + details]
Layer 2: Input Validation [Zod schema details]
Layer 3: Middleware [which middlewares + order]
Layer 4: Error Handling [which error handlers]
Layer 5: Headers [auto-applied]

**Implementation Order** (critical for composable middleware):
1. Outermost: Rate limiting (withRateLimit)
2. Middle: CSRF protection (withCsrf)  
3. Innermost: Route handler (with auth check inside)
4. Reason for order: Rate limit first to block brute force before processing CSRF

Correct pattern:
```typescript
export const POST = withRateLimit(
  withCsrf(
    async (req) => {
      // Auth check here
      const { userId } = await auth()
      if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      
      // Authorization check here
      // Handler logic here
    }
  )
);
```

**Why This Order Matters**:
- Rate limiting outermost: Block attackers before they consume resources
- CSRF middle: Verify legitimate origin after rate check
- Handler innermost: Process request only after all security checks pass

**Validation Criteria**:
After implementation, I should be able to:
1. Verify rate limiting blocks excessive requests first
2. Verify CSRF protection works after rate limit
3. Verify authentication checked before handler logic
4. Verify authorization checked after authentication
5. Confirm middleware compose correctly without conflicts
6. Test that removing any layer causes security failure

Generate the endpoint with properly ordered security middleware.

Reference:
@lib/withRateLimit.ts
@lib/withCsrf.ts
@lib/validateRequest.ts
```

## Customization Tips

**Add more middleware**:
Insert additional layers in correct order

**Change ordering**:
Only if you have specific reasons (document why!)

**Conditional middleware**:
Apply different stacks for GET vs POST

## Testing Checklist

- [ ] Middleware order correct
- [ ] Rate limiting first
- [ ] CSRF after rate limiting
- [ ] Auth inside handler
- [ ] All layers tested independently
- [ ] Combined layers work together

## Common Mistakes

**❌ Wrong Order**:
```typescript
// WRONG - CSRF before rate limit
export const POST = withCsrf(withRateLimit(handler))
```

**✅ Correct Order**:
```typescript
// CORRECT - Rate limit before CSRF
export const POST = withRateLimit(withCsrf(handler))
```

## Related Prompts

- **Individual layers**: See other prompt-engineering prompts
- **Testing**: `prompt-engineering/08_security_testing.md`

## Version History

**v1.0** (2025-10-21): Initial version
