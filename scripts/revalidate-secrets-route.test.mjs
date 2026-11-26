import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// The route is loaded the way the app loads it: through the lib/secrets shim,
// which resolves the installed `secure-vibe-runtime`. Plain Node needs the
// `@/` tsconfig alias and cannot resolve the bare `next/server`.
const shim = new URL("../lib/secrets.ts", import.meta.url).href;
registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/secrets") return nextResolve(shim, context);
    return nextResolve(specifier, context);
  },
});

const { NextRequest } = await import("next/server.js");
const { ensureSecretsLoaded, revalidateSecrets } = await import("../lib/secrets.ts");
const { POST } = await import("../app/api/revalidate-secrets/route.ts");

const REVALIDATE_TOKEN = "test-only-revalidate-token-0123456789";
const KEYS = ["DOPPLER_TOKEN", "REVALIDATE_TOKEN", "SVR_ROUTE_TEST"];

const post = (authorization) =>
  new NextRequest("http://localhost/api/revalidate-secrets", {
    method: "POST",
    headers: authorization === undefined ? {} : { authorization },
  });

let fetch;

// Every test starts with a warm secrets cache holding "before-rotation", and
// Doppler (a fake fetch, no network) now serving "after-rotation". A refetch
// is therefore visible both as a second fetch call and as the new value.
beforeEach(async () => {
  revalidateSecrets();
  for (const key of KEYS) delete process.env[key];
  process.env.DOPPLER_TOKEN = "dp.st.test-only-not-a-real-token";
  process.env.REVALIDATE_TOKEN = REVALIDATE_TOKEN;
  const values = ["before-rotation", "after-rotation"];
  fetch = mock.method(globalThis, "fetch", async () =>
    Response.json({ SVR_ROUTE_TEST: values.length > 1 ? values.shift() : values[0] })
  );
  await ensureSecretsLoaded();
  assert.equal(process.env.SVR_ROUTE_TEST, "before-rotation");
});

afterEach(() => {
  mock.restoreAll();
  revalidateSecrets();
  for (const key of KEYS) delete process.env[key];
});

async function assertRejected(authorization) {
  const res = await POST(post(authorization));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Unauthorized" });
  assert.equal(fetch.mock.callCount(), 1, "the cache must not be dropped");
  assert.equal(process.env.SVR_ROUTE_TEST, "before-rotation");
}

test("the correct bearer token drops the cache and refetches the secrets", async () => {
  const res = await POST(post(`Bearer ${REVALIDATE_TOKEN}`));

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.revalidated, true);
  assert.equal(new Date(body.at).toISOString(), body.at);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(process.env.SVR_ROUTE_TEST, "after-rotation");
});

test("a request with no Authorization header is rejected", async () => {
  await assertRejected(undefined);
});

test("a non-Bearer scheme is rejected even when it carries the right token", async () => {
  await assertRejected(`Basic ${REVALIDATE_TOKEN}`);
  await assertRejected(REVALIDATE_TOKEN);
});

test("a wrong token of the same length is rejected", async () => {
  const wrong = `${REVALIDATE_TOKEN.slice(0, -1)}X`;
  assert.equal(wrong.length, REVALIDATE_TOKEN.length);
  await assertRejected(`Bearer ${wrong}`);
});

test("a prefix, an extension and an empty token are rejected", async () => {
  await assertRejected(`Bearer ${REVALIDATE_TOKEN.slice(0, 10)}`);
  await assertRejected(`Bearer ${REVALIDATE_TOKEN}extra`);
  await assertRejected("Bearer ");
});

test("the Doppler service token is not accepted in place of REVALIDATE_TOKEN", async () => {
  await assertRejected(`Bearer ${process.env.DOPPLER_TOKEN}`);
});

test("without REVALIDATE_TOKEN configured the route fails closed, even for an empty bearer", async () => {
  delete process.env.REVALIDATE_TOKEN;

  for (const authorization of ["Bearer ", `Bearer ${REVALIDATE_TOKEN}`, undefined]) {
    const res = await POST(post(authorization));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), {
      error: "REVALIDATE_TOKEN is not configured for this deployment.",
    });
  }
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(process.env.SVR_ROUTE_TEST, "before-rotation");
});
