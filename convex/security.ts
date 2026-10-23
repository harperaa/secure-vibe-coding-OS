/**
 * Security monitoring queries and mutations
 * Provides dashboard with security event data and analytics
 */

import { v } from "convex/values";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrowForMutation, isCurrentUserAdmin, isCurrentUserAdminMutation } from "./users";
import { Id } from "./_generated/dataModel";
import { logSecurity, SecurityEventType, SecuritySeverity } from "./lib/securityLogger";

/**
 * Upper bound on rows any dashboard query reads in one transaction.
 *
 * logSecurityViolation is gated by a shared key, but that key is a secret and
 * secrets leak, so treat the table as attacker-growable. An unbounded read here made the admin dashboard
 * denial-of-serviceable by anyone who could write rows: grow the table past
 * Convex's per-transaction read ceiling and every call throws. The monitoring
 * surface was the first casualty of the flood it existed to reveal. Reading a
 * bounded window means a flood degrades signal rather than availability.
 *
 * Sized in BYTES, not just rows: every caller-supplied field is capped in
 * convex/lib/securityLogger.ts, which puts the worst-case row under ~6 KB, so
 * 1,000 rows stay under Convex's 8 MiB per-transaction read budget even when
 * every row was written by an attacker at the cap. Raise this only together
 * with a tighter field cap.
 */
const SCAN_CEILING = 1000;

/**
 * Newest-first query over securityEvents, bounded to [startTime, endTime] via
 * the byTimestamp index. A time-filtered view therefore reads only rows in
 * range instead of taking the newest N and discarding most of them in JS.
 */
function eventsInWindow(ctx: QueryCtx, startTime?: number, endTime?: number) {
  const table = ctx.db.query("securityEvents");
  const ranged =
    startTime !== undefined && endTime !== undefined
      ? table.withIndex("byTimestamp", (q) => q.gte("timestamp", startTime).lte("timestamp", endTime))
      : startTime !== undefined
        ? table.withIndex("byTimestamp", (q) => q.gte("timestamp", startTime))
        : endTime !== undefined
          ? table.withIndex("byTimestamp", (q) => q.lte("timestamp", endTime))
          : table.withIndex("byTimestamp");
  return ranged.order("desc");
}

// Event type validator - reusable across mutations
const eventTypeValidator = v.union(
  v.literal("origin_mismatch"),
  v.literal("rate_limit_exceeded"),
  v.literal("invalid_api_key"),
  v.literal("fingerprint_change"),
  v.literal("suspicious_activity"),
  v.literal("jwt_validation_failed"),
  v.literal("unauthorized_access"),
  v.literal("input_validation_failed"),
  v.literal("replay_detected"),
  v.literal("not_found_enumeration"),
  v.literal("jwt_algorithm_attack"),
  v.literal("tenant_isolation_attack"),
  v.literal("jwt_replay_attack"),
  v.literal("xss_attempt"),
  v.literal("fingerprint_manipulation"),
  v.literal("http_origin_blocked"),
  v.literal("prompt_injection_attempt"),
  v.literal("ai_response_validation_failed"),
  v.literal("csrf_validation_failed")
);

const severityValidator = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));

const metadataValidator = v.object({
  origin: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  fingerprint: v.optional(v.string()),
  endpoint: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  endUserEmail: v.optional(v.string()),
  endUserName: v.optional(v.string()),
  endUserId: v.optional(v.string()),
  actionType: v.optional(v.string()),
  requestPayload: v.optional(v.string()),
});

/**
 * List security events - ADMIN ONLY
 * Returns all security events across the system
 * Supports optional time range filtering
 */
