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

## Paginated, index-backed reads

The event list is paginated: `listSecurityEvents` takes `paginationOpts` and
the feed uses `usePaginatedQuery` with a "Load more" button, 25 rows at a time.
The feed's three optional filters (event type, severity, open/closed) each map
to an index ending in `timestamp`, one per combination, so a filtered view is a
single index range and no row is filtered in JavaScript. Verified against
100,000 rows: every combination, including a two-page walk by cursor, answered
within CLI start-up time. The field caps above still matter: they keep the
retention batch (200 rows) and any page under Convex's per-transaction budget.

## Missing-key banner

`securityLogKeyConfigured` tells the admin dashboard whether
`SECURITY_LOG_KEY` is set in the Convex deployment. When it is not, the
dashboard shows a red banner with the commands to set it, because the mutation
fails closed and would otherwise be silent.

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

## Where the code lives

The schema fragment, validators, logger, counter helpers, and redactor are in
the `secure-vibe-runtime` package (`packages/secure-vibe-runtime/src/convex`),
published to npm with each release. `convex/lib/*.ts` in the app are re-export
shims. The dashboard queries and mutations in `convex/security.ts` stay in the
app because they carry the app's admin check and function references.

## Rules for contributors

- Never `ctx.db.insert`, `delete`, or `patch(isRead)` on `securityEvents`
  directly. Use `insertSecurityEvent`, `deleteSecurityEvent`, and
  `setSecurityEventRead` so the counters stay exact.
- Keep every metadata field capped. Raising a cap means re-deriving the read
  and delete batch sizes in `convex/security.ts`.
- `scripts/check-convex-auth.mjs` requires every public Convex function to check
  identity or declare itself public with a reason. `logSecurityViolation` is the
  one public endpoint here; its reason is the shared key.
