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
 *   - at most MAX_STARTS_PER_MINUTE new jobs per user per minute, enforced
 *     here in the database function, which is the only place a limit holds
 *     across every Vercel instance (lib/withRateLimit.ts is per-instance)
 *   - listJobs is paginated: the page reads one page via the byUser index and
 *     the browser asks for the next with "Load more", so a list of 10,000
 *     jobs costs the same per read as a list of 10
 *   - clearFinishedJobs deletes in bounded batches that reschedule themselves,
 *     so clearing 5,000 finished jobs cannot exceed one transaction's limits
 * Before the outside call, redactIdentifiers (convex/lib/redact.ts) strips
 * emails, phone numbers, SSNs and record ids from the input, server-side.
 */

import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrowForMutation } from "./users";
import { redactIdentifiers } from "./lib/redact";

const MAX_ATTEMPTS = 5;
const MAX_INPUT_CHARS = 2000;
const MAX_ACTIVE_JOBS = 5;
const MAX_STARTS_PER_MINUTE = 10;
const RECENT_WINDOW = 20; // newest rows read to enforce the two caps above
const CLEAR_BATCH = 200;

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
 * `input` arrives already redacted (see `run`); keep that order when you
 * replace this, and treat the response as untrusted input to validate before
 * saving.
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

    // One bounded read serves both caps. RECENT_WINDOW exceeds both limits,
    // so if the cap is reached it is visible within the window.
    const now = Date.now();
    const recent = await ctx.db
      .query("jobs")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(RECENT_WINDOW);
    const startedLastMinute = recent.filter((j) => j._creationTime > now - 60_000);
    if (startedLastMinute.length >= MAX_STARTS_PER_MINUTE) {
      throw new Error(`Rate limit: at most ${MAX_STARTS_PER_MINUTE} jobs per minute.`);
    }
    const active = recent.filter((j) => j.status === "queued" || j.status === "running");
    if (active.length >= MAX_ACTIVE_JOBS) {
      throw new Error(`You already have ${MAX_ACTIVE_JOBS} jobs in progress; wait for one to finish.`);
    }

    const jobId = await ctx.db.insert("jobs", {
      userId: user._id,
      status: "queued",
      input: args.input,
      attempts: 0,
      updatedAt: now,
    });
    // Scheduling is part of this transaction: if the insert rolls back, so
    // does the schedule, so there is never a run without a row.
    await ctx.scheduler.runAfter(0, internal.jobs.run, { jobId, attempt: 1 });
    return jobId;
  },
});

export const listJobs = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(jobValidator),
  handler: async (ctx, args) => {
    // Empty page, not throw: the page renders before Clerk attaches a token,
    // and an empty list is the right answer for "not signed in yet".
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: "" };
    return await ctx.db
      .query("jobs")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Deletes the caller's finished (done or failed) jobs in bounded batches.
 * The first batch runs in this mutation so the click has visible effect at
 * once; if a batch was full, the rest continues in a scheduled internal
 * mutation that reschedules itself, so the total is unbounded while every
 * transaction stays small. The user id is captured here, under auth, and
 * passed to the internal continuation, which cannot be called from clients.
 */
export const clearFinishedJobs = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrowForMutation(ctx);
    const deleted = await deleteFinishedBatch(ctx, user._id);
    if (deleted === CLEAR_BATCH) {
      await ctx.scheduler.runAfter(0, internal.jobs.clearFinishedJobsBatch, { userId: user._id });
    }
    return null;
  },
});

export const clearFinishedJobsBatch = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deleted = await deleteFinishedBatch(ctx, args.userId);
    if (deleted === CLEAR_BATCH) {
      await ctx.scheduler.runAfter(0, internal.jobs.clearFinishedJobsBatch, { userId: args.userId });
    }
    return null;
  },
});

async function deleteFinishedBatch(ctx: MutationCtx, userId: Id<"users">): Promise<number> {
  let remaining = CLEAR_BATCH;
  for (const status of ["done", "failed"] as const) {
    if (remaining === 0) break;
    const rows = await ctx.db
      .query("jobs")
      .withIndex("byUserStatus", (q) => q.eq("userId", userId).eq("status", status))
      .take(remaining);
    for (const row of rows) await ctx.db.delete(row._id);
    remaining -= rows.length;
  }
  return CLEAR_BATCH - remaining;
}

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
      // Server-side, before anything leaves: never trust the browser to have
      // stripped identifiers. The count is reported so operators can see the
      // redactor working.
      const { text, redactions } = redactIdentifiers(job.input);
      const result = await callExternalService(text, attempt);
      await ctx.runMutation(internal.jobs.finish, {
        jobId,
        status: "done",
        result: redactions > 0 ? `${result}; ${redactions} identifier(s) redacted before the call` : result,
      });
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