export const listSecurityEvents = query({
  args: {
    limit: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    eventType: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"))),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
  },
  returns: v.array(
    v.object({
      _id: v.id("securityEvents"),
      _creationTime: v.number(),
      userName: v.string(),
      userEmail: v.string(),
      eventType: v.string(),
      severity: v.string(),
      metadata: v.object({
        origin: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        fingerprint: v.optional(v.string()),
        endpoint: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        endUserEmail: v.optional(v.string()),
        endUserName: v.optional(v.string()),
        endUserId: v.optional(v.string()),
        actionType: v.optional(v.string()),
        requestPayload: v.optional(v.string()),
      }),
      timestamp: v.number(),
      isRead: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Admin-only access
    const isAdmin = await isCurrentUserAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const limit = args.limit || 50;

    // Bounded, index-backed read (see SCAN_CEILING). The time range is served
    // by the byTimestamp index; the remaining filters are applied in JS, so
    // over-fetch enough that a filtered view still fills a page.
    let events = await eventsInWindow(ctx, args.startTime, args.endTime)
      .take(Math.min(Math.max(limit * 10, 200), SCAN_CEILING));

    // Apply event type filter if specified
    if (args.eventType !== undefined) {
      events = events.filter(e => e.eventType === args.eventType);
    }

    // Apply status filter if specified (open = unread, closed = read)
    if (args.status !== undefined) {
      events = events.filter(e => args.status === "open" ? !e.isRead : e.isRead);
    }

    // Apply severity filter if specified
    if (args.severity !== undefined) {
      events = events.filter(e => e.severity === args.severity);
    }

    // Apply limit after filtering
    events = events.slice(0, limit);

    // Enrich with user names (for context on which user triggered the event)
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const eventUser = event.userId ? await ctx.db.get(event.userId) : null;
        return {
          _id: event._id,
          _creationTime: event._creationTime,
          userName: eventUser?.name || "Anonymous",
          userEmail: eventUser?.email || "N/A",
          eventType: event.eventType,
          severity: event.severity,
          metadata: event.metadata,
          timestamp: event.timestamp,
          isRead: event.isRead,
        };
      })
    );

    return enrichedEvents;
  },
});

/**
 * Get security summary for dashboard - ADMIN ONLY
 * Returns counts and statistics for all events within optional time range
 */
export const getSecuritySummary = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    eventType: v.optional(v.string()),
  },
  returns: v.object({
    totalEvents: v.number(),
    unreadCount: v.number(),
    criticalCount: v.number(),
    highCount: v.number(),
    mediumCount: v.number(),
    lowCount: v.number(),
    eventTypeBreakdown: v.any(), // Record<string, number>
  }),
  handler: async (ctx, args) => {
    const isAdmin = await isCurrentUserAdmin(ctx);
    if (!isAdmin) {
      return {
        totalEvents: 0,
        unreadCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        eventTypeBreakdown: {},
      };
    }

    // Bounded, index-backed read (see SCAN_CEILING). An unbounded .collect()
    // here made the summary tiles fail exactly when the table was being flooded.
    // The counts below are therefore over the most recent SCAN_CEILING events
    // in the requested window, not all time; that is the correct trade for a
    // dashboard that must keep rendering under abuse. The UI says so.
    let events = await eventsInWindow(ctx, args.startTime, args.endTime)
      .take(SCAN_CEILING);

    // Apply event type filter if specified
    if (args.eventType !== undefined) {
      events = events.filter(e => e.eventType === args.eventType);
    }

    // Calculate statistics
    const totalEvents = events.length;
    const unreadCount = events.filter(e => !e.isRead).length;
    const criticalCount = events.filter(e => e.severity === "critical").length;
    const highCount = events.filter(e => e.severity === "high").length;
    const mediumCount = events.filter(e => e.severity === "medium").length;
    const lowCount = events.filter(e => e.severity === "low").length;

    // Event type breakdown
    const eventTypeBreakdown: Record<string, number> = {};
    for (const event of events) {
      eventTypeBreakdown[event.eventType] = (eventTypeBreakdown[event.eventType] || 0) + 1;
    }

    return {
      totalEvents,
      unreadCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      eventTypeBreakdown,
    };
  },
});

/**
 * Mark a security event as read - ADMIN ONLY
 */
