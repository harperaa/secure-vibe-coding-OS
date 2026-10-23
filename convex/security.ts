/**
 * Security monitoring queries and mutations
 * Provides dashboard with security event data and analytics
 */

import { v } from "convex/values";
import { IndexRange, paginationOptsValidator, paginationResultValidator } from "convex/server";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrowForMutation, isCurrentUserAdmin, isCurrentUserAdminMutation } from "./users";
import { Id } from "./_generated/dataModel";
import {
  activeRebuild,
  adjustSecurityCounts,
  deleteSecurityEvent,
  eventTypeValidator,
  hourStart,
  logSecurity,
  metadataValidator,
  SecurityEventType,
  SecuritySeverity,
  setSecurityEventRead,
  severityValidator,
  summarize,
} from "./lib/securityLogger";

/**
 * Index-backed, filtered, time-bounded, newest-first query over securityEvents.
 *
 * The feed offers three optional filters. Each combination has its own index
 * ending in timestamp (see convex/schema.ts), so the query is always a single
 * index range: the time bounds become a range on the index's last field and
 * no row is filtered in JavaScript. Paired with .paginate() the read is one
 * page of matching rows, whatever the table size, which is what keeps the
 * admin's security view available under exactly the flood it exists to show.
 * (Earlier versions read a window of the newest N rows and filtered in JS;
 * that was bounded but could truthfully show "no critical events" when the
 * window held none, so the ceiling is gone rather than lowered.)
 */
function filteredEvents(
  ctx: QueryCtx,
  f: {
    eventType?: string;
    severity?: "critical" | "high" | "medium" | "low";
    isRead?: boolean;
    startTime?: number;
    endTime?: number;
  }
) {
  const t = ctx.db.query("securityEvents");
  // Range on the trailing timestamp field, applied after the equality prefix.
  // Typed structurally because Convex's builder type changes after each call.
  type Upper = IndexRange & { lte(field: "timestamp", value: number): IndexRange };
  type Lower = IndexRange & {
    gte(field: "timestamp", value: number): Upper;
    lte(field: "timestamp", value: number): IndexRange;
  };
  const time = (q: Lower): IndexRange => {
    if (f.startTime !== undefined && f.endTime !== undefined)
      return q.gte("timestamp", f.startTime).lte("timestamp", f.endTime);
    if (f.startTime !== undefined) return q.gte("timestamp", f.startTime);
    if (f.endTime !== undefined) return q.lte("timestamp", f.endTime);
    return q;
  };
  const { eventType: ty, severity: sv, isRead: rd } = f;
  const eventType = ty as SecurityEventType | undefined;
  const q =
    eventType !== undefined && sv !== undefined && rd !== undefined
      ? t.withIndex("byTypeSeverityReadTime", (q) => time(q.eq("eventType", eventType).eq("severity", sv).eq("isRead", rd)))
      : eventType !== undefined && sv !== undefined
        ? t.withIndex("byTypeSeverityTime", (q) => time(q.eq("eventType", eventType).eq("severity", sv)))
        : eventType !== undefined && rd !== undefined
          ? t.withIndex("byTypeReadTime", (q) => time(q.eq("eventType", eventType).eq("isRead", rd)))
          : sv !== undefined && rd !== undefined
            ? t.withIndex("bySeverityReadTime", (q) => time(q.eq("severity", sv).eq("isRead", rd)))
            : eventType !== undefined
              ? t.withIndex("byTypeTime", (q) => time(q.eq("eventType", eventType)))
              : sv !== undefined
                ? t.withIndex("bySeverityTime", (q) => time(q.eq("severity", sv)))
                : rd !== undefined
                  ? t.withIndex("byReadTime", (q) => time(q.eq("isRead", rd)))
                  : t.withIndex("byTimestamp", (q) => time(q));
  return q.order("desc");
}

// Event type validator - reusable across mutations

/**
 * List security events - ADMIN ONLY
 * Returns all security events across the system
 * Supports optional time range filtering
 */
export const listSecurityEvents = query({
  args: {
    paginationOpts: paginationOptsValidator,
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    eventType: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"))),
    severity: v.optional(v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))),
  },
  returns: paginationResultValidator(
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

    const page = await filteredEvents(ctx, {
      eventType: args.eventType,
      severity: args.severity,
      isRead: args.status === undefined ? undefined : args.status === "closed",
      startTime: args.startTime,
      endTime: args.endTime,
    }).paginate(args.paginationOpts);
    const events = page.page;

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

    return { ...page, page: enrichedEvents };
  },
});

/**
 * Tells the admin dashboard whether SECURITY_LOG_KEY is set in this Convex
 * deployment. logSecurityViolation fails closed without it, which is the right
 * security posture but a silent one: the only other signal is a server-log
 * line on Vercel. The dashboard shows a banner when this returns false.
 */
export const securityLogKeyConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const isAdmin = await isCurrentUserAdmin(ctx);
    if (!isAdmin) return true; // non-admins get no signal either way
    return Boolean(process.env.SECURITY_LOG_KEY);
  },
});

/**
 * Upper bound on hourly count buckets one summary reads. Retention deletes
 * buckets as their last row goes, so the table holds at most
 * (RETENTION_DAYS + a little slack) * 24 buckets; this bound only matters if
 * retention is disabled, in which case the oldest hours fall off the summary
 * rather than the query failing.
 */
const MAX_COUNT_BUCKETS = 24 * 100;

