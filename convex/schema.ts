import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";
import { securityTables } from "secure-vibe-runtime/convex";

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

    // Security log tables (securityEvents, securityEventCounts,
    // securityCountsRebuild): owned by the secure-vibe-runtime package so index
    // and field changes ship as a package update. See docs/security/AUDIT_LOGGING.md.
    ...securityTables,

    // Background job example (convex/jobs.ts): one row per job. The browser
    // subscribes to listJobs, so every status change below streams to the
    // screen without a refresh. updatedAt is in the index so the newest
    // activity sorts first.
    jobs: defineTable({
      userId: v.id("users"),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("done"),
        v.literal("failed")
      ),
      input: v.string(),
      result: v.optional(v.string()),
      error: v.optional(v.string()),
      attempts: v.number(),
      updatedAt: v.number(),
    })
      .index("byUser", ["userId", "updatedAt"])
      // clearFinishedJobs deletes one status at a time in bounded batches.
      .index("byUserStatus", ["userId", "status", "updatedAt"]),
  });