import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Loading package .ts sources under Node: relative imports use NodeNext-style
// `.js` specifiers that must map back to `.ts` files on disk.
registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (
      specifier.startsWith("./") &&
      specifier.endsWith(".js") &&
      context.parentURL?.includes("/secure-vibe-runtime/src/")
    ) {
      return nextResolve(specifier.replace(/\.js$/, ".ts"), context);
    }
    return nextResolve(specifier, context);
  },
});

process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
process.env.SECURITY_LOG_KEY = "test-key";

const { NextRequest, NextResponse } = await import("next/server.js");
const { withCsrf } = await import("../packages/secure-vibe-runtime/src/withCsrf.ts");

test("a CSRF violation is logged with the proxy-appended IP, not the client-supplied one", async () => {
  const bodies = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    bodies.push(String(init?.body));
    return new Response(JSON.stringify({ status: "success", value: "id" }), {
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const handler = withCsrf(async () => NextResponse.json({ ok: true }));
    const res = await handler(
      new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.7" },
      })
    );
    assert.equal(res.status, 403);
    await new Promise((r) => setTimeout(r, 50)); // the log call is fire-and-forget
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(bodies.length, 1);
  assert.match(bodies[0], /198\.51\.100\.7/);
  assert.doesNotMatch(bodies[0], /203\.0\.113\.99/);
});
