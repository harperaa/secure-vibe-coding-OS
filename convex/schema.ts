import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
      // Primary email from Clerk
      email: v.optional(v.string()),
    })
      .index("byExternalId", ["externalId"])
      .index("byEmail", ["email"]),

    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),

    // Security monitoring table
    // userId is optional to allow logging violations from unauthenticated requests
    securityEvents: defineTable({
      userId: v.optional(v.id("users")),
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
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
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
      .index("byUser", ["userId", "timestamp"])
      .index("bySeverity", ["userId", "severity", "timestamp"])
      .index("byUnread", ["userId", "isRead", "timestamp"]),
  });