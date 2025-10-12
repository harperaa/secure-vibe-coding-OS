import { NextRequest, NextResponse } from "next/server";
import { validateCsrfToken } from "./csrf";

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
        console.error("CSRF check failed: Missing token", {
          sent: csrfToken,
          stored: storedToken,
        });
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }

      if (!validateCsrfToken(csrfToken, storedToken)) {
        console.error("CSRF check failed: Token mismatch", {
          sent: csrfToken,
          stored: storedToken,
        });
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
