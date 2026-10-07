import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

/**
 * Reads CSRF_SECRET, or throws.
 *
 * There is deliberately no fallback value. A previous version used
 * `process.env.CSRF_SECRET || 'default-secret'`, which meant a deployment that
 * forgot to set the variable still produced tokens — signed with a constant
 * that is public in this repository, and therefore forgeable by anyone. The
 * failure was invisible: tokens validated, the flow worked, and CSRF protection
 * was simply absent.
 *
 * Failing loudly at first use is the correct trade. `/install` and
 * `/deploy-to-*` both provision CSRF_SECRET, so reaching this throw means the
 * environment is genuinely misconfigured.
 */
function csrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'CSRF_SECRET is not set (or is shorter than 32 chars). Refusing to sign CSRF ' +
        'tokens with a weak or absent key — that would silently disable CSRF protection. ' +
        'Set CSRF_SECRET in Doppler (or .env.local in legacy mode) and redeploy.'
    );
  }
  return secret;
}

/**
 * Generates a CSRF token bound to a session ID using HMAC-SHA256
 * @param sessionId - The session ID to bind the token to
 * @returns The generated CSRF token (HMAC digest)
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  // Read the secret OUTSIDE the try. A missing secret is a configuration fault
  // that must propagate, not get swallowed and rethrown as a generic failure.
  const secret = csrfSecret();
  try {
    const token = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    const hmac = CryptoJS.HmacSHA256(token + sessionId, secret).toString(CryptoJS.enc.Hex);
    return hmac;
  } catch (err: any) {
    console.error('CSRF token generation error:', err.message);
    throw new Error('Failed to generate CSRF token');
  }
}

/**
 * Validates a CSRF token against the stored token
 * @param sentToken - Token received from the client
 * @param storedToken - Token stored in the cookie
 * @returns True if tokens match, false otherwise
 */
export function validateCsrfToken(sentToken: string, storedToken: string): boolean {
  try {
    return sentToken === storedToken;
  } catch (err: any) {
    console.error('CSRF validation error:', err.message);
    return false;
  }
}

/**
 * Generates a UUID for session identification
 * @returns A v4 UUID string
 */
export function generateUUID(): string {
  return uuidv4();
}
