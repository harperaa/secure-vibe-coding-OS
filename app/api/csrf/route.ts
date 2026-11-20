import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, generateUUID } from '@/lib/csrf';

/**
 * GET /api/csrf
 *
 * Generates a CSRF token for the current session or creates a temporary session.
 * The token is bound to the session ID and stored in an HTTP-only, SameSite=Strict cookie.
 *
 * @returns JSON response with the CSRF token
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/csrf', { credentials: 'include' });
 * const { csrfToken } = await response.json();
 * // Use csrfToken in subsequent POST requests via X-CSRF-Token header
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Use existing session ID or create a temporary one for unauthenticated users
    let sessionId = request.cookies.get('temp-session')?.value || request.cookies.get('session')?.value;
    if (!sessionId) {
      sessionId = generateUUID();
    }

    const token = await generateCsrfToken(sessionId);
    const response = NextResponse.json({ csrfToken: token });

    // Set the CSRF token cookie. In production it carries the `__Host-` prefix
    // so a sibling subdomain cannot overwrite it; withCsrf from
    // secure-vibe-runtime > 7.4.0 reads only that name there.
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hour
      path: '/',
    } as const;
    if (process.env.NODE_ENV === 'production') {
      response.cookies.set('__Host-XSRF-TOKEN', token, cookieOptions);
    }
    // Still needed in development, and in production by secure-vibe-runtime
    // 7.4.0, whose withCsrf only knows this name. Once the dependency is past
    // 7.4.0, set this one in development only (csrfCookieName() gives the name).
    response.cookies.set('XSRF-TOKEN', token, cookieOptions);

    // Set temporary session cookie if no permanent session exists
    if (!request.cookies.get('session')?.value) {
      response.cookies.set('temp-session', sessionId, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600, // 1 hour
        path: '/',
      });
    }

    return response;
  } catch (err: any) {
    console.error('CSRF generation error:', err.message);
    return NextResponse.json(
      { error: 'Failed to generate security token' },
      { status: 500 }
    );
  }
}

// Explicitly use the Node.js runtime for crypto-js. This must be its own named
// export — the App Router ignores `export const config`, which is Pages Router
// syntax, so the previous form silently did nothing.
export const runtime = 'nodejs';
