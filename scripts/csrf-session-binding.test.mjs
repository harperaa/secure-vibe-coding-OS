import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no package exports map, so outside the Next bundler plain Node
// cannot resolve the bare `next/server` that withCsrf.ts imports, and the
// package sources import each other without a file extension.
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

const protectedRoute = withCsrf(async () => NextResponse.json({ ok: true }));

// A state-changing request as the browser sends it: the token in the header,
// the token cookie, and the session cookie that /api/csrf issued the token for.
function post({ header, cookie, sessionId }) {
  return protectedRoute(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": header,
        cookie: `XSRF-TOKEN=${cookie}; temp-session=${sessionId}`,
      },
    })
  );
}

test("a token is accepted for the session it was issued to", async () => {
  const token = await generateCsrfToken("session-a");
  assert.equal((await post({ header: token, cookie: token, sessionId: "session-a" })).status, 200);
});

test("a token issued for one session is rejected for another session", async () => {
  const token = await generateCsrfToken("session-attacker");
  const res = await post({ header: token, cookie: token, sessionId: "session-victim" });
  assert.equal(res.status, 403, "token issued for session-attacker validated for session-victim");
});

test("a value minted without CSRF_SECRET is rejected even when header and cookie match", async () => {
  const forged = "a".repeat(64); // same shape as a real token, no secret involved
  const res = await post({ header: forged, cookie: forged, sessionId: "session-victim" });
  assert.equal(res.status, 403, "an arbitrary matching header/cookie pair passed CSRF validation");
});
