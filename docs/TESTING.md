# Testing

How the tests in this repo run, how to write new ones, and which parts of the
code have no tests yet.

## Running the tests

```bash
npm test          # node --test scripts/*.test.mjs
npm run lint
npm run typecheck
```

CI runs `npm run test` in the `test` job of `.github/workflows/ci.yml`. The
security and build jobs only start once it passes.

No coverage tool is configured. Gaps are found by comparing source files with
the tests that import them (see [Known gaps](#known-gaps)).

## Writing a test

- Tests live in `scripts/*.test.mjs` and use Node's built-in runner
  (`node:test`, `node:assert/strict`). There is no Jest or Vitest.
- Node 24 strips TypeScript types, so a test can import a `.ts` source
  directly, e.g. `../packages/secure-vibe-runtime/src/convex/redact.ts` in
  `scripts/redact.test.mjs`.
- Files that import `next/server` need a resolve hook first, because `next`
  has no exports map. Copy the `registerHooks` block from
  `scripts/validation.test.mjs` and load the module with `await import(...)`
  after it.
- Scripts that call a CLI (`doppler`, `gh`, `npx`, `vercel`, `npm`) are tested
  as subprocesses with a fake CLI on `PATH`. Build that `PATH` with
  `isolatedTestPath(stubDirs, t)` from `scripts/lib/isolated-test-path.mjs`:
  your stub directories come first, then a scratch folder holding only `node`
  and `npm`, then `/usr/bin:/bin`, so no real developer CLI can be reached.
  `scripts/vercel-env-doppler.test.mjs` and
  `scripts/convex-setup-doppler.test.mjs` show the pattern.
- Never put a real secret in a test. Use obvious fakes and assert that they do
  not appear in output.

## Known gaps

From the test coverage review of 2026-11-26 (issue #83), most important first.
The PR from that review adds tests for the runtime secrets loader, the
`/api/revalidate-secrets` auth check and the security logger. When you close a
gap, remove it from this list in the same PR.

### 1. Convex functions: auth, admin checks, payments

`convex/users.ts`, `convex/security.ts`, `convex/paymentAttempts.ts`.

No test runs a Convex query or mutation. **This needs a decision before any
test is written:** `convex-test` is not a dependency, and the handlers cannot
be called from plain `node:test` without it or a hand-written fake `ctx`.
Adding `convex-test` means a new dev dependency (run `npm audit` and respect
the `min-release-age` cooldown in `.npmrc`).

Cases to cover:

- `isCurrentUserAdmin` / `isCurrentUserAdminMutation`: throw when
  `ADMIN_EMAIL` is unset; false when signed out, when the user has no email,
  and for a non-admin; true on a case-insensitive match.
- `getCurrentUserOrThrow`: throws when signed out and when the user row is
  missing. `getCurrentUserOrThrowForMutation`: creates the row once and reuses
  it.
- `upsertFromClerk`: inserts, then patches the same row; picks the primary
  email out of several. `deleteFromClerk` on an unknown id does not throw.
- `savePaymentAttempt`: a repeated `payment_id` updates instead of inserting a
  duplicate; `userId` is linked when the payer exists and left unset when not.
- `convex/security.ts`: `listSecurityEvents`, `getSecuritySummary`,
  `markEventAsRead` and `markEventAsUnread` reject non-admins.
  `logSecurityViolation` throws when `SECURITY_LOG_KEY` is unset in Convex and
  when the key is wrong. `pruneExpiredSecurityEvents` skips while a rebuild is
  active and keeps the counters exact. `rebuildSecurityEventCounts` ends with
  the same totals as a fresh count.

### 2. Dependency audit gate

`scripts/audit-gate.mjs` is the CI security gate and has no test.

The script reads `audit-allowlist.json` from its own directory, so copy it into
a temporary directory next to a test allowlist and run it there, with a fake
`npm` (that prints a canned `npm audit --json` report) first on `PATH` via
`isolatedTestPath`.

Cases to cover:

- exit 0 on an empty report and on findings below high.
- exit 1 on a high or critical finding that is not allowlisted.
- an allowlisted GHSA is skipped, and so is a package that is vulnerable only
  through it, in either object order.
- a second, non-allowlisted advisory on an allowlisted package still fails.
- exit 2 on `{"error": ...}` output and on an allowlist entry with a bad id or
  an empty reason.
- empty stdout: exit 2 only when `npm` also exits non-zero. If `npm` exits 0
  with empty stdout, `JSON.parse("")` throws and Node exits 1 with a stack
  trace. CI still fails, but a test should pin down which code is intended.

### 3. Payment webhook mapping

`convex/paymentAttemptTypes.ts` and `convex/http.ts`.

`transformWebhookData` is a pure function and imports only `convex/values`, so
it can be tested from `node:test` today.

Cases to cover:

- a full Clerk `paymentAttempt.updated` payload maps to an object that
  `paymentAttemptDataValidator` accepts, with unknown extra fields dropped.
- `failed_at`, `paid_at` and `failed_reason` given as `null` or `0` become
  `undefined` (the mapper uses `|| undefined`).
- a payload missing `payer`, `payment_source`, `totals` or
  `subscription_items` throws a `TypeError`. This documents current
  behaviour: the webhook answers 500 and Clerk retries.
- the HTTP route (needs the Convex decision in gap 1): a bad signature returns
  400 and runs no mutation; an unknown event type returns 200.

### 4. Error responses

`lib/errorHandler.ts` imports `next/server`, so use the `registerHooks` block
described above.

Cases to cover:

- with `NODE_ENV=production`, `handleApiError` returns the generic body and
  never the message or stack.
- with `NODE_ENV=development`, it includes message, stack and context.
- a non-`Error` value is reported as "Unknown error".
- status codes and bodies of `handleValidationError` (400),
  `handleUnauthorizedError` (401), `handleForbiddenError` (403) and
  `handleNotFoundError` (404), including that `details` is omitted when not
  passed.

### 5. Deployment scripts

`scripts/vercel-prebuild.mjs`, `scripts/sync-convex-env.mjs`,
`scripts/check-convex-auth.mjs`. These move secrets between Doppler, Convex and
Vercel and are only partly exercised by the existing fake-CLI tests.

Cases to cover:

- `vercel-prebuild.mjs`: exits 0 and does nothing without `DOPPLER_TOKEN`;
  exits non-zero when the Doppler fetch fails; secret values are never
  printed.
- `sync-convex-env.mjs`: only keys in `CONVEX_ALLOWLIST` are pushed; a failing
  `npx convex env set` stops the run with a non-zero exit; values go through
  stdin, not argv.
- `check-convex-auth.mjs`: exits 0 when clean and 1 on any violation. The two
  kinds of violation (no identity check and no `@public-endpoint`; a
  `@public-endpoint` whose reason is missing or too short) share exit 1 and
  differ only in the message, also available as `findings[].reason` with
  `--json`. The header documents exit 2 for a script or usage error, but no
  code path exits 2 today.
