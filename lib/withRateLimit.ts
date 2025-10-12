import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiter instance - 5 requests per minute per IP address
 * Configured to prevent brute force attacks and abuse
 */
const rateLimiter = new RateLimiterMemory({
  points: 5,        // 5 requests
  duration: 60,     // per 60 seconds (1 minute)
});

/**
 * Higher-order function that wraps API route handlers with rate limiting
 * Tracks requests by IP address and returns 429 when limit is exceeded
 *
 * @param handler - The API route handler to wrap
 * @returns A wrapped handler with rate limiting protection
 *
 * @example
 * ```typescript
 * import { withRateLimit } from '@/lib/withRateLimit';
 * import { withCsrf } from '@/lib/withCsrf';
 *
 * async function sensitiveHandler(request: NextRequest) {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * }
 *
 * // Apply both rate limiting and CSRF protection
 * export const POST = withRateLimit(withCsrf(sensitiveHandler));
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      // Extract IP address from headers (prioritize x-forwarded-for for proxies)
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

      // Consume a point for this IP address
      await rateLimiter.consume(ip);

      // Rate limit not exceeded, proceed with the original handler
      return await handler(request);
    } catch (err: any) {
      // Check if this is a rate limit error
      if (err.constructor.name === 'RateLimiterRes') {
        console.warn(`Rate limit exceeded for IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
        return NextResponse.json(
          { error: 'Too many requests, please try again later' },
          { status: 429 }
        );
      }

      // Re-throw any other errors
      console.error('Rate limiting error:', err.message);
      throw err;
    }
  };
}
