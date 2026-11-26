import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// The Doppler runtime loader has no imports, so the package source is tested
// directly. No network: global fetch is replaced in every test. No waiting:
// the retry backoff's setTimeout is replaced with one that records the delay
// and fires at once.
const { ensureSecretsLoaded, revalidateSecrets } = await import(
  "../packages/secure-vibe-runtime/src/secrets.ts"
);

const TOKEN = "dp.st.test-only-not-a-real-token";
const KEYS = ["DOPPLER_TOKEN", "SVR_TEST_A", "SVR_TEST_B", "SVR_TEST_NUM", "SVR_TEST_NULL"];

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
const status = (code, text) => new Response("{}", { status: code, statusText: text });

let delays;
let logged;

beforeEach(() => {
  revalidateSecrets();
  for (const key of KEYS) delete process.env[key];
  delays = [];
  logged = [];
  mock.method(globalThis, "setTimeout", (fn, ms) => {
    delays.push(ms);
    queueMicrotask(fn);
  });
  mock.method(console, "warn", (...args) => logged.push(args.join(" ")));
  mock.method(console, "error", (...args) => logged.push(args.join(" ")));
});

afterEach(() => {
  mock.restoreAll();
  revalidateSecrets();
  for (const key of KEYS) delete process.env[key];
});

/** Replace fetch with a queue of responses; a function entry is called (to throw). */
function fakeFetch(...queue) {
  return mock.method(globalThis, "fetch", async () => {
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return typeof next === "function" ? next() : next.clone();
  });
}

test("without DOPPLER_TOKEN nothing is fetched and process.env is left alone", async () => {
  const fetch = fakeFetch(ok({ SVR_TEST_A: "from-doppler" }));
  await ensureSecretsLoaded();
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(process.env.SVR_TEST_A, undefined);
});

test("with DOPPLER_TOKEN the secrets are fetched once and written into process.env", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(ok({ SVR_TEST_A: "alpha", SVR_TEST_B: "beta" }));

  await ensureSecretsLoaded();

  assert.equal(fetch.mock.callCount(), 1);
  const [url, init] = fetch.mock.calls[0].arguments;
  assert.equal(new URL(url).origin, "https://api.doppler.com");
  assert.equal(new URL(url).searchParams.get("format"), "json");
  assert.equal(init.method, "GET");
  assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(init.signal instanceof AbortSignal, "each attempt carries a timeout signal");
  assert.equal(process.env.SVR_TEST_A, "alpha");
  assert.equal(process.env.SVR_TEST_B, "beta");
  assert.deepEqual(delays, []);
});

test("non-string values in the Doppler response are not written to process.env", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  fakeFetch(ok({ SVR_TEST_A: "alpha", SVR_TEST_NUM: 42, SVR_TEST_NULL: null }));

  await ensureSecretsLoaded();

  assert.equal(process.env.SVR_TEST_A, "alpha");
  assert.equal(process.env.SVR_TEST_NUM, undefined);
  assert.equal(process.env.SVR_TEST_NULL, undefined);
});

test("concurrent and repeated callers share a single fetch", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(ok({ SVR_TEST_A: "alpha" }));

  await Promise.all([ensureSecretsLoaded(), ensureSecretsLoaded(), ensureSecretsLoaded()]);
  await ensureSecretsLoaded();

  assert.equal(fetch.mock.callCount(), 1);
});

test("revalidateSecrets drops the cache so a rotated value is picked up", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(ok({ SVR_TEST_A: "before-rotation" }), ok({ SVR_TEST_A: "after-rotation" }));

  await ensureSecretsLoaded();
  assert.equal(process.env.SVR_TEST_A, "before-rotation");

  revalidateSecrets();
  await ensureSecretsLoaded();

  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(process.env.SVR_TEST_A, "after-rotation");
});

test("a network error and a 5xx are retried with doubling backoff until Doppler answers", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(
    () => {
      throw new TypeError("fetch failed");
    },
    status(503, "Service Unavailable"),
    ok({ SVR_TEST_A: "recovered" })
  );

  await ensureSecretsLoaded();

  assert.equal(fetch.mock.callCount(), 3);
  assert.deepEqual(delays, [250, 500]);
  assert.equal(process.env.SVR_TEST_A, "recovered");
  assert.ok(logged.some((line) => line.includes("recovered on attempt 3/5")));
});

test("after five failed attempts the load rejects with the HTTP status and nothing is written", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(status(401, "Unauthorized"));

  await assert.rejects(ensureSecretsLoaded(), (err) => {
    assert.match(err.message, /^Doppler fetch failed after 5 attempts: /);
    assert.match(err.message, /Doppler API returned 401 Unauthorized/);
    return true;
  });

  assert.equal(fetch.mock.callCount(), 5);
  assert.deepEqual(delays, [250, 500, 1000, 2000]);
  assert.equal(process.env.SVR_TEST_A, undefined);
});

test("the failure keeps the underlying network cause and its error code", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  fakeFetch(() => {
    const cause = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    throw new TypeError("fetch failed", { cause });
  });

  await assert.rejects(
    ensureSecretsLoaded(),
    /TypeError: fetch failed <- Error: read ECONNRESET \(ECONNRESET\)/
  );
});

test("the service token never appears in the thrown error or in the logs", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  fakeFetch(status(500, "Internal Server Error"));

  const err = await ensureSecretsLoaded().then(
    () => assert.fail("expected the load to reject"),
    (e) => e
  );

  assert.ok(logged.length >= 6, "each attempt and the final failure are logged");
  assert.ok(!err.message.includes(TOKEN));
  assert.ok(!String(err.stack).includes(TOKEN));
  assert.ok(logged.every((line) => !line.includes(TOKEN)));
});

test("a failed load is not cached: the next call fetches again and can succeed", async () => {
  process.env.DOPPLER_TOKEN = TOKEN;
  const fetch = fakeFetch(
    status(500, "Internal Server Error"),
    status(500, "Internal Server Error"),
    status(500, "Internal Server Error"),
    status(500, "Internal Server Error"),
    status(500, "Internal Server Error"),
    ok({ SVR_TEST_A: "second-try" })
  );

  await assert.rejects(ensureSecretsLoaded());
  await ensureSecretsLoaded();

  assert.equal(fetch.mock.callCount(), 6);
  assert.equal(process.env.SVR_TEST_A, "second-try");
});
