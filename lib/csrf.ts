import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

/**
 * Generates a CSRF token bound to a session ID using HMAC-SHA256
 * @param sessionId - The session ID to bind the token to
 * @returns The generated CSRF token (HMAC digest)
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  try {
    const token = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    const hmac = CryptoJS.HmacSHA256(
      token + sessionId,
      process.env.CSRF_SECRET || 'default-secret'
    ).toString(CryptoJS.enc.Hex);
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
