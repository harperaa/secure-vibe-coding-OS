import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Loaded the way Convex functions load it: through the convex/lib shim, which
// resolves the installed `secure-vibe-runtime`. The Convex database is replaced
// by the small in-memory fake below, which implements only the calls the
// logger makes.
const {
  logSecurity,
  insertSecurityEvent,
  deleteSecurityEvent,
  setSecurityEventRead,
  adjustSecurityCounts,
} = await import("../convex/lib/securityLogger.ts");

const NOW = Date.UTC(2026, 10, 26, 13, 42, 7);
const HOUR = Date.UTC(2026, 10, 26, 13);
const HOUR_MS = 60 * 60 * 1000;

function fakeCtx() {
  const tables = { securityEvents: [], securityEventCounts: [], securityCountsRebuild: [] };
  const writes = [];
  let nextId = 1;
  const find = (id) => {
    for (const rows of Object.values(tables)) {
      const i = rows.findIndex((row) => row._id === id);
      if (i !== -1) return { rows, i };
    }
    throw new Error(`no document ${id}`);
  };
  const db = {
    insert: async (table, doc) => {
      const _id = `${table}:${nextId++}`;
      tables[table].push({ _id, ...doc });
      writes.push(`insert ${table}`);
      return _id;
    },
    patch: async (id, fields) => {
      const { rows, i } = find(id);
      rows[i] = { ...rows[i], ...fields };
      writes.push(`patch ${id}`);
    },
    delete: async (id) => {
      const { rows, i } = find(id);
      rows.splice(i, 1);
      writes.push(`delete ${id}`);
    },
    query: (table) => ({
      first: async () => tables[table][0] ?? null,
      withIndex: (index, build) => {
        assert.equal(`${table}.${index}`, "securityEventCounts.byHour");
        let hour;
        build({ eq: (field, value) => (assert.equal(field, "hour"), (hour = value)) });
        return {
          unique: async () => {
            const hits = tables[table].filter((row) => row.hour === hour);
            assert.ok(hits.length <= 1, "one bucket per hour");
            return hits[0] ?? null;
          },
        };
      },
    }),
  };
  return { db, tables, writes };
}

const event = (overrides = {}) => ({
  userId: undefined,
  eventType: "rate_limit_exceeded",
  severity: "medium",
  metadata: {},
  timestamp: NOW,
  isRead: false,
  ...overrides,
});

const buckets = (ctx) =>
  ctx.tables.securityEventCounts.map(({ hour, counts, unread }) => ({ hour, counts, unread }));

let consoleLines;

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: NOW });
  consoleLines = [];
  mock.method(console, "log", (...args) => consoleLines.push(args.join(" ")));
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

// ---------------------------------------------------------------------------
// logSecurity: what reaches the audit table
// ---------------------------------------------------------------------------

test("logSecurity stores an unread event stamped with the current time and returns its id", async () => {
  const ctx = fakeCtx();
  const id = await logSecurity(ctx, "users:1", "csrf_validation_failed", "high", {
    endpoint: "/api/example-protected",
    origin: "https://evil.example",
    ipAddress: "203.0.113.7",
    fingerprint: "fp_abc",
    actionType: "submit",
    errorMessage: "token mismatch",
    requestPayload: '{"a":1}',
  });

  assert.equal(ctx.tables.securityEvents.length, 1);
  const { _id, ...stored } = ctx.tables.securityEvents[0];
  assert.equal(_id, id);
  assert.deepEqual(stored, {
    userId: "users:1",
    eventType: "csrf_validation_failed",
    severity: "high",
    timestamp: NOW,
    isRead: false,
    metadata: {
      endpoint: "/api/example-protected",
      origin: "https://evil.example",
      ipAddress: "203.0.113.7",
      fingerprint: "fp_abc",
      actionType: "submit",
      errorMessage: "token mismatch",
      requestPayload: '{"a":1}',
      endUserEmail: undefined,
      endUserName: undefined,
      endUserId: undefined,
    },
  });
  assert.deepEqual(buckets(ctx), [
    { hour: HOUR, counts: { "csrf_validation_failed:high": 1 }, unread: { "csrf_validation_failed:high": 1 } },
  ]);
});

test("logSecurity masks the end user's email, name and id before storing them", async () => {
  const ctx = fakeCtx();
  await logSecurity(ctx, undefined, "unauthorized_access", "high", {
    endUserEmail: "john.doe@example.com",
    endUserName: "John Doe",
    endUserId: "usr_123456789",
  });

  const { metadata } = ctx.tables.securityEvents[0];
  assert.equal(metadata.endUserEmail, "j***e@example.com");
  assert.equal(metadata.endUserName, "J*** (8 chars)");
  assert.equal(metadata.endUserId, "usr_1234***");

  const everything = JSON.stringify(ctx.tables) + consoleLines.join("\n");
  for (const raw of ["john.doe", "John Doe", "usr_123456789"]) {
    assert.ok(!everything.includes(raw), `${raw} must not be stored or printed`);
  }
});