export const markEventAsRead = mutation({
  args: {
    eventId: v.id("securityEvents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Admin-only access
    const isAdmin = await isCurrentUserAdminMutation(ctx);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, { isRead: true });
    return null;
  },
});

/**
 * Mark a security event as unread - ADMIN ONLY
 */
export const markEventAsUnread = mutation({
  args: {
    eventId: v.id("securityEvents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Admin-only access
    const isAdmin = await isCurrentUserAdminMutation(ctx);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, { isRead: false });
    return null;
  },
});

/**
 * Log a security event for the current authenticated user
 * Used by API routes to log detected security violations
 * Uses the security logger library for PII sanitization and consistent logging
 */
export const logSecurityEventForCurrentUser = mutation({
  args: {
    eventType: v.union(
      v.literal("origin_mismatch"),
      v.literal("rate_limit_exceeded"),
      v.literal("invalid_api_key"),
      v.literal("fingerprint_change"),
      v.literal("suspicious_activity"),
      v.literal("jwt_validation_failed"),
      v.literal("unauthorized_access"),
      v.literal("input_validation_failed"),
      v.literal("replay_detected"),
      v.literal("not_found_enumeration"),
      v.literal("jwt_algorithm_attack"),
      v.literal("tenant_isolation_attack"),
      v.literal("jwt_replay_attack"),
      v.literal("xss_attempt"),
      v.literal("fingerprint_manipulation"),
      v.literal("http_origin_blocked"),
      v.literal("prompt_injection_attempt"),
      v.literal("ai_response_validation_failed"),
      v.literal("csrf_validation_failed")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    metadata: v.object({
      origin: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      fingerprint: v.optional(v.string()),
      endpoint: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      endUserEmail: v.optional(v.string()),
      endUserName: v.optional(v.string()),
      endUserId: v.optional(v.string()),
      actionType: v.optional(v.string()),
      requestPayload: v.optional(v.string()),
    }),
  },
  returns: v.id("securityEvents"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);

    // Use the security logger library for PII sanitization and consistent logging
    const eventId = await logSecurity(
      ctx,
      user._id,
      args.eventType as SecurityEventType,
      args.severity as SecuritySeverity,
      {
        endpoint: args.metadata.endpoint || "unknown",
        origin: args.metadata.origin,
        ipAddress: args.metadata.ipAddress,
        fingerprint: args.metadata.fingerprint,
        errorMessage: args.metadata.errorMessage,
        endUserEmail: args.metadata.endUserEmail,
        endUserName: args.metadata.endUserName,
        endUserId: args.metadata.endUserId,
        actionType: args.metadata.actionType,
        requestPayload: args.metadata.requestPayload,
      }
    );

    return eventId;
  },
});

/**
 * Constant-time string comparison for the shared logging key. A plain `===`
 * short-circuits on the first differing character, which leaks how much of a
 * guess was right. Length is compared after the loop for the same reason.
 */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Log security violations from server-side wrappers (lib/withRateLimit.ts,
 * lib/withCsrf.ts).
 *
 * @public-endpoint: a violation is by definition recorded when the caller has
 * failed some check, which frequently means no session exists yet (blocked
 * origin, CSRF failure, rate limit hit before sign-in). Requiring a user
 * session here would drop exactly the events worth recording. Abuse is bounded
 * by a shared key: the mutation rejects any call whose `key` does not equal the
 * SECURITY_LOG_KEY Convex env var, and that value lives only on the Next.js
 * server (Doppler or .env.local), never in the browser bundle. So the write
 * primitive is reachable from our own server, not from anyone who knows the
 * deployment URL. It attaches the caller's user id only when one happens to
 * exist, and never accepts a caller-supplied id, so events cannot be
 * attributed to someone else.
 *
 * Fail closed: if SECURITY_LOG_KEY is not set in Convex env, every call is
 * rejected. The wrappers catch the error and log to the server console, so an
 * unconfigured key costs you the dashboard trail, not availability. /install
 * and /deploy-to-prod set it; see README "Retention and Limits".
 *
 * Defence in depth stays in place in case the key leaks (it is a server-side
 * secret, and secrets leak):
 *   - logSecurity() caps every field (convex/lib/securityLogger.ts) and
 *     sanitizes PII.
 *   - listSecurityEvents and getSecuritySummary read a bounded window via
 *     .take(), so a flood degrades signal rather than breaking the dashboard.
 *   - pruneExpiredSecurityEvents (daily cron, convex/crons.ts) deletes rows
 *     older than RETENTION_DAYS, so storage is bounded.
 * There is still no rate limit on this mutation: with the key, the only
 * caller is our own server, so a flood of rows means a flood of real
 * violations, which is the signal the table exists to carry.
 *
 * (Earlier versions of this comment asserted controls that did not exist:
 * first "only callable from localhost in development", then "rows are
 * size-capped and the dashboard queries are paginated", written at a point
 * when neither was true. Both were caught by assessment, not by review. If you
 * add a claim here, implement it in the same commit.)
 */
