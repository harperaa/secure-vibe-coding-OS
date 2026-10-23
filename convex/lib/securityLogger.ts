/**
 * Security Logger
 *
 * Unified helper for logging ALL security events.
 * Used within mutations that return results instead of throwing.
 * Direct DB insert ensures events persist (no scheduler, no separate transaction).
 */

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * SECURITY: Sanitize email for logging - preserves domain but masks local part
 * Example: john.doe@example.com -> j***e@example.com
 */
function sanitizeEmailForLog(email: string | undefined): string | undefined {
  if (!email) return undefined;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***@invalid';

  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  // For very short local parts, just mask completely
  if (localPart.length <= 2) {
    return `***${domain}`;
  }

  // Keep first and last character, mask the rest
  return `${localPart[0]}***${localPart[localPart.length - 1]}${domain}`;
}

/**
 * SECURITY: Sanitize name for logging - keeps first character and length indication
 * Example: John Doe -> J*** (8 chars)
 */
function sanitizeNameForLog(name: string | undefined): string | undefined {
  if (!name) return undefined;

  const trimmed = name.trim();
  if (trimmed.length === 0) return undefined;

  // Keep first character and indicate length
  return `${trimmed[0]}*** (${trimmed.length} chars)`;
}

/**
 * SECURITY: Sanitize user ID for logging - partial redaction
 * Example: usr_123456789 -> usr_1234***
 */
function sanitizeIdForLog(id: string | undefined): string | undefined {
  if (!id) return undefined;

  if (id.length <= 8) {
    return `${id.substring(0, 2)}***`;
  }

  // Keep first 8 characters, mask the rest
  return `${id.substring(0, 8)}***`;
}

/**
 * Maximum stored length for caller-supplied free-text log fields.
 *
 * 2 KB is far more than any genuine errorMessage or requestPayload excerpt needs
 * for triage, and small enough that even sustained abuse grows the table slowly
 * relative to Convex's per-transaction read ceiling.
 */
const MAX_LOG_FIELD_CHARS = 2000;

/**
 * Cap for every OTHER caller-supplied string (origin, endpoint, IP,
 * fingerprint, action type, and the PII fields before masking). None of these
 * has a legitimate value anywhere near this long; an origin or endpoint over
 * 256 chars is itself evidence of abuse.
 *
 * Worst-case row size is what the dashboard's SCAN_CEILING and the retention
 * cron's PRUNE_BATCH in convex/security.ts are derived from: two 2,000-char
 * fields plus eight 256-char fields is under ~6 KB per row, so 1,000 rows
 * stay under Convex's 8 MiB per-transaction read budget. Change these caps
 * and those batch sizes together.
 */
const MAX_LOG_SHORT_FIELD_CHARS = 256;

/**
 * Caps a caller-supplied string so one caller cannot write unbounded rows.
 *
 * This exists because logSecurityViolation records violations before a session
 * exists, gated only by a shared server-side key. If that key leaks, and
 * without a cap, the audit table is an unbounded write primitive for anyone who
 * knows the Convex deployment URL — and the failure mode is self-concealing, because the first
 * thing that breaks is the dashboard used to notice it. A row of uncapped
 * fields can approach Convex's 1 MiB document limit, and a handful of those
 * exhausts the read budget of any query or cleanup that touches them.
 *
 * Truncation is marked so a reader can tell a clipped value from a short one.
 */
function capForLog(value: string | undefined, max = MAX_LOG_FIELD_CHARS): string | undefined {
  if (!value) return undefined;
  if (value.length <= max) return value;
  return `${value.substring(0, max)}…[truncated ${value.length - max} chars]`;
}

const capShort = (value: string | undefined) => capForLog(value, MAX_LOG_SHORT_FIELD_CHARS);

/**
 * All security event types that can be logged
 */
export type SecurityEventType =
  | "origin_mismatch"
  | "rate_limit_exceeded"
  | "invalid_api_key"
  | "fingerprint_change"
  | "suspicious_activity"
  | "jwt_validation_failed"
  | "unauthorized_access"
  | "input_validation_failed"
  | "replay_detected"
  | "not_found_enumeration"
  // New attack event types
  | "jwt_algorithm_attack"
  | "tenant_isolation_attack"
  | "jwt_replay_attack"
  | "xss_attempt"
  | "fingerprint_manipulation"
  | "http_origin_blocked"
  // AI chat security event types
  | "prompt_injection_attempt"
  | "ai_response_validation_failed"
  | "csrf_validation_failed";

/**
 * Severity levels for security events
 */
export type SecuritySeverity = "low" | "medium" | "high" | "critical";

/**
 * Metadata for security events
 */
export interface SecurityMetadata {
  endpoint: string;
  origin?: string;
  ipAddress?: string;
  fingerprint?: string;
  errorMessage?: string;
  endUserEmail?: string;
  endUserName?: string;
  endUserId?: string;
  actionType?: string;
  requestPayload?: string;
}

/**
 * Log a security event directly to the database.
 *
 * This function is designed to be called from mutations that return
 * result objects instead of throwing. Since the mutation won't throw
 * after logging, the event will persist.
 *
 * @param ctx - Mutation context
 * @param userId - User ID who owns this security event (optional for anonymous violations)
 * @param eventType - Type of security event
 * @param severity - Severity level of the event
 * @param metadata - Additional event metadata
 * @returns The ID of the created security event
 */
export async function logSecurity(
  ctx: MutationCtx,
  userId: Id<"users"> | undefined,
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  metadata: SecurityMetadata
): Promise<Id<"securityEvents">> {
  // SECURITY: Sanitize PII before logging
  // Preserves enough info for security analysis while protecting user privacy
  // Every field is size-capped because logSecurityViolation is gated only by a
  // shared key. If it leaks and without caps, one caller can write arbitrarily large rows
  // and grow the securityEvents table until the dashboard's reads (and the
  // retention cron's deletes) exceed Convex's per-transaction limit —
  // silencing the monitoring it is meant to feed. Truncate rather than
  // reject: a clipped event is still evidence. The two free-text fields get
  // the long cap; everything else the short one.
  const sanitizedMetadata = {
    endpoint: capShort(metadata.endpoint),
    origin: capShort(metadata.origin),
    ipAddress: capShort(metadata.ipAddress), // IPs are needed for security analysis
    fingerprint: capShort(metadata.fingerprint), // Fingerprints are anonymized identifiers
    errorMessage: capForLog(metadata.errorMessage),
    // PII fields are capped first (a masked email still keeps its domain), then sanitized
    endUserEmail: sanitizeEmailForLog(capShort(metadata.endUserEmail)),
    endUserName: sanitizeNameForLog(capShort(metadata.endUserName)),
    endUserId: sanitizeIdForLog(capShort(metadata.endUserId)),
    actionType: capShort(metadata.actionType),
    requestPayload: capForLog(metadata.requestPayload),
  };

  // Direct insert - no scheduler, no separate transaction
  const eventId = await ctx.db.insert("securityEvents", {
    userId,
    eventType,
    severity,
    metadata: sanitizedMetadata,
    timestamp: Date.now(),
    isRead: false,
  });

  // Also log to console for debugging (using sanitized metadata)
  console.log(
    `[SECURITY EVENT] ${severity.toUpperCase()}: ${eventType} | ` +
    `user=${userId} endpoint=${sanitizedMetadata.endpoint} ` +
    (sanitizedMetadata.errorMessage ? `error="${sanitizedMetadata.errorMessage}"` : "")
  );

  return eventId;
}
