import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no package exports map, so outside the Next bundler plain Node
// cannot resolve the bare `next/server` that withRateLimit.ts imports. Point it
// at the file before loading the module under test.
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context),
});
const { NextRequest, NextResponse } = await import("next/server");
const { withRateLimit } = await import("../packages/secure-vibe-runtime/src/withRateLimit.ts");

// Each test uses its own IP so the module-level buckets do not leak between tests.
const request = (ip) => new NextRequest("http://localhost/api/test", { headers: { "x-real-ip": ip } });
const ok = async () => NextResponse.json({ ok: true });

async function statuses(handler, ip, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((await handler(request(ip))).status);
  return out;
}

test("without options the default 5-per-minute limit applies", async () => {
  assert.deepEqual(await statuses(withRateLimit(ok), "192.0.2.1", 6), [200, 200, 200, 200, 200, 429]);
});

test("routes without options share the default bucket", async () => {
  const a = withRateLimit(ok);
  const b = withRateLimit(ok);
  await statuses(a, "192.0.2.2", 5);
  assert.equal((await b(request("192.0.2.2"))).status, 429);
});

test("a route with options gets its own limit and its own bucket", async () => {
  const shared = withRateLimit(ok);
  const busy = withRateLimit(ok, { points: 8, duration: 60 });
  await statuses(shared, "192.0.2.3", 5);
  assert.equal((await shared(request("192.0.2.3"))).status, 429);
  assert.deepEqual(await statuses(busy, "192.0.2.3", 9), [200, 200, 200, 200, 200, 200, 200, 200, 429]);
});

test("routes with the same options share one bucket", async () => {
  const a = withRateLimit(ok, { points: 3, duration: 60 });
  const b = withRateLimit(ok, { points: 3, duration: 60 });
  await statuses(a, "192.0.2.4", 3);
  assert.equal((await b(request("192.0.2.4"))).status, 429);
});

test("options equal to the default share the default bucket", async () => {
  const plain = withRateLimit(ok);
  await statuses(plain, "192.0.2.5", 5);
  for (const opts of [{}, { points: 5 }, { duration: 60 }, { points: 5, duration: 60 }]) {
    assert.equal((await withRateLimit(ok, opts)(request("192.0.2.5"))).status, 429, JSON.stringify(opts));
  }
});

test("invalid options fail when the route is wrapped, not on the first request", () => {
  const invalid = [
    { points: 0 }, { points: -1 }, { points: 2.5 }, { points: Infinity }, { points: "10" },
    { duration: 0 }, { duration: Number.NaN }, { duration: 3_000_000 },
  ];
  for (const opts of invalid) {
    assert.throws(() => withRateLimit(ok, opts), /must be an integer from 1 to/, String(opts.points ?? opts.duration));
  }
  // The largest window the timer can hold is still accepted.
  assert.doesNotThrow(() => withRateLimit(ok, { duration: 2_147_483 }));
});