export const logSecurityViolation = mutation({
  args: {
    key: v.string(),
    eventType: eventTypeValidator,
    severity: severityValidator,
    metadata: metadataValidator,
  },
  returns: v.id("securityEvents"),
  handler: async (ctx, args) => {
    const expected = process.env.SECURITY_LOG_KEY;
    if (!expected) {
      throw new Error(
        "SECURITY_LOG_KEY is not set in Convex env; refusing to log. Run `npx convex env set SECURITY_LOG_KEY <value>` with the same value the Next.js server holds."
      );
    }
    if (!timingSafeEqual(args.key, expected)) {
      throw new Error("Invalid SECURITY_LOG_KEY");
    }

    // Try to get authenticated user if available
    const user = await getCurrentUser(ctx);

    // Use the security logger library for PII sanitization and consistent logging
    const eventId = await logSecurity(
      ctx,
      user?._id,  // undefined if not authenticated
      args.eventType as SecurityEventType,
      args.severity as SecuritySeverity,
      {
        endpoint: args.metadata.endpoint || "unknown",
        origin: args.metadata.origin,
        ipAddress: args.metadata.ipAddress,
        fingerprint: args.metadata.fingerprint,
        errorMessage: args.metadata.errorMessage,
        endUserEmail: args.metadata.endUserEmail,
        endUserName: args.metadata.endUserName,
        endUserId: args.metadata.endUserId,
        actionType: args.metadata.actionType,
        requestPayload: args.metadata.requestPayload,
      }
    );

    return eventId;
  },
});

/**
 * Retention for the security log.
 *
 * Rows older than RETENTION_DAYS are deleted by a daily cron (convex/crons.ts).
 * If the shared key gating logSecurityViolation ever leaks, the table is
 * attacker-growable; retention is what bounds storage over time. Deletion runs
 * in fixed-size batches and reschedules itself while rows remain, so each
 * transaction stays well under Convex's read/write limits regardless of how
 * large the backlog is, and a one-off flood is drained over several runs
 * instead of one oversized one.
 *
 * PRUNE_BATCH is a byte budget expressed in rows: at the ~6 KB worst-case row
 * (see SCAN_CEILING), 200 rows is ~1.2 MB read, far under the 8 MiB limit, so
 * a batch of attacker-fattened rows cannot wedge the cron on the same rows
 * forever.
 */
const RETENTION_DAYS = 90;
const PRUNE_BATCH = 200;

export const pruneExpiredSecurityEvents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expired = await ctx.db
      .query("securityEvents")
      .withIndex("byTimestamp", (q) => q.lt("timestamp", cutoff))
      .take(PRUNE_BATCH);

    for (const event of expired) {
      await ctx.db.delete(event._id);
    }

    if (expired.length === PRUNE_BATCH) {
      // More to do: continue in a fresh transaction rather than growing this one.
      await ctx.scheduler.runAfter(0, internal.security.pruneExpiredSecurityEvents, {});
    }

    return expired.length;
  },
});