test("logSecurity masking edge cases: short, malformed and blank values", async () => {
  const cases = [
    [{ endUserEmail: "ab@example.com" }, { endUserEmail: "***@example.com" }],
    [{ endUserEmail: "not-an-email" }, { endUserEmail: "***@invalid" }],
    [{ endUserEmail: "@example.com" }, { endUserEmail: "***@invalid" }],
    [{ endUserEmail: "" }, { endUserEmail: undefined }],
    [{ endUserName: "  Ada  " }, { endUserName: "A*** (3 chars)" }],
    [{ endUserName: "   " }, { endUserName: undefined }],
    [{ endUserId: "abc" }, { endUserId: "ab***" }],
    [{ endUserId: "12345678" }, { endUserId: "12***" }],
    [{ endUserId: "123456789" }, { endUserId: "12345678***" }],
  ];
  for (const [input, expected] of cases) {
    const ctx = fakeCtx();
    await logSecurity(ctx, undefined, "suspicious_activity", "low", input);
    const [field, value] = Object.entries(expected)[0];
    assert.equal(ctx.tables.securityEvents[0].metadata[field], value, JSON.stringify(input));
  }
});

test("logSecurity truncates oversized fields and marks the truncation", async () => {
  const ctx = fakeCtx();
  await logSecurity(ctx, undefined, "input_validation_failed", "medium", {
    errorMessage: "e".repeat(2500),
    requestPayload: "p".repeat(2001),
    endpoint: "/".repeat(300),
    origin: "o".repeat(257),
    ipAddress: "1".repeat(1000),
    fingerprint: "f".repeat(1000),
    actionType: "a".repeat(1000),
  });

  const { metadata } = ctx.tables.securityEvents[0];
  assert.equal(metadata.errorMessage, `${"e".repeat(2000)}…[truncated 500 chars]`);
  assert.equal(metadata.requestPayload, `${"p".repeat(2000)}…[truncated 1 chars]`);
  assert.equal(metadata.endpoint, `${"/".repeat(256)}…[truncated 44 chars]`);
  assert.equal(metadata.origin, `${"o".repeat(256)}…[truncated 1 chars]`);
  assert.equal(metadata.ipAddress, `${"1".repeat(256)}…[truncated 744 chars]`);
  assert.equal(metadata.fingerprint, `${"f".repeat(256)}…[truncated 744 chars]`);
  assert.equal(metadata.actionType, `${"a".repeat(256)}…[truncated 744 chars]`);
});

test("logSecurity leaves values exactly at the cap untouched", async () => {
  const ctx = fakeCtx();
  await logSecurity(ctx, undefined, "input_validation_failed", "medium", {
    errorMessage: "e".repeat(2000),
    endpoint: "/".repeat(256),
  });

  const { metadata } = ctx.tables.securityEvents[0];
  assert.equal(metadata.errorMessage, "e".repeat(2000));
  assert.equal(metadata.endpoint, "/".repeat(256));
});

test("logSecurity bounds the stored size of oversized PII fields too", async () => {
  const ctx = fakeCtx();
  await logSecurity(ctx, undefined, "suspicious_activity", "low", {
    endUserEmail: `${"x".repeat(5000)}@example.com`,
    endUserName: "n".repeat(5000),
    endUserId: "i".repeat(5000),
  });

  const { metadata } = ctx.tables.securityEvents[0];
  assert.equal(metadata.endUserId, `${"i".repeat(8)}***`);
  for (const field of ["endUserEmail", "endUserName", "endUserId"]) {
    assert.ok(metadata[field].length < 320, `${field} is ${metadata[field].length} chars`);
  }
});

// ---------------------------------------------------------------------------
// Exact counters: insert / delete / read-state
// ---------------------------------------------------------------------------

test("events in the same hour share one bucket; another hour or key gets its own entry", async () => {
  const ctx = fakeCtx();
  await insertSecurityEvent(ctx, event());
  await insertSecurityEvent(ctx, event({ timestamp: NOW + 60_000 }));
  await insertSecurityEvent(ctx, event({ severity: "critical", isRead: true }));
  await insertSecurityEvent(ctx, event({ timestamp: NOW + HOUR_MS }));

  assert.deepEqual(buckets(ctx), [
    {
      hour: HOUR,
      counts: { "rate_limit_exceeded:medium": 2, "rate_limit_exceeded:critical": 1 },
      unread: { "rate_limit_exceeded:medium": 2 },
    },
    {
      hour: HOUR + HOUR_MS,
      counts: { "rate_limit_exceeded:medium": 1 },
      unread: { "rate_limit_exceeded:medium": 1 },
    },
  ]);
});

