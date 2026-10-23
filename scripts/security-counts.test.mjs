import { test } from "node:test";
import assert from "node:assert/strict";
import { HOUR_MS, bump, countKey, hourStart, parseKey, summarize } from "../convex/lib/securityCounts.ts";

test("hourStart floors to the UTC hour", () => {
  const t = Date.UTC(2026, 9, 23, 13, 42, 7, 123);
  assert.equal(hourStart(t), Date.UTC(2026, 9, 23, 13));
  assert.equal(hourStart(hourStart(t)), hourStart(t));
  assert.equal(hourStart(t + HOUR_MS) - hourStart(t), HOUR_MS);
});

test("countKey and parseKey round-trip, including types containing colons", () => {
  const key = countKey("rate_limit_exceeded", "medium");
  assert.deepEqual(parseKey(key), { eventType: "rate_limit_exceeded", severity: "medium" });
  assert.deepEqual(parseKey(countKey("a:b", "high")), { eventType: "a:b", severity: "high" });
});

test("bump adds, subtracts, and removes zeroed keys without mutating its input", () => {
  const start = { "x:low": 2 };
  const up = bump(start, "x:low", 1);
  assert.deepEqual(up, { "x:low": 3 });
  assert.deepEqual(start, { "x:low": 2 });
  assert.deepEqual(bump(up, "y:high", 1), { "x:low": 3, "y:high": 1 });
  assert.deepEqual(bump(up, "x:low", -3), {});
  assert.deepEqual(bump(up, "x:low", -5), {});
});

test("summarize folds buckets exactly and honours the eventType filter", () => {
  const buckets = [
    { hour: 0, counts: { "csrf_validation_failed:critical": 2, "rate_limit_exceeded:medium": 5 }, unread: { "csrf_validation_failed:critical": 1 } },
    { hour: HOUR_MS, counts: { "rate_limit_exceeded:medium": 1, "xss_attempt:high": 1, "suspicious_activity:low": 4 }, unread: { "rate_limit_exceeded:medium": 1, "xss_attempt:high": 1 } },
  ];
  const all = summarize(buckets);
  assert.deepEqual(all, {
    totalEvents: 13,
    unreadCount: 3,
    criticalCount: 2,
    highCount: 1,
    mediumCount: 6,
    lowCount: 4,
    eventTypeBreakdown: { csrf_validation_failed: 2, rate_limit_exceeded: 6, xss_attempt: 1, suspicious_activity: 4 },
  });
  const only = summarize(buckets, "rate_limit_exceeded");
  assert.deepEqual(only, {
    totalEvents: 6,
    unreadCount: 1,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 6,
    lowCount: 0,
    eventTypeBreakdown: { rate_limit_exceeded: 6 },
  });
  assert.equal(summarize([]).totalEvents, 0);
});
