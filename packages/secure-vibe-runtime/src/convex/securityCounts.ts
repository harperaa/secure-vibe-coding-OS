/**
 * Pure helpers for the security log's exact counters. No Convex imports, so
 * this file is unit-tested directly with node:test (see securityCounts.test.ts).
 *
 * Why counters exist: the dashboard's summary tiles used to be computed from
 * the newest SCAN_CEILING rows in the window, so "Total events" was a lower
 * bound under load, not a count. Reading the whole table to count it is the
 * failure mode the bound was added to avoid. Instead every insert, delete and
 * read-state change updates one small bucket document per UTC hour, keyed by
 * "eventType:severity". A 90-day window is then at most ~2,200 small reads,
 * independent of how many events were logged.
 */

export const HOUR_MS = 60 * 60 * 1000;

/** Start of the UTC hour that contains `timestamp`, in ms. */
export function hourStart(timestamp: number): number {
  return Math.floor(timestamp / HOUR_MS) * HOUR_MS;
}

export function countKey(eventType: string, severity: string): string {
  return `${eventType}:${severity}`;
}

export function parseKey(key: string): { eventType: string; severity: string } {
  const i = key.lastIndexOf(":");
  return { eventType: key.slice(0, i), severity: key.slice(i + 1) };
}

/** Add `delta` to `record[key]`, dropping the key when it reaches zero. */
export function bump(
  record: Record<string, number>,
  key: string,
  delta: number
): Record<string, number> {
  const next = { ...record };
  const value = (next[key] ?? 0) + delta;
  if (value <= 0) delete next[key];
  else next[key] = value;
  return next;
}

export type CountBucket = {
  hour: number;
  counts: Record<string, number>;
  unread: Record<string, number>;
};

export type SecuritySummary = {
  totalEvents: number;
  unreadCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  eventTypeBreakdown: Record<string, number>;
};

/** Fold hourly buckets into the shape the dashboard tiles consume. */
export function summarize(buckets: CountBucket[], eventType?: string): SecuritySummary {
  const summary: SecuritySummary = {
    totalEvents: 0,
    unreadCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    eventTypeBreakdown: {},
  };
  for (const bucket of buckets) {
    for (const [key, n] of Object.entries(bucket.counts)) {
      const { eventType: type, severity } = parseKey(key);
      if (eventType !== undefined && type !== eventType) continue;
      summary.totalEvents += n;
      summary.eventTypeBreakdown[type] = (summary.eventTypeBreakdown[type] ?? 0) + n;
      if (severity === "critical") summary.criticalCount += n;
      else if (severity === "high") summary.highCount += n;
      else if (severity === "medium") summary.mediumCount += n;
      else if (severity === "low") summary.lowCount += n;
    }
    for (const [key, n] of Object.entries(bucket.unread)) {
      if (eventType !== undefined && parseKey(key).eventType !== eventType) continue;
      summary.unreadCount += n;
    }
  }
  return summary;
}
