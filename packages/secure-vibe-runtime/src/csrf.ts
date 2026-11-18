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

/** Cookie the token is stored in when the app does not use the `__Host-` prefix. */
export const CSRF_COOKIE = 'XSRF-TOKEN';

/**
 * Prefixed cookie name. A browser only accepts a `__Host-` cookie from the exact
 * host over HTTPS (Secure, Path=/, no Domain), so a sibling subdomain or a
 * network attacker cannot plant one. Use it in production.
 */
export const CSRF_HOST_COOKIE = '__Host-XSRF-TOKEN';

const RANDOM_PART = /^[0-9a-f]{64}$/;

// cookieName and random contain no dots, so the fields cannot run into each other.
function sign(random: string, sessionId: string, cookieName: string, secret: string): string {
  return CryptoJS.HmacSHA256(`${cookieName}.${random}.${sessionId}`, secret).toString(CryptoJS.enc.Hex);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Generates a CSRF token bound to a session ID using HMAC-SHA256
 * @param sessionId - The session ID to bind the token to
 * @param cookieName - The cookie the token will be stored in (CSRF_COOKIE or
 *   CSRF_HOST_COOKIE). The token only validates when it comes back in that cookie.
 * @returns The token, `<random>.<HMAC(cookieName, random, sessionId)>`
 */
export async function generateCsrfToken(sessionId: string, cookieName: string = CSRF_COOKIE): Promise<string> {
  // Read the secret OUTSIDE the try. A missing secret is a configuration fault
  // that must propagate, not get swallowed and rethrown as a generic failure.
  const secret = csrfSecret();
  try {
    const random = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    return `${random}.${sign(random, sessionId, cookieName, secret)}`;
  } catch (err: any) {
    console.error('CSRF token generation error:', err.message);
    throw new Error('Failed to generate CSRF token');
  }
}

/**
 * Checks that a token was issued by this server for this session and cookie.
 * Recomputes the HMAC from the token's random part, so a value minted without
 * CSRF_SECRET, issued for another session, or moved to another cookie fails.
 * @param token - The token as received
 * @param sessionId - The session ID of the request
 * @param cookieName - The cookie the token arrived in
 * @returns True if the token is valid for this session and cookie
 */
export function verifyCsrfToken(token: string, sessionId: string, cookieName: string = CSRF_COOKIE): boolean {
  const secret = csrfSecret();
  const [random, hmac, ...rest] = token.split('.');
  if (!hmac || rest.length > 0 || !RANDOM_PART.test(random)) return false;
  return constantTimeEqual(hmac, sign(random, sessionId, cookieName, secret));
}

/**
 * Compares the token sent in the header with the token stored in the cookie.
 * This is only the double-submit half of the check: it does not prove the token
 * belongs to the session. Use verifyCsrfToken for that (withCsrf does both).
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
