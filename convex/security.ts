/**
 * Security monitoring queries and mutations
 * Provides dashboard with security event data and analytics
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrowForMutation, isCurrentUserAdmin, isCurrentUserAdminMutation } from "./users";
import { Id } from "./_generated/dataModel";
import { logSecurity, SecurityEventType, SecuritySeverity } from "./lib/securityLogger";

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

    // Get ALL security events (no user filtering)
    let events = await ctx.db
      .query("securityEvents")
      .order("desc")
      .collect();

    // Apply time range filter if specified
    if (args.startTime !== undefined || args.endTime !== undefined) {
      events = events.filter(e => {
        if (args.startTime !== undefined && e.timestamp < args.startTime) {
          return false;
        }
        if (args.endTime !== undefined && e.timestamp > args.endTime) {
          return false;
        }
        return true;
      });
    }

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
    // Admin-only access
    const isAdmin = await isCurrentUserAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    // Get ALL events (no user filtering)
    let events = await ctx.db
      .query("securityEvents")
      .collect();

    // Apply time range filter if specified
    if (args.startTime !== undefined || args.endTime !== undefined) {
      events = events.filter(e => {
        if (args.startTime !== undefined && e.timestamp < args.startTime) {
          return false;
        }
        if (args.endTime !== undefined && e.timestamp > args.endTime) {
          return false;
        }
        return true;
      });
    }

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
 * Log a security event (for internal use - requires userId)
 */
export const logSecurityEvent = mutation({
  args: {
    userId: v.id("users"),
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
    const eventId = await ctx.db.insert("securityEvents", {
      userId: args.userId,
      eventType: args.eventType,
      severity: args.severity,
      metadata: args.metadata,
      timestamp: Date.now(),
      isRead: false,
    });

    return eventId;
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
 * Log security violations from middleware (rate limiting, CSRF, etc.)
 * Does NOT require authentication - violations can occur before auth
 *
 * Security: Only callable from localhost in development to prevent abuse
 * Events are logged without userId for anonymous violations
 */
export const logSecurityViolation = mutation({
  args: {
    eventType: eventTypeValidator,
    severity: severityValidator,
    metadata: metadataValidator,
  },
  returns: v.id("securityEvents"),
  handler: async (ctx, args) => {
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