test("marking an event read moves only the unread counter, and repeating it changes nothing", async () => {
  const ctx = fakeCtx();
  const id = await insertSecurityEvent(ctx, event());
  const row = () => ctx.tables.securityEvents.find((r) => r._id === id);

  await setSecurityEventRead(ctx, row(), true);
  assert.equal(row().isRead, true);
  assert.deepEqual(buckets(ctx), [{ hour: HOUR, counts: { "rate_limit_exceeded:medium": 1 }, unread: {} }]);

  const writesBefore = ctx.writes.length;
  await setSecurityEventRead(ctx, row(), true);
  assert.equal(ctx.writes.length, writesBefore, "a repeat click must not write");

  await setSecurityEventRead(ctx, row(), false);
  assert.equal(row().isRead, false);
  assert.deepEqual(buckets(ctx), [
    { hour: HOUR, counts: { "rate_limit_exceeded:medium": 1 }, unread: { "rate_limit_exceeded:medium": 1 } },
  ]);
});

test("deleting events decrements the counters and removes the bucket once it is empty", async () => {
  const ctx = fakeCtx();
  const unreadId = await insertSecurityEvent(ctx, event());
  const readId = await insertSecurityEvent(ctx, event({ isRead: true }));
  const row = (id) => ctx.tables.securityEvents.find((r) => r._id === id);

  await deleteSecurityEvent(ctx, row(readId));
  assert.deepEqual(buckets(ctx), [
    { hour: HOUR, counts: { "rate_limit_exceeded:medium": 1 }, unread: { "rate_limit_exceeded:medium": 1 } },
  ]);

  await deleteSecurityEvent(ctx, row(unreadId));
  assert.deepEqual(ctx.tables.securityEvents, []);
  assert.deepEqual(ctx.tables.securityEventCounts, [], "retention must leave no empty buckets behind");
});

test("a decrement for an hour with no bucket does not create one", async () => {
  const ctx = fakeCtx();
  await adjustSecurityCounts(ctx, event(), -1, -1);
  assert.deepEqual(ctx.tables.securityEventCounts, []);
});

// ---------------------------------------------------------------------------
// Counter rebuild in progress
// ---------------------------------------------------------------------------

test("during a rebuild, deletes and read-state changes on already-covered rows are refused", async () => {
  // Convex rolls the whole mutation back when it throws; the fake does not, so
  // each refused operation runs against its own fresh database.
  const operations = [
    (ctx, row) => deleteSecurityEvent(ctx, row),
    (ctx, row) => setSecurityEventRead(ctx, row, true),
    (ctx, row) => adjustSecurityCounts(ctx, row, -1, -1),
    (ctx, row) => adjustSecurityCounts(ctx, row, 0, -1),
  ];
  for (const operation of operations) {
    const ctx = fakeCtx();
    await insertSecurityEvent(ctx, event());
    const row = ctx.tables.securityEvents[0];
    ctx.tables.securityCountsRebuild.push({ _id: "rebuild:1", runId: "r1", upTo: NOW, startedAt: NOW });
    const before = buckets(ctx);

    await assert.rejects(operation(ctx, row), /Security log counters are being rebuilt/);
    assert.deepEqual(buckets(ctx), before, "the counters must not move");
  }
});

test("during a rebuild, new inserts and changes to rows newer than upTo still go through", async () => {
  const ctx = fakeCtx();
  ctx.tables.securityCountsRebuild.push({ _id: "rebuild:1", runId: "r1", upTo: NOW, startedAt: NOW });

  // The rebuild's own +1 for a row it is scanning (timestamp <= upTo).
  await adjustSecurityCounts(ctx, event({ timestamp: NOW - 5 }), 1, 1);
  // A brand-new event logged while the rebuild runs.
  const id = await insertSecurityEvent(ctx, event({ timestamp: NOW + 1 }));
  const row = () => ctx.tables.securityEvents.find((r) => r._id === id);

  await setSecurityEventRead(ctx, row(), true);
  await deleteSecurityEvent(ctx, row());

  assert.deepEqual(buckets(ctx), [
    { hour: HOUR, counts: { "rate_limit_exceeded:medium": 1 }, unread: { "rate_limit_exceeded:medium": 1 } },
  ]);
});
