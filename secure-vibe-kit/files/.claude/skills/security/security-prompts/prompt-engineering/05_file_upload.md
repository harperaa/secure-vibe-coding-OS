# Secure File Upload

**Category**: Prompt Engineering  
**When to Use**: Profile pictures, document uploads, any file handling  
**Module**: 3.3  
**Time to Implement**: 45 minutes

## Security Controls Applied

- ✅ Authentication
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ File type validation
- ✅ File size limits
- ✅ External upload service
- ✅ Virus scanning

## The Prompt

```
CONTEXT:
I'm working with Secure Vibe Coding OS and need a secure file upload endpoint for [profile pictures / documents / etc.].

**Security Foundation Reference**:
- Reference: @docs/security/SECURITY_ARCHITECTURE.md
- Existing utilities: Clerk auth(), withCsrf, withRateLimit

**Security Requirements**:
- Clerk authentication required
- Authorization: User can only upload to their own profile
- CSRF protection using withCsrf()
- Rate limiting: 5 uploads per hour per user
- File type validation: 
  - Check Content-Type header
  - Verify file signature (magic bytes)
  - Only allow: images (jpg, png, webp) OR PDFs OR [specify types]
- File size limit: 5MB maximum
- Upload to external service (Uploadthing, Cloudinary, S3)
- Virus scanning via upload service
- Never store files on application server
- Store only CDN URLs in database

**Functional Requirements**:
- Accept file upload from authenticated user
- Validate file before uploading to external service
- Upload to external CDN with virus scanning
- Store returned CDN URL in database
- Delete previous file from CDN (cleanup)
- Return new file URL to client

**Implementation**:
1. Create API route: `app/api/profile/upload-picture/route.ts`
2. Verify authentication and authorization
3. Apply security middleware: withRateLimit(withCsrf(handler))
4. Validate file metadata:
   - Check Content-Type header
   - Verify file signature (magic bytes) matches claimed type
   - Check file size <= 5MB
5. Upload to external service (e.g., Uploadthing with virus scanning)
6. Receive back CDN URL and thumbnail URL
7. Update user profile in Convex with new URLs
8. Delete previous image from CDN (cleanup)
9. Return new image URLs to frontend

**Verification**:
- Unauthenticated uploads return 401
- Wrong user cannot upload to another profile (403)
- Non-image files rejected
- Files over 5MB rejected
- 6th upload in 1 hour blocked
- Malicious files caught by external service scanning
- Old profile pictures removed from CDN
- Database stores CDN URLs only, not file content

Generate the secure file upload endpoint following this security pattern, emphasizing external upload service usage.

Reference:
@lib/withCsrf.ts
@lib/withRateLimit.ts
```

## Customization Tips

**Change file types**:
Adjust allowed types: images, PDFs, documents

**Change size limits**:
Modify: 5MB → your limit

**Change upload service**:
Replace Uploadthing with: Cloudinary, AWS S3, Vercel Blob

## Testing Checklist

- [ ] Valid files upload successfully
- [ ] Invalid file types rejected
- [ ] Oversized files rejected
- [ ] Rate limiting works
- [ ] Old files cleaned up
- [ ] Only CDN URLs stored

## Related Prompts

- **Authentication**: `auth-authorization/01_rbac_implementation.md`
- **Admin uploads**: `prompt-engineering/04_admin_action.md`

## Version History

**v1.0** (2025-10-21): Initial version
