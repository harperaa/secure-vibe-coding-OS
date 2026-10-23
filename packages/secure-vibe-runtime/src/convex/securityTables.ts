/**
 * Schema fragments and validators for the security log.
 *
 * Apps spread `securityTables` into their own defineSchema() so the three
 * tables, their indexes and their validators are owned by this package: an
 * index or field change ships as a package update followed by the app's
 * normal `npx convex deploy`, not as a hand-edited schema in every app.
 *
 * `securityEvents.userId` references a `users` table the app defines; Convex
 * validates that reference when the app's schema is pushed.
 */
import {
  defineSchema,
  defineTable,
  DataModelFromSchemaDefinition,
  GenericMutationCtx,
  GenericQueryCtx,
  DocumentByName,
} from "convex/server";
import { v, Infer } from "convex/values";

export const eventTypeValidator = v.union(
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
export const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);
export const metadataValidator = v.object({
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
export type SecurityEventType = Infer<typeof eventTypeValidator>;
export type SecuritySeverity = Infer<typeof severityValidator>;
export type SecurityMetadata = Infer<typeof metadataValidator>;

export const securityTables = {
  securityEvents: defineTable({
    userId: v.optional(v.id("users")),
    eventType: eventTypeValidator,
    severity: severityValidator,
    metadata: metadataValidator,
    timestamp: v.number(),
    isRead: v.boolean(),
  })
    .index("byUser", ["userId", "timestamp"])
    .index("bySeverity", ["userId", "severity", "timestamp"])
    .index("byUnread", ["userId", "isRead", "timestamp"])
    // Cross-user, time-ordered access. The three indexes above all lead with
    // userId, so none of them can serve the admin dashboard (all users) or the
    // retention cron (all rows older than a cutoff) without a table scan.
    .index("byTimestamp", ["timestamp"])
    // One index per filter combination the admin feed offers (event type,
    // severity, open/closed), each ending in timestamp, so every filtered
    // view is a single index range read one page at a time. Nothing is
    // filtered in JavaScript, so no over-read window is needed.
    .index("byTypeTime", ["eventType", "timestamp"])
    .index("bySeverityTime", ["severity", "timestamp"])
    .index("byReadTime", ["isRead", "timestamp"])
    .index("byTypeSeverityTime", ["eventType", "severity", "timestamp"])
    .index("byTypeReadTime", ["eventType", "isRead", "timestamp"])
    .index("bySeverityReadTime", ["severity", "isRead", "timestamp"])
    .index("byTypeSeverityReadTime", ["eventType", "severity", "isRead", "timestamp"]),
  securityEventCounts: defineTable({
    hour: v.number(),
    counts: v.record(v.string(), v.number()),
    unread: v.record(v.string(), v.number()),
  }).index("byHour", ["hour"]),
  securityCountsRebuild: defineTable({
    runId: v.string(),
    upTo: v.number(),
    startedAt: v.number(),
  }),
};

/** The three tables as a standalone schema; apps spread `securityTables` instead. */
export const securitySchema = defineSchema(securityTables);
export type SecurityDataModel = DataModelFromSchemaDefinition<typeof securitySchema>;
/**
 * An app's MutationCtx/QueryCtx is assignable to these because its data model
 * is a superset of SecurityDataModel (verified with tsc; no cast needed).
 */
export type SecurityMutationCtx = GenericMutationCtx<SecurityDataModel>;
export type SecurityQueryCtx = GenericQueryCtx<SecurityDataModel>;
export type SecurityEventDoc = DocumentByName<SecurityDataModel, "securityEvents">;
