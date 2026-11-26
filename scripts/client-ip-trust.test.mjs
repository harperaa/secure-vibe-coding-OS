import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

// Package sources import `next/server.js`, which plain Node can resolve.
const { NextRequest, NextResponse } = await import("next/server.js");
const { clientIp, withRateLimit } = await import("../packages/secure-vibe-runtime/src/withRateLimit.ts");

// Addresses from the documentation ranges (RFC 5737, RFC 3849), never real clients.
const request = (headers) => new NextRequest("http://localhost/api/test", { headers });
const ok = async () => NextResponse.json({ ok: true });

const originalVercel = process.env.VERCEL;
afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

test("off Vercel, a client-sent x-vercel-forwarded-for is ignored", () => {
  delete process.env.VERCEL;
  const ip = clientIp(request({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "203.0.113.10" }));
  assert.equal(ip, "203.0.113.10");
});

test("off Vercel, rotating x-vercel-forwarded-for does not get a fresh bucket", async () => {
  delete process.env.VERCEL;
  const handler = withRateLimit(ok);
  const statuses = [];
  for (let i = 1; i <= 6; i++) {
    const res = await handler(request({ "x-vercel-forwarded-for": `198.51.100.${i}`, "x-forwarded-for": "203.0.113.11" }));
    statuses.push(res.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});

test("the rightmost x-forwarded-for entry wins over a client-sent entry on its left", () => {
  delete process.env.VERCEL;
  assert.equal(clientIp(request({ "x-forwarded-for": "198.51.100.8, 203.0.113.12" })), "203.0.113.12");
});

test("an invalid rightmost entry fails closed instead of falling back to the left", () => {
  delete process.env.VERCEL;
  for (const xff of ["203.0.113.13, not-an-ip", "203.0.113.13, ", "203.0.113.13, " + "1".repeat(46)]) {
    assert.equal(clientIp(request({ "x-forwarded-for": xff })), null, xff);
  }
});

test("IPv6 entries are accepted", () => {
  delete process.env.VERCEL;
  assert.equal(clientIp(request({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
});

test("without x-forwarded-for, a valid x-real-ip is still used and an invalid one is not", () => {
  delete process.env.VERCEL;
  assert.equal(clientIp(request({ "x-real-ip": "203.0.113.14" })), "203.0.113.14");
  assert.equal(clientIp(request({ "x-real-ip": "203.0.113.14; drop" })), null);
});

test("on Vercel (VERCEL=1), x-vercel-forwarded-for keeps its place first", () => {
  process.env.VERCEL = "1";
  const ip = clientIp(request({ "x-vercel-forwarded-for": "203.0.113.15", "x-forwarded-for": "203.0.113.16" }));
  assert.equal(ip, "203.0.113.15");
});

test("no headers: null, so the caller fails closed", () => {
  delete process.env.VERCEL;
  assert.equal(clientIp(request({})), null);
});
