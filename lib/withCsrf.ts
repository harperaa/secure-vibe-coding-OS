import { NextRequest, NextResponse } from "next/server";
import { validateCsrfToken } from "./csrf";
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

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

  const client = getConvexClient();
  if (client) {
    client.mutation(api.security.logSecurityViolation, {
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
      const storedToken = request.cookies.get("XSRF-TOKEN")?.value;

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

      if (!validateCsrfToken(csrfToken, storedToken)) {
        console.error("CSRF check failed: Token mismatch");
        logCsrfViolation(request, "CSRF token mismatch");
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }

      // Call the original handler
      const response = await handler(request);

      // Clear the CSRF token after use (single-use tokens)
      response.cookies.set("XSRF-TOKEN", "", { maxAge: 0, path: "/" });

      return response;
    } catch (err: any) {
      console.error("CSRF middleware error:", err.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}
