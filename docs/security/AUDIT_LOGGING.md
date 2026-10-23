# Security Log (Audit Logging)

The security log is the `securityEvents` table in Convex, shown to the admin on
`/dashboard/security`. This page states what is written, who can write it, and
what bounds it. Every claim here is implemented in the file named next to it.

## What gets written

`withRateLimit` and `withCsrf` (in `lib/`) call `logSecurityViolation`
(`convex/security.ts`) when a request is refused. Convex code logs through
`logSecurity()` in `convex/lib/securityLogger.ts`. Each row holds an event type,
a severity, a timestamp, a read flag, the acting user when one exists, and a
metadata object whose every field is size-capped (2,000 characters for the two
free-text fields, 256 for the rest) and whose personal data is masked before
insert.

## Who can write

`logSecurityViolation` records failures that happen before a session exists, so
it cannot require a signed-in user. It requires `SECURITY_LOG_KEY` instead: the
Next.js server sends the key, Convex compares it in constant time against its
own env var, and rejects everything else. The key is set by `/install`, mirrored
by `scripts/sync-convex-env.mjs`, required by the `/deploy-to-prod` preflight,
and rotated by `/rotate`. If the env var is unset the mutation fails closed and
the wrappers log `SECURITY_LOG_KEY is not set` to the server console; requests
are not affected.

Treat the table as evidence, not as ground truth: the key is a secret, and the
controls below assume it may leak.

## Retention

A daily cron (`convex/crons.ts`, 03:17 UTC) deletes rows older than
`RETENTION_DAYS` (90, in `convex/security.ts`) in batches of 200, rescheduling
itself until the backlog is gone. Verified against a 100,000-row backlog, which
drained in about 500 seconds. Change the window by editing `RETENTION_DAYS`.

## Bounded reads

The event list reads at most 1,000 rows through the `byTimestamp` index,
limited to the selected time window. That bound is derived from the field caps
above so the read stays under Convex's per-transaction budget even if every row
was written at the cap.

## Exact counts

The summary tiles do not count rows. `securityEventCounts` holds one small
document per UTC hour with counters keyed by `eventType:severity`, maintained
on every insert, delete, and read-state change by the helpers in
`convex/lib/securityLogger.ts`. A summary over any window therefore reads at
most one document per hour in the window and the numbers are totals, not a
sample. Windows are aligned to the hour; the dashboard states the aligned start.

If rows were ever written around those helpers (an import, or an upgrade from
7.2.0 or earlier), rebuild the counters once:

```bash
npx convex run security:rebuildSecurityEventCounts '{}'
```

The rebuild pages through the table in batches of 500 and reschedules itself,
so any table size works; rows written while it runs are counted live and
skipped by the rebuild.

## Rules for contributors

- Never `ctx.db.insert`, `delete`, or `patch(isRead)` on `securityEvents`
  directly. Use `insertSecurityEvent`, `deleteSecurityEvent`, and
  `setSecurityEventRead` so the counters stay exact.
- Keep every metadata field capped. Raising a cap means re-deriving the read
  and delete batch sizes in `convex/security.ts`.
- `scripts/check-convex-auth.mjs` requires every public Convex function to check
  identity or declare itself public with a reason. `logSecurityViolation` is the
  one public endpoint here; its reason is the shared key.
