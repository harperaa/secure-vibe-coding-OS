import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

/**
 * The app's public security-log mutation. Named rather than imported from the
 * app's generated api so this file can live in a package; the app registers
 * `logSecurityViolation` in convex/security.ts with exactly these args.
 */
const logSecurityViolation = makeFunctionReference<
  'mutation',
  {
    key: string;
    eventType: string;
    severity: string;
    metadata: Record<string, string | undefined>;
  }
>('security:logSecurityViolation');

const DEFAULT_POINTS = 5;    // 5 requests
const DEFAULT_DURATION = 60; // per 60 seconds (1 minute)
// rate-limiter-flexible expires a window with setTimeout, which Node clamps to
// 1 ms above 2^31-1 ms. A longer window would silently disable the limit.
const MAX_DURATION = Math.floor((2 ** 31 - 1) / 1000); // seconds, ~24.8 days

/**
 * Rate limiter instance - 5 requests per minute per IP address
 *
 * SCOPE LIMITATION — READ BEFORE RELYING ON THIS FOR ABUSE PREVENTION.
 *
 * RateLimiterMemory keeps its counters in the memory of ONE process. Vercel runs
 * this app across many function instances and recycles them freely, so:
 *
 *   - a caller spread across N warm instances gets up to N x the limit
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
  points: DEFAULT_POINTS,
  duration: DEFAULT_DURATION,
});

/**
 * Optional per-route limit. Omit it (or pass the default values) and the route
 * shares the default 5-per-minute bucket above, exactly as before.
 *
 * Pass it for a route whose legitimate traffic is higher than 5/min, such as
 * an endpoint the client calls on every token refresh or reconnect. Routes that
 * pass the same `{ points, duration }` share one bucket per IP, the same way
 * every default route shares the default bucket. The scope limitation above
 * applies unchanged: these are per-instance counters, not a quota.
 */
export interface RateLimitOptions {
  /** Requests allowed per window. Positive integer; defaults to 5. */
  points?: number;
  /** Window length in seconds. Integer from 1 to MAX_DURATION (~24.8 days); defaults to 60. */
  duration?: number;
}

const customLimiters = new Map<string, RateLimiterMemory>();

function resolveLimiter(opts?: RateLimitOptions) {
  const points = opts?.points ?? DEFAULT_POINTS;
  const duration = opts?.duration ?? DEFAULT_DURATION;
  // Fail at wrap time, when the route module loads, not on the first request:
  // points: 0 would refuse every caller, a fractional or negative window is a
  // typo, not a policy, and a window above MAX_DURATION disables the limit.
  for (const [name, value, max] of [
    ['points', points, Number.MAX_SAFE_INTEGER],
    ['duration', duration, MAX_DURATION],
  ] as const) {
    if (!Number.isInteger(value) || value < 1 || value > max) {
      throw new Error(`withRateLimit: ${name} must be an integer from 1 to ${max}, got ${String(value)} (${typeof value})`);
    }
  }
  // Options equal to the default use the default bucket, so `{}` or
  // `{ points: 5 }` behaves exactly like passing nothing.
  if (points === DEFAULT_POINTS && duration === DEFAULT_DURATION) {
    return { limiter: rateLimiter, points, duration };
  }
  const key = `${points}:${duration}`;
  let limiter = customLimiters.get(key);
  if (!limiter) {
    limiter = new RateLimiterMemory({ points, duration });
    customLimiters.set(key, limiter);
  }
  return { limiter, points, duration };
}

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
 *
 * Exported so app code that records a caller's IP (audit logs, for example)
 * uses this same resolution instead of reading a header directly. The trust
 * assumptions above (Vercel, or a proxy that appends XFF) apply to callers too.
 */
export function clientIp(request: NextRequest): string | null {
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
 * @param opts - Optional per-route limit (see RateLimitOptions); omit for the default 5/min
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
 *
 * // A route with more legitimate traffic gets its own, higher limit
 * export const GET = withRateLimit(tokenHandler, { points: 60, duration: 60 });
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  opts?: RateLimitOptions
) {
  const { limiter, points, duration } = resolveLimiter(opts);
  const perWindow = duration === 60 ? 'minute' : `${duration} seconds`;
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
      await limiter.consume(ip);

      // Rate limit not exceeded, proceed with the original handler
      return await handler(request);
    } catch (err: unknown) {
      // Check if this is a rate limit error.
      //
      // instanceof, NOT `err.constructor.name === 'RateLimiterRes'`. The
      // production server bundle is minified and class names are mangled, so
      // the name check matched in `next dev` and silently failed in `next
      // build` + `next start`: every over-limit request fell through to the
      // rethrow below and surfaced as a 500, and the violation was never
      // logged. Caught by the release smoke test, not by review.
      if (err instanceof RateLimiterRes) {
        const endpoint = request.nextUrl.pathname;

        console.warn(`Rate limit exceeded for IP: ${ip} on ${endpoint}`);

        // Log security violation to Convex. The mutation requires the shared
        // SECURITY_LOG_KEY so that only this server, not anyone holding the
        // public deployment URL, can write to the security log.
        const client = getConvexClient();
        const key = process.env.SECURITY_LOG_KEY;
        if (client && !key) {
          console.error('SECURITY_LOG_KEY is not set; rate limit violation not logged to Convex');
        }
        if (client && key) {
          try {
            await client.mutation(logSecurityViolation, {
              key,
              eventType: 'rate_limit_exceeded',
              severity: 'medium',
              metadata: {
                endpoint,
                ipAddress: ip,
                errorMessage: `Rate limit exceeded: ${points} requests per ${perWindow}`,
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
