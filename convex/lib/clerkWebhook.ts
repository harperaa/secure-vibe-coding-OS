/**
 * Verify a Clerk (svix-signed) webhook and return the parsed event.
 *
 * svix 2.2.0 removed JSON parsing from Webhook.verify: it now returns nothing on success and
 * still throws on a bad signature. Using its return value as the event therefore turns every
 * valid webhook into `undefined`. Verify first, then parse the exact bytes that were verified;
 * this holds on svix 1 and 2.
 */
import { Webhook } from "svix";

export function verifyClerkWebhook(
  payload: string,
  headers: Record<string, string>,
  secret: string,
): unknown {
  new Webhook(secret).verify(payload, headers);
  return JSON.parse(payload);
}
