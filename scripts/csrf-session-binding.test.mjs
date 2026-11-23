import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Everything is loaded the way the app loads it: through the lib/ shims, which
// resolve the `secure-vibe-runtime` dependency in node_modules. A dependency
// that still has the equality-only check therefore fails these tests.
//
// Plain Node needs three things the Next bundler does on its own: `next` has no
// exports map, the `@/` alias is a tsconfig path, and the package's compiled
// files import each other without an extension.
const shim = new URL("../lib/csrf.ts", import.meta.url).href;
registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/csrf") return nextResolve(shim, context);
    if (
      /^\.\/[\w/]+$/.test(specifier) &&
      context.parentURL?.includes("/secure-vibe-runtime/dist/")
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    return nextResolve(specifier, context);
  },
});

process.env.CSRF_SECRET = "test-only-csrf-secret-0123456789abcdef";
delete process.env.NEXT_PUBLIC_CONVEX_URL; // no security-log network calls

const { NextRequest, NextResponse } = await import("next/server");
const { generateCsrfToken } = await import("../lib/csrf.ts");
const { withCsrf } = await import("../lib/withCsrf.ts");
const { GET: issueToken } = await import("../app/api/csrf/route.ts");

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

test("a token with a tampered random part is rejected", async () => {
  const token = await generateCsrfToken("session-a");
  const tampered = (token[0] === "0" ? "1" : "0") + token.slice(1);
  assert.equal((await post("session-a", tampered, tampered)).status, 403);
});

test("a request without a session cookie is rejected", async () => {
  const token = await generateCsrfToken("session-a");
  const response = await handler(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "x-csrf-token": token, cookie: `XSRF-TOKEN=${token}` },
    })
  );
  assert.equal(response.status, 403);
});

test("in production the token lives in a __Host- cookie and a planted XSRF-TOKEN is ignored", async (t) => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  t.after(() => {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  });

  // The victim gets a token from the real route.
  const issued = await issueToken(new NextRequest("https://app.example/api/csrf"));
  const { csrfToken } = await issued.json();
  const cookie = issued.cookies.get("__Host-XSRF-TOKEN");
  assert.equal(cookie?.value, csrfToken);
  assert.equal(issued.cookies.get("XSRF-TOKEN"), undefined);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.path, "/");
  assert.equal(cookie.domain, undefined);
  const session = issued.cookies.get("temp-session").value;

  const send = (header, cookies) =>
    handler(
      new NextRequest("https://app.example/api/test", {
        method: "POST",
        headers: { "x-csrf-token": header, cookie: cookies },
      })
    );

  const accepted = await send(csrfToken, `temp-session=${session}; __Host-XSRF-TOKEN=${csrfToken}`);
  assert.equal(accepted.status, 200);
  // Single use: the cookie is cleared, with Secure so the browser honours it.
  const cleared = accepted.cookies.get("__Host-XSRF-TOKEN");
  assert.equal(cleared.value, "");
  assert.equal(cleared.secure, true);

  // A sibling subdomain can only plant the unprefixed cookie. Even with a
  // genuine token of the attacker's own session, the request is refused.
  const attackerToken = await generateCsrfToken("attacker-session");
  const planted = await send(attackerToken, `temp-session=attacker-session; XSRF-TOKEN=${attackerToken}`);
  assert.equal(planted.status, 403);
});
