import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no package exports map, so plain Node cannot resolve the bare
// `next/server`; and withCsrf.ts imports its sibling without an extension.
registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "./csrf") return nextResolve("./csrf.ts", context);
    return nextResolve(specifier, context);
  },
});

process.env.CSRF_SECRET = "test-only-csrf-secret-0123456789abcdef";
delete process.env.NEXT_PUBLIC_CONVEX_URL; // no security-log network calls

const { NextRequest, NextResponse } = await import("next/server");
const { generateCsrfToken } = await import("../packages/secure-vibe-runtime/src/csrf.ts");
const { withCsrf } = await import("../packages/secure-vibe-runtime/src/withCsrf.ts");

const handler = withCsrf(async () => NextResponse.json({ ok: true }));

// The session id travels in the same cookie app/api/csrf/route.ts issues it in.
// The CSRF cookie is sent under both names so the test does not depend on
// whether the `__Host-` prefix is in use.
const post = (sessionId, header, cookie) =>
  handler(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": header,
        cookie: `temp-session=${sessionId}; XSRF-TOKEN=${cookie}; __Host-XSRF-TOKEN=${cookie}`,
      },
    })
  );

test("a token is accepted for the session it was issued to", async () => {
  const token = await generateCsrfToken("session-a");
  assert.equal((await post("session-a", token, token)).status, 200);
});

test("a token issued to one session is rejected for another session", async () => {
  const token = await generateCsrfToken("session-a");
  assert.equal((await post("session-b", token, token)).status, 403);
});

test("an equal header/cookie pair minted without CSRF_SECRET is rejected", async () => {
  const forged = "a".repeat(64); // same shape as an issued token, no secret involved
  assert.equal((await post("session-a", forged, forged)).status, 403);
});
