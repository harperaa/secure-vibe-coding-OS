/**
 * svix 2.2.0 removed JSON parsing from Webhook.verify; it now returns nothing on success.
 * The Clerk webhook handler returned verify()'s result as the event, so on svix 2 every VALID
 * webhook became `undefined` and was answered 400 (no user sync, no user.deleted erasure).
 * verifyClerkWebhook verifies first and parses the payload itself, which holds on svix 1 and 2.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Webhook } from "svix";
import { verifyClerkWebhook } from "../convex/lib/clerkWebhook.ts";

const here = dirname(fileURLToPath(import.meta.url));

// Synthetic signing secret, generated for this test only.
const SECRET = "whsec_" + Buffer.from("synthetic-test-secret-32-bytes!!").toString("base64");
const PAYLOAD = JSON.stringify({ type: "user.deleted", data: { id: "user_test_123" } });

function signedHeaders(payload, secret = SECRET) {
  const id = "msg_test";
  const ts = new Date();
  return {
    "svix-id": id,
    "svix-timestamp": String(Math.floor(ts.getTime() / 1000)),
    "svix-signature": new Webhook(secret).sign(id, ts, payload),
  };
}

test("a validly signed webhook yields the parsed event", () => {
  const event = verifyClerkWebhook(PAYLOAD, signedHeaders(PAYLOAD), SECRET);
  assert.deepEqual(event, { type: "user.deleted", data: { id: "user_test_123" } });
});

test("a tampered payload is rejected", () => {
  const headers = signedHeaders(PAYLOAD);
  const tampered = PAYLOAD.replace("user_test_123", "user_other_999");
  assert.throws(() => verifyClerkWebhook(tampered, headers, SECRET));
});

test("a signature from another secret is rejected", () => {
  const other = "whsec_" + Buffer.from("another-synthetic-secret-32-byte").toString("base64");
  assert.throws(() => verifyClerkWebhook(PAYLOAD, signedHeaders(PAYLOAD, other), SECRET));
});

test("missing svix headers are rejected", () => {
  assert.throws(() => verifyClerkWebhook(PAYLOAD, {}, SECRET));
});

test("the Clerk route verifies through the helper, not verify()'s return value", () => {
  const src = readFileSync(join(here, "..", "convex/http.ts"), "utf8");
  assert.match(src, /verifyClerkWebhook\(/);
  assert.doesNotMatch(src, /return\s+wh\.verify\(/);
});

// svix 2 renamed EndpointIn.filterTypes to eventTypes and its serializer silently drops unknown
// keys. With filterTypes the endpoint was created WITHOUT a filter, so Clerk would send every event
// type (email.created, sms.created, session.*: addresses, phone numbers, codes) to Convex.
const EVENT_TYPES = ["user.created", "user.updated", "user.deleted", "paymentAttempt.updated"];

async function capturedCreateBody(endpointIn) {
  const { Svix } = await import("svix");
  let body;
  const fakeFetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "ep_test", url: endpointIn.url }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  const svix = new Svix("testsk_synthetic", { serverUrl: "https://svix.invalid", fetch: fakeFetch });
  await svix.endpoint.create("app_test", endpointIn).catch(() => {});
  return body;
}

test("the installed svix sends eventTypes and drops the old filterTypes key", async () => {
  const kept = await capturedCreateBody({ url: "https://example.test/hook", eventTypes: EVENT_TYPES });
  assert.deepEqual(kept.eventTypes ?? kept.filterTypes, EVENT_TYPES);
  const dropped = await capturedCreateBody({ url: "https://example.test/hook", filterTypes: EVENT_TYPES });
  assert.equal(dropped.filterTypes, undefined);
  assert.equal(dropped.eventTypes, undefined);
});

test("setup and deploy create the Svix endpoint with eventTypes, not filterTypes", () => {
  for (const file of ["scripts/setup.mjs", "scripts/deploy.mjs"]) {
    const src = readFileSync(join(here, "..", file), "utf8");
    const create = src.slice(src.indexOf("svix.endpoint.create("));
    const call = create.slice(0, create.indexOf("});") + 3);
    assert.match(call, /eventTypes:\s*\[/, file);
    assert.doesNotMatch(src, /filterTypes\s*:/, file);
  }
});