/**
 * Get security summary for dashboard - ADMIN ONLY
 *
 * Exact counts for the window, read from the hourly counters in
 * securityEventCounts rather than from event rows, so the cost is bounded by
 * the number of hours in the window (not by how many events were logged) and
 * the numbers are totals, not a sample. Windows are hour-aligned: startTime is
 * floored to its UTC hour and the aligned value is returned as countsFrom so
 * the UI can say what the totals cover.
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
    countsFrom: v.union(v.number(), v.null()),
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
        countsFrom: null,
      };
    }

    const fromHour = args.startTime !== undefined ? hourStart(args.startTime) : undefined;
    const toHour = args.endTime !== undefined ? hourStart(args.endTime) : undefined;
    const table = ctx.db.query("securityEventCounts");
    const ranged =
      fromHour !== undefined && toHour !== undefined
        ? table.withIndex("byHour", (q) => q.gte("hour", fromHour).lte("hour", toHour))
        : fromHour !== undefined
          ? table.withIndex("byHour", (q) => q.gte("hour", fromHour))
          : toHour !== undefined
            ? table.withIndex("byHour", (q) => q.lte("hour", toHour))
            : table.withIndex("byHour");
    const buckets = await ranged.order("desc").take(MAX_COUNT_BUCKETS);

    return { ...summarize(buckets, args.eventType), countsFrom: fromHour ?? null };
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

    await setSecurityEventRead(ctx, event, true);
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

    await setSecurityEventRead(ctx, event, false);
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
 * PRUNE_BATCH is a byte budget expressed in rows: every caller-supplied field
 * is capped in convex/lib/securityLogger.ts, which puts the worst-case row
 * under ~6 KB, so 200 rows is ~1.2 MB read, far under the 8 MiB limit, and
 * a batch of attacker-fattened rows cannot wedge the cron on the same rows
 * forever.
 */
const RETENTION_DAYS = 90;
const PRUNE_BATCH = 200;

export const pruneExpiredSecurityEvents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    if (await activeRebuild(ctx)) {
      console.log("pruneExpiredSecurityEvents: counters are being rebuilt; skipping this run");
      return 0;
    }

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expired = await ctx.db
      .query("securityEvents")
      .withIndex("byTimestamp", (q) => q.lt("timestamp", cutoff))
      .take(PRUNE_BATCH);

    for (const event of expired) {
      await deleteSecurityEvent(ctx, event); // keeps the hourly counters exact
    }

    if (expired.length === PRUNE_BATCH) {
      // More to do: continue in a fresh transaction rather than growing this one.
      await ctx.scheduler.runAfter(0, internal.security.pruneExpiredSecurityEvents, {});
    }

    return expired.length;
  },
});

/**
 * Rebuilds securityEventCounts from the event rows. Run once when upgrading a
 * deployment whose rows predate the counters, or if a raw write ever bypassed
 * convex/lib/securityLogger.ts:
 *
 *   npx convex run security:rebuildSecurityEventCounts '{}'
 *
 * Paginates through securityEvents oldest-first in bounded batches and
 * reschedules itself with the cursor, so any table size works. Rows written
 * after `upTo` (captured on the first call) are already counted live and are
 * skipped. While the rebuild runs, a marker row in securityCountsRebuild makes
 * deletes and read-state changes on not-yet-scanned rows fail (see
 * adjustSecurityCounts) and the retention cron skip, so the rebuilt totals
 * are exact even under live traffic. Starting a new rebuild while one is
 * running replaces it: the marker's runId changes and the old chain stops at
 * its next step. Buckets are cleared on the first call (bounded: there are at
 * most a few thousand), then rebuilt.
 */
const REBUILD_BATCH = 500;

export const rebuildSecurityEventCounts = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    upTo: v.optional(v.number()),
    runId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const upTo = args.upTo ?? Date.now();
    let runId = args.runId;

    if (args.cursor === undefined) {
      // New run: take over (or create) the marker, then clear buckets.
      runId = `${upTo}-${Math.random().toString(36).slice(2, 10)}`;
      const existing = await activeRebuild(ctx);
      if (existing) await ctx.db.patch(existing._id, { runId, upTo, startedAt: Date.now() });
      else await ctx.db.insert("securityCountsRebuild", { runId, upTo, startedAt: Date.now() });

      const stale = await ctx.db.query("securityEventCounts").take(MAX_COUNT_BUCKETS);
      for (const bucket of stale) await ctx.db.delete(bucket._id);
      if (stale.length === MAX_COUNT_BUCKETS) {
        await ctx.scheduler.runAfter(0, internal.security.rebuildSecurityEventCounts, {
          cursor: null,
          upTo,
          runId,
        });
        return null;
      }
    }

    const marker = await activeRebuild(ctx);
    if (!marker || marker.runId !== runId) {
      console.log("rebuildSecurityEventCounts: superseded by a newer run; stopping");
      return null;
    }

    const page = await ctx.db
      .query("securityEvents")
      .withIndex("byTimestamp", (q) => q.lte("timestamp", upTo))
      .order("asc")
      .paginate({ cursor: args.cursor ?? null, numItems: REBUILD_BATCH });

    for (const event of page.page) {
      await adjustSecurityCounts(ctx, event, 1, event.isRead ? 0 : 1);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.security.rebuildSecurityEventCounts, {
        cursor: page.continueCursor,
        upTo,
        runId,
      });
    } else {
      await ctx.db.delete(marker._id);
      console.log("securityEventCounts rebuilt");
    }
    return null;
  },
});
