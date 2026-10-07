import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

/**
 * Rate limiter instance - 5 requests per minute per IP address
 *
 * SCOPE LIMITATION — READ BEFORE RELYING ON THIS FOR ABUSE PREVENTION.
 *
 * RateLimiterMemory keeps its counters in the memory of ONE process. Vercel runs
 * this app across many function instances and recycles them freely, so:
 *
 *   - a caller spread across N warm instances gets up to N x 5 requests/minute
 *   - counters reset whenever an instance is recycled
 *
 * That makes this a speed bump against naive scripted abuse, NOT a guarantee.
 * It is honest defence in depth; it is not a quota.
 *
 * For a real limit you need shared durable state (Redis / Upstash) keyed the
 * same way, or enforcement at a layer that already sees every request — Vercel's
 * WAF rate limiting is the least-effort option and requires no code.
 *
 * For Convex mutations specifically this wrapper does nothing at all: Convex RPC
 * goes browser -> Convex and never passes through a Next.js route handler. Limit
 * those inside the mutation.
 */
const rateLimiter = new RateLimiterMemory({
  points: 5,        // 5 requests
  duration: 60,     // per 60 seconds (1 minute)
});

/**
 * Resolves the caller's IP from platform-trusted headers.
 *
 * Why not the leftmost X-Forwarded-For entry: XFF is an append-only list, and
 * the LEFTMOST entry is whatever the client sent. A caller can simply set
 * `X-Forwarded-For: <random>` on each request and receive a fresh bucket every
 * time, defeating the limit entirely. The previous implementation did exactly
 * this, so the limiter could be bypassed by anyone who knew to rotate a header.
 *
 * Order of preference:
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge, overwritten on every
 *      request, so a client cannot forge it.
 *   2. The RIGHTMOST `x-forwarded-for` entry — appended by the closest trusted
 *      proxy, rather than the leftmost value the client supplied.
 *   3. `x-real-ip` — set by the proxy, not the client, on common setups.
 *
 * If none are present we return null and the caller fails CLOSED (see below),
 * because a single shared "unknown" bucket would let one abuser exhaust the
 * limit for every anonymous visitor at once.
 */
function clientIp(request: NextRequest): string | null {
  const vercel = request.headers.get('x-vercel-forwarded-for')?.trim();
  if (vercel) return vercel;

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;

  return null;
}

// Lazy-initialized Convex client for security logging
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return null;
  }
  if (!convexClient) {
    convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }
  return convexClient;
}

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
    // Resolve once, outside the try, so the catch block reports the same key
    // that was actually consumed rather than recomputing it.
    const ip = clientIp(request);

    if (!ip) {
      // Fail closed. Previously an unresolvable IP collapsed to the literal
      // string 'unknown', putting every such caller in ONE shared bucket — so a
      // single abuser could exhaust the limit for all of them. Refusing is the
      // safer failure, and on Vercel this branch should be unreachable.
      console.warn('Rate limit: could not resolve a trusted client IP; refusing request');
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    try {
      // Consume a point for this IP address
      await rateLimiter.consume(ip);

      // Rate limit not exceeded, proceed with the original handler
      return await handler(request);
    } catch (err: unknown) {
      // Check if this is a rate limit error
      if (err && typeof err === 'object' && err.constructor.name === 'RateLimiterRes') {
        const endpoint = request.nextUrl.pathname;

        console.warn(`Rate limit exceeded for IP: ${ip} on ${endpoint}`);

        // Log security violation to Convex
        const client = getConvexClient();
        if (client) {
          try {
            await client.mutation(api.security.logSecurityViolation, {
              eventType: 'rate_limit_exceeded',
              severity: 'medium',
              metadata: {
                endpoint,
                ipAddress: ip,
                errorMessage: 'Rate limit exceeded: 5 requests per minute',
              },
            });
          } catch (logErr) {
            console.error('Failed to log rate limit violation:', logErr);
          }
        }

        return NextResponse.json(
          { error: 'Too many requests, please try again later' },
          { status: 429 }
        );
      }

      // Re-throw any other errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Rate limiting error:', errorMessage);
      throw err;
    }
  };
}
