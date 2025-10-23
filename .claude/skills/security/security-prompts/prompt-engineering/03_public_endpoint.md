# Public Endpoint with Pagination

**Category**: Prompt Engineering  
**When to Use**: Public data endpoints with query parameters and pagination  
**Module**: 3.3  
**Time to Implement**: 30 minutes

## Security Controls Applied

- ✅ Rate limiting
- ✅ Query parameter validation
- ✅ Pagination limits
- ✅ Secure error handling
- ❌ No CSRF (GET is safe)
- ❌ No authentication (public)

## The Prompt

```
I'm working with Secure Vibe Coding OS and need a public API endpoint that returns paginated [data type, e.g., "blog posts", "products", "listings"].

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: withRateLimit, validateRequest

**Security Requirements**:
- Rate limiting: [specify limit, e.g., "60 requests per minute per IP"]
- Query parameter validation (page, limit, [other params])
- Prevent parameter injection attacks
- Pagination limits enforced (max items per page)
- No CSRF protection needed (GET is safe)
- No authentication needed (public data)
- Secure error handling (no information leakage)

**Functional Requirements**:
- Endpoint: GET /api/[resource]
- Query params: 
  - page (default 1, min 1)
  - limit (default 10, max 100)
  - [add other filters like category, search, sort]
- Return: Paginated list with metadata
- Include: total count, current page, total pages, has_next, has_previous

**Implementation**:
1. Create API route at `app/api/[resource]/route.ts`
2. Apply rate limiting: withRateLimit(handler)
3. Validate query parameters with Zod:
   - page: positive integer, default 1
   - limit: positive integer, max 100, default 10
   - [add validation for other params]
4. Fetch data from database with pagination
5. Calculate pagination metadata
6. Return paginated response with metadata
7. Use handleApiError() for errors

**Verification**:
- Request /api/[resource] → succeeds with paginated data
- Request with pagination params → works correctly
- Request with page=-1 → validation fails (400)
- Request with limit=1000 → caps at 100
- Make [limit+1] rapid requests → rate limited
- Invalid parameters → clear error messages

Please create the secure public API endpoint using Secure Vibe Coding OS utilities.

Reference:
@lib/withRateLimit.ts
@lib/validateRequest.ts
@lib/errorHandler.ts
```

## Customization Tips

**Add filtering**:
Include query params like: category, author, search, date_from, date_to

**Add sorting**:
Allow: sort_by=date, order=asc/desc

**Change limits**:
Adjust max page size and rate limits

## Testing Checklist

- [ ] Pagination works correctly
- [ ] Query param validation functions
- [ ] Rate limiting enforced
- [ ] Edge cases handled (page=0, limit=0)
- [ ] Metadata accurate (total_pages, etc.)
- [ ] No sensitive data exposed

## Related Prompts

- **Simpler version**: `built-in-controls/03_public_api.md`
- **With auth**: `prompt-engineering/02_authenticated_endpoint.md`

## Version History

**v1.0** (2025-10-21): Initial version
