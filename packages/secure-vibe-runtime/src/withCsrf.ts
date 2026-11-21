import { NextRequest, NextResponse } from "next/server";
import { csrfCookieName, validateCsrfToken } from "./csrf";
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
 * Log a CSRF violation to the security dashboard (non-blocking)
 */
function logCsrfViolation(request: NextRequest, reason: string): void {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const endpoint = request.nextUrl.pathname;
  const origin = request.headers.get('origin') || undefined;

  // The mutation requires the shared SECURITY_LOG_KEY so that only this server,
  // not anyone holding the public deployment URL, can write to the security log.
  const client = getConvexClient();
  const key = process.env.SECURITY_LOG_KEY;
  if (client && !key) {
    console.error('SECURITY_LOG_KEY is not set; CSRF violation not logged to Convex');
  }
  if (client && key) {
    client.mutation(logSecurityViolation, {
      key,
      eventType: 'csrf_validation_failed',
      severity: 'critical',
      metadata: {
        endpoint,
        ipAddress: ip,
        origin,
        errorMessage: reason,
      },
    }).catch((logErr) => {
      console.error('Failed to log CSRF violation:', logErr);
    });
  }
}

/**
 * Higher-order function that wraps API route handlers with CSRF protection
 * Validates the CSRF token from the request header against the stored cookie
 * and against the request's session (the `temp-session` or `session` cookie the
 * token was issued for)
 * Tokens are single-use and cleared after validation
 *
 * @param handler - The API route handler to wrap
 * @returns A wrapped handler with CSRF protection
 *
 * @example
 * ```typescript
 * import { withCsrf } from '@/lib/withCsrf';
 *
 * async function loginHandler(request: NextRequest) {
 *   // Your login logic here
 *   return NextResponse.json({ success: true });
 * }
 *
 * export const POST = withCsrf(loginHandler);
 * ```
 */
export function withCsrf(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const csrfToken = request.headers.get("x-csrf-token");
      const cookieName = csrfCookieName();
      const storedToken = request.cookies.get(cookieName)?.value;
      // Same lookup as the route that issues the token (app/api/csrf/route.ts).
      const sessionId = request.cookies.get("temp-session")?.value || request.cookies.get("session")?.value;

      if (!csrfToken || !storedToken) {
        const reason = !csrfToken ? "Missing CSRF token in header" : "Missing CSRF cookie";
        console.error("CSRF check failed: Missing token", {
          sent: csrfToken ? "[present]" : "[missing]",
          stored: storedToken ? "[present]" : "[missing]",
        });
        logCsrfViolation(request, reason);
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }

      if (!sessionId || !validateCsrfToken(csrfToken, storedToken, sessionId)) {
        console.error("CSRF check failed: Token mismatch or not valid for this session");
        logCsrfViolation(request, "CSRF token mismatch or not valid for this session");
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }

      // Call the original handler
      const response = await handler(request);

      // Clear the CSRF token after use (single-use tokens)
      // A `__Host-` cookie can only be changed by a Secure Set-Cookie.
      response.cookies.set(cookieName, "", {
        maxAge: 0,
        path: "/",
        secure: cookieName.startsWith("__Host-"),
      });

      return response;
    } catch (err: any) {
      console.error("CSRF middleware error:", err.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}
