# Public Read API Endpoint

**Category**: Built-In Controls  
**When to Use**: GET endpoints returning public data  
**Module**: 3.2  
**Time to Implement**: 20 minutes

## Security Controls Applied

- ✅ Rate limiting (withRateLimit)
- ✅ Query parameter validation
- ✅ Secure error handling
- ❌ No CSRF (GET requests don't modify state)
- ❌ No authentication (public data)

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS and need a public API endpoint that returns paginated blog posts.

SECURITY FOUNDATION REFERENCE:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: withRateLimit, validateRequest

SECURITY REQUIREMENTS:
- Rate limiting: 60 requests per minute per IP
- Query parameter validation (page, limit)
- Prevent parameter injection attacks
- No CSRF protection needed (GET is safe)
- No authentication needed (public data)
- Secure error handling (no information leakage)

FUNCTIONAL REQUIREMENTS:
- Endpoint: GET /api/posts
- Query params: page (default 1, min 1), limit (default 10, max 100)
- Return: Paginated list of posts
- Include: total count, current page, total pages

IMPLEMENTATION:
1. Create API route at `app/api/posts/route.ts`
2. Apply rate limiting: withRateLimit(handler)
3. Validate query parameters with Zod:
   - page: positive integer, default 1
   - limit: positive integer, max 100, default 10
4. Fetch data from database
5. Return paginated response
6. Use handleApiError() for errors

VERIFICATION:
After implementation, I should be able to:
1. Request /api/posts → succeeds with paginated data
2. Request /api/posts?page=1&limit=20 → succeeds
3. Request /api/posts?page=-1 → validation fails (400)
4. Request /api/posts?limit=1000 → caps at 100
5. Make 61 rapid requests → rate limited on 61st (429)
6. Invalid parameters → clear error message

Please create the secure public API endpoint using appropriate Secure Vibe Coding OS utilities.

Reference:
@lib/withRateLimit.ts
@lib/validateRequest.ts
@lib/errorHandler.ts
```

## Customization Tips

**Change rate limits**:
Adjust: `60 requests per minute`

**Change pagination**:
Modify: `limit` max value, default page size

**Add filtering**:
Add query params: `category`, `author`, `search`

**Change data source**:
Replace blog posts with your data

## Testing Checklist

- [ ] Endpoint returns data successfully
- [ ] Pagination works correctly
- [ ] Query param validation catches bad input
- [ ] Rate limiting blocks excessive requests
- [ ] Error messages are user-friendly
- [ ] No sensitive data in responses

## Related Prompts

- **Authenticated APIs**: See `built-in-controls/02_authenticated_update.md`
- **Complex APIs**: See `prompt-engineering/03_public_endpoint.md`

## Version History

**v1.0** (2025-10-21): Initial version
