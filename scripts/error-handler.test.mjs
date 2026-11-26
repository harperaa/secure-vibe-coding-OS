import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no package exports map, so outside the Next bundler plain Node
// cannot resolve the bare `next/server` that errorHandler.ts imports.
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context),
});
const {
  handleApiError,
  handleValidationError,
  handleForbiddenError,
  handleUnauthorizedError,
  handleNotFoundError,
} = await import("../lib/errorHandler.ts");

/** Calls handleApiError under the given NODE_ENV with console.error captured. */
async function callApiError(t, nodeEnv, error, context) {
  const previous = process.env.NODE_ENV;
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });
  const logged = t.mock.method(console, "error", () => {});
  const res = handleApiError(error, context);
  const text = await res.text();
  return { res, text, body: JSON.parse(text), logs: logged.mock.calls.map((c) => c.arguments) };
}

const GENERIC = {
  error: "Internal server error",
  message: "An unexpected error occurred. Please try again later.",
};

test("production returns the generic body and never the message or stack", async (t) => {
  const error = new Error("connect ECONNREFUSED db.internal:5432 password=hunter2");
  const { res, text, body, logs } = await callApiError(t, "production", error, "billing-route");

  assert.equal(res.status, 500);
  assert.deepEqual(body, GENERIC);
  assert.doesNotMatch(text, /ECONNREFUSED|hunter2|billing-route|error-handler\.test|\bat /);

  // The message is still logged server-side, but without the stack.
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], `[API Error] [billing-route]: ${error.message}`);
  assert.equal(logs[0][1], "");
});

test("anything other than NODE_ENV=development gets the generic body", async (t) => {
  for (const env of [undefined, "test", "Development", ""]) {
    const { res, body } = await callApiError(t, env, new Error("secret detail"));
    assert.equal(res.status, 500);
    assert.deepEqual(body, GENERIC, `NODE_ENV=${env}`);
  }
});

test("development includes message, stack, context and a timestamp", async (t) => {
  const error = new Error("boom");
  const { res, body, logs } = await callApiError(t, "development", error, "my-route");

  assert.equal(res.status, 500);
  assert.equal(body.error, "boom");
  assert.equal(body.stack, error.stack);
  assert.equal(body.context, "my-route");
  assert.equal(new Date(body.timestamp).toISOString(), body.timestamp);
  assert.deepEqual(Object.keys(body).sort(), ["context", "error", "stack", "timestamp"]);
  assert.deepEqual(logs[0], ["[API Error] [my-route]: boom", error.stack]);
});

test("development without a context reports 'unknown'", async (t) => {
  const { body, logs } = await callApiError(t, "development", new Error("boom"));
  assert.equal(body.context, "unknown");
  assert.equal(logs[0][0], "[API Error]: boom");
});

test("a non-Error value is reported as 'Unknown error'", async (t) => {
  for (const thrown of ["a string with details", { message: "object detail" }, null, undefined, 42]) {
    const dev = await callApiError(t, "development", thrown, "ctx");
    assert.equal(dev.body.error, "Unknown error");
    assert.equal("stack" in dev.body, false);
    assert.equal(dev.logs[0][0], "[API Error] [ctx]: Unknown error");

    const prod = await callApiError(t, "production", thrown, "ctx");
    assert.deepEqual(prod.body, GENERIC);
    assert.doesNotMatch(prod.text, /detail/);
  }
});

test("handleValidationError answers 400 and omits details when not passed", async () => {
  const res = handleValidationError("Invalid input");
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Validation error", message: "Invalid input" });
});

test("handleValidationError includes details when passed", async () => {
  const res = handleValidationError("Invalid input", { email: "Email is required" });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    error: "Validation error",
    message: "Invalid input",
    details: { email: "Email is required" },
  });
});

test("handleUnauthorizedError answers 401 with a default or custom message", async () => {
  const res = handleUnauthorizedError();
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "Unauthorized", message: "Authentication required" });
  assert.deepEqual(await handleUnauthorizedError("Session expired").json(), {
    error: "Unauthorized",
    message: "Session expired",
  });
});

test("handleForbiddenError answers 403 with a default or custom message", async () => {
  const res = handleForbiddenError();
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "Forbidden", message: "Access denied" });
  assert.deepEqual(await handleForbiddenError("Admins only").json(), {
    error: "Forbidden",
    message: "Admins only",
  });
});

test("handleNotFoundError answers 404 and names the resource", async () => {
  const res = handleNotFoundError();
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "Not found", message: "Resource not found" });
  assert.deepEqual(await handleNotFoundError("User").json(), {
    error: "Not found",
    message: "User not found",
  });
});
