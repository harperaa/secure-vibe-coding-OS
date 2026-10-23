import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Security log retention. Rows older than RETENTION_DAYS (convex/security.ts)
// are deleted in bounded, self-rescheduling batches. logSecurityViolation is
// gated by a shared key, but if that key leaks the table is attacker-growable,
// and even honest traffic grows it forever; this is the upper bound on size.
crons.cron(
  "prune expired security events",
  "17 3 * * *", // daily at 03:17 UTC
  internal.security.pruneExpiredSecurityEvents,
  {},
);

export default crons;
