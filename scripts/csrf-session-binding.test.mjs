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
const { generateCsrfToken, CSRF_HOST_COOKIE } = await import("../packages/secure-vibe-runtime/src/csrf.ts");
const { withCsrf } = await import("../packages/secure-vibe-runtime/src/withCsrf.ts");

const protectedRoute = withCsrf(async () => NextResponse.json({ ok: true }));

// A state-changing request as the browser sends it: the token in the header,
// the token cookie, and the session cookie that /api/csrf issued the token for.
function post({ header, cookie, sessionId, cookieName = "XSRF-TOKEN", sessionCookie = "temp-session" }) {
  return protectedRoute(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": header,
        cookie: `${cookieName}=${cookie}; ${sessionCookie}=${sessionId}`,
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

test("a request without a session cookie is rejected", async () => {
  const token = await generateCsrfToken("session-a");
  const res = await protectedRoute(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "x-csrf-token": token, cookie: `XSRF-TOKEN=${token}` },
    })
  );
  assert.equal(res.status, 403);
});

test("a header that differs from the cookie is rejected", async () => {
  const cookie = await generateCsrfToken("session-a");
  const header = await generateCsrfToken("session-a");
  assert.equal((await post({ header, cookie, sessionId: "session-a" })).status, 403);
});

test("the session cookie is used when there is no temp-session cookie", async () => {
  const token = await generateCsrfToken("session-a");
  const res = await post({ header: token, cookie: token, sessionId: "session-a", sessionCookie: "session" });
  assert.equal(res.status, 200);
});

test("a token issued for the __Host- cookie is accepted there and cleared with Secure", async () => {
  const token = await generateCsrfToken("session-a", CSRF_HOST_COOKIE);
  const res = await post({ header: token, cookie: token, sessionId: "session-a", cookieName: CSRF_HOST_COOKIE });
  assert.equal(res.status, 200);
  const cleared = res.headers.get("set-cookie");
  assert.match(cleared, /^__Host-XSRF-TOKEN=;/);
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Secure/);
});

test("a token issued for the __Host- cookie is rejected when planted in the plain cookie", async () => {
  // What a sibling subdomain can do: get its own token and session from
  // /api/csrf, then set both as plain cookies on the victim's browser.
  const token = await generateCsrfToken("session-attacker", CSRF_HOST_COOKIE);
  const res = await post({ header: token, cookie: token, sessionId: "session-attacker" });
  assert.equal(res.status, 403);
});

test("the __Host- cookie wins over a planted plain cookie", async () => {
  const victim = await generateCsrfToken("session-victim", CSRF_HOST_COOKIE);
  const planted = await generateCsrfToken("session-victim");
  const res = await protectedRoute(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": planted,
        cookie: `XSRF-TOKEN=${planted}; ${CSRF_HOST_COOKIE}=${victim}; temp-session=session-victim`,
      },
    })
  );
  assert.equal(res.status, 403);
});
