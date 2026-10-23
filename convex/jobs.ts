/**
 * Background job example: slow work off the request path, with retries.
 *
 * The pattern, end to end:
 *   1. startJob (mutation) saves a "queued" row and returns immediately. The
 *      browser never waits on the outside service.
 *   2. run (internalAction) is scheduled by Convex, marks the row "running",
 *      and makes the slow call. On failure it reschedules itself with
 *      exponential backoff up to MAX_ATTEMPTS, then marks the row "failed".
 *   3. On success the result is saved and the row is marked "done".
 *   4. listJobs (query) is subscribed to by the dashboard page, so each of
 *      those transitions reaches the screen without a refresh.
 *
 * Why an action: mutations and queries are transactions that cannot call
 * fetch() or wait on anything outside Convex. Actions can, and run outside
 * the transaction, so every write below goes through a small internal
 * mutation. That also means an action can die mid-flight (deploy, timeout):
 * `run` re-reads the row and exits if the job already finished, so a
 * duplicate delivery does not double-process it.
 *
 * Bounds, because an authenticated user can still be abusive by accident:
 *   - input is capped at MAX_INPUT_CHARS
 *   - at most MAX_ACTIVE_JOBS queued/running jobs per user
 *   - listJobs reads at most LIST_LIMIT rows via the byUser index
 * There is no retention for finished jobs; copy pruneExpiredSecurityEvents
 * (convex/security.ts) if your table grows without bound.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrowForMutation } from "./users";

const MAX_ATTEMPTS = 5;
const MAX_INPUT_CHARS = 2000;
const MAX_ACTIVE_JOBS = 5;
const LIST_LIMIT = 20;

/** 1s, 2s, 4s, 8s, 16s: enough to ride out a brief outage, not an afternoon. */
function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 30_000);
}

const jobStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed")
);

const jobValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  status: jobStatusValidator,
  input: v.string(),
  result: v.optional(v.string()),
  error: v.optional(v.string()),
  attempts: v.number(),
  updatedAt: v.number(),
});

/**
 * Stand-in for the slow outside call: an AI model, a PDF or signal processor,
 * a third-party API. Replace the body with your real fetch() and keep the
 * contract: return the result, throw on failure, the caller owns retry.
 *
 * Two things to keep when you replace it:
 *   - Strip anything that must not leave your system (PII, PHI) from `input`
 *     HERE, server-side, before the call. Never rely on the browser to do it.
 *   - Treat the response as untrusted input and validate it before saving.
 *
 * Inputs ending in "!flaky" fail on the first two attempts so the retry path
 * can be watched from the dashboard.
 */
async function callExternalService(input: string, attempt: number): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (input.endsWith("!flaky") && attempt <= 2) {
    throw new Error(`simulated outage on attempt ${attempt}`);
  }
  return `processed ${input.length} characters on attempt ${attempt}`;
}

export const startJob = mutation({
  args: { input: v.string() },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    if (args.input.length > MAX_INPUT_CHARS) {
      throw new Error(`input exceeds ${MAX_INPUT_CHARS} characters`);
    }

    // Bounded read: the same window the dashboard shows.
    const recent = await ctx.db
      .query("jobs")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(LIST_LIMIT);
    const active = recent.filter((j) => j.status === "queued" || j.status === "running");
    if (active.length >= MAX_ACTIVE_JOBS) {
      throw new Error(`You already have ${MAX_ACTIVE_JOBS} jobs in progress; wait for one to finish.`);
    }

    const jobId = await ctx.db.insert("jobs", {
      userId: user._id,
      status: "queued",
      input: args.input,
      attempts: 0,
      updatedAt: Date.now(),
    });
    // Scheduling is part of this transaction: if the insert rolls back, so
    // does the schedule, so there is never a run without a row.
    await ctx.scheduler.runAfter(0, internal.jobs.run, { jobId, attempt: 1 });
    return jobId;
  },
});

export const listJobs = query({
  args: {},
  returns: v.array(jobValidator),
  handler: async (ctx) => {
    // Null, not throw: the page renders before Clerk attaches a token, and an
    // empty list is the right answer for "not signed in yet".
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("jobs")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(LIST_LIMIT);
  },
});

export const get = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.union(jobValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const markRunning = internalMutation({
  args: { jobId: v.id("jobs"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "running",
      attempts: args.attempt,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finish = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: jobStatusValidator,
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      result: args.result,
      error: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const run = internalAction({
  args: { jobId: v.id("jobs"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { jobId, attempt }) => {
    const job: Doc<"jobs"> | null = await ctx.runQuery(internal.jobs.get, { jobId });
    if (!job || job.status === "done" || job.status === "failed") {
      return null; // deleted, or already finished by an earlier delivery
    }

    await ctx.runMutation(internal.jobs.markRunning, { jobId, attempt });

    try {
      const result = await callExternalService(job.input, attempt);
      await ctx.runMutation(internal.jobs.finish, { jobId, status: "done", result });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_ATTEMPTS) {
        // Back to "queued" with the error visible, then try again later.
        await ctx.runMutation(internal.jobs.finish, { jobId, status: "queued", error });
        await ctx.scheduler.runAfter(backoffMs(attempt), internal.jobs.run, {
          jobId,
          attempt: attempt + 1,
        });
      } else {
        await ctx.runMutation(internal.jobs.finish, { jobId, status: "failed", error });
      }
    }
    return null;
  },
});
