/**
 * Type-level test, checked by `npm run typecheck` (tsc --noEmit) in CI.
 *
 * The argument type below is derived from the validator Convex enforces at
 * runtime, so if logSecurityEventForCurrentUser ever accepts "high" or
 * "critical" again, the @ts-expect-error lines stop being errors and tsc fails.
 */
import type { FunctionArgs } from "convex/server";
import type { api } from "../convex/_generated/api";

type EndUserSeverity = FunctionArgs<typeof api.security.logSecurityEventForCurrentUser>["severity"];

export const allowed: EndUserSeverity[] = ["low", "medium"];

// @ts-expect-error a signed-in user must not be able to log "high"
export const high: EndUserSeverity = "high";

// @ts-expect-error a signed-in user must not be able to log "critical"
export const critical: EndUserSeverity = "critical";
