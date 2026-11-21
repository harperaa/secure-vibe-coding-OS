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
 * Name of the cookie that carries the CSRF token.
 *
 * In production it has the `__Host-` prefix: browsers only accept such a cookie
 * from the host itself (Secure, Path=/, no Domain), so a sibling subdomain or a
 * plain-HTTP network attacker cannot plant their own token for this host. The
 * prefix requires Secure, which a local http dev server cannot satisfy in every
 * browser, so development keeps the plain name.
 */
export function csrfCookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-XSRF-TOKEN' : 'XSRF-TOKEN';
}

const RANDOM_PART = /^[0-9a-f]{64}$/;

function sign(random: string, sessionId: string, secret: string): string {
  return CryptoJS.HmacSHA256(random + sessionId, secret).toString(CryptoJS.enc.Hex);
}

/** String comparison whose duration does not depend on where the inputs differ. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generates a CSRF token bound to a session ID using HMAC-SHA256
 * @param sessionId - The session ID to bind the token to
 * @returns The token, `<random>.<HMAC(random + sessionId, CSRF_SECRET)>`
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  // Read the secret OUTSIDE the try. A missing secret is a configuration fault
  // that must propagate, not get swallowed and rethrown as a generic failure.
  const secret = csrfSecret();
  try {
    const random = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    return `${random}.${sign(random, sessionId, secret)}`;
  } catch (err: any) {
    console.error('CSRF token generation error:', err.message);
    throw new Error('Failed to generate CSRF token');
  }
}

/**
 * Validates a CSRF token: the header and cookie values must match, and the
 * token's HMAC must verify for this session. A token issued to another session,
 * or minted without CSRF_SECRET, is rejected.
 * @param sentToken - Token received from the client
 * @param storedToken - Token stored in the cookie
 * @param sessionId - Session ID of the request
 * @returns True if the token is valid for this session, false otherwise
 */
export function validateCsrfToken(sentToken: string, storedToken: string, sessionId: string): boolean {
  // Outside the try for the same reason as in generateCsrfToken.
  const secret = csrfSecret();
  try {
    if (!sentToken || !storedToken || !sessionId) return false;
    const [random, mac, ...rest] = sentToken.split('.');
    // The fixed-length random part keeps `random + sessionId` unambiguous.
    if (rest.length > 0 || !mac || !RANDOM_PART.test(random)) return false;
    const matchesCookie = constantTimeEqual(sentToken, storedToken);
    const matchesSession = constantTimeEqual(mac, sign(random, sessionId, secret));
    return matchesCookie && matchesSession;
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
