import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/withRateLimit';
import { withCsrf } from '@/lib/withCsrf';
import { validateRequest } from '@/lib/validateRequest';
import { createPostSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/errorHandler';

/**
 * Example Protected API Route
 * ============================
 *
 * This endpoint demonstrates how to combine:
 * - Rate limiting (5 requests/minute per IP)
 * - CSRF protection (token validation)
 * - Input validation & XSS sanitization (Zod schemas)
 *
 * This is a template for creating secure API routes in your application.
 * For testing purposes only - can be removed in production.
 *
 * Usage:
 * ------
 * 1. Get CSRF token: GET /api/csrf
 * 2. POST to this endpoint with:
 *    - Header: X-CSRF-Token: <token>
 *    - Body: { title: "...", content: "...", tags: ["..."] }
 *
 * Testing:
 * --------
 * node scripts/test-rate-limit.js /api/example-protected
 */

async function exampleProtectedHandler(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate and sanitize input using Zod schema
    const validation = validateRequest(createPostSchema, body);

    if (!validation.success) {
      // Returns 400 with detailed validation errors
      return validation.response;
    }

    // validation.data is now type-safe and XSS-sanitized!
    const { title, content, tags } = validation.data;

    // Here you would typically:
    // 1. Get authenticated user from Clerk
    // 2. Save to Convex database
    // 3. Return success response

    // Example response showing sanitized data
    return NextResponse.json({
      success: true,
      message: 'Data validated and sanitized successfully',
      data: {
        title,
        content,
        tags,
      },
      note: 'In production, this would save to database',
    });
  } catch (error) {
    // Use secure error handler (hides stack traces in production)
    return handleApiError(error, 'example-protected');
  }
}

/**
 * Apply security layers:
 * 1. withRateLimit - Prevents brute force (5 req/min per IP)
 * 2. withCsrf - Validates CSRF token from header
 * 3. Handler validates & sanitizes input with Zod
 *
 * Order matters: Rate limit first, then CSRF, then handler
 */
export const POST = withRateLimit(withCsrf(exampleProtectedHandler));

export const config = {
  runtime: 'nodejs',
};
