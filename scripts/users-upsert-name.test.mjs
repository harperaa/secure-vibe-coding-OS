/**
 * Clerk sends first_name / last_name as null when the user has not set them (e.g. an
 * email-only sign-up). upsertFromClerk built the name with a template literal, so the
 * stored name became the literal text "null null" or "Ada null" (issue #84).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// convex/users.ts imports "./_generated/server" without an extension (bundler-style) and
// imports types (QueryCtx, MutationCtx, UserJSON) without `import type`, which Node's type
// stripping keeps as value imports. Point both at shims that also export those names.
const serverJs = new URL("../convex/_generated/server.js", import.meta.url).href;
const shims = {
  "./_generated/server": `export * from ${JSON.stringify(serverJs)}; export const QueryCtx = undefined, MutationCtx = undefined;`,
  "@clerk/backend": "export const UserJSON = undefined;",
  "convex/values": `export * from ${JSON.stringify(import.meta.resolve("convex/values"))}; export const Validator = undefined;`,
};
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    specifier in shims && context.parentURL?.includes("/convex/users.ts")
      ? { url: `data:text/javascript,${encodeURIComponent(shims[specifier])}`, shortCircuit: true }
      : nextResolve(specifier, context),
});

const { upsertFromClerk } = await import("../convex/users.ts");

// Minimal in-memory stand-in for the Convex mutation ctx, enough for upsertFromClerk.
function fakeCtx() {
  const rows = [];
  return {
    rows,
    db: {
      query: () => ({
        withIndex: (_name, build) => {
          let field, value;
          build({ eq: (f, v) => ((field = f), (value = v)) });
          return { unique: async () => rows.find((r) => r[field] === value) ?? null };
        },
      }),
      insert: async (_table, doc) => {
        const _id = `id_${rows.length}`;
        rows.push({ _id, ...doc });
        return _id;
      },
      patch: async (id, fields) => Object.assign(rows.find((r) => r._id === id), fields),
    },
  };
}

async function storedName(data) {
  const ctx = fakeCtx();
  await upsertFromClerk._handler(ctx, { data });
  return ctx.rows[0].name;
}

const base = {
  id: "user_x",
  email_addresses: [{ id: "idn_1", email_address: "ada@example.com" }],
  primary_email_address_id: "idn_1",
};

test("both names present: joined with a space", async () => {
  assert.equal(await storedName({ ...base, first_name: "Ada", last_name: "Lovelace" }), "Ada Lovelace");
});

test("last name null: only the first name is stored", async () => {
  assert.equal(await storedName({ ...base, first_name: "Ada", last_name: null }), "Ada");
});

test("first name null: only the last name is stored", async () => {
  assert.equal(await storedName({ ...base, first_name: null, last_name: "Lovelace" }), "Lovelace");
});

test("both names null: falls back to the primary email", async () => {
  assert.equal(await storedName({ ...base, first_name: null, last_name: null }), "ada@example.com");
});

test("both names null and no email: falls back to a placeholder, never 'null'", async () => {
  const name = await storedName({
    id: "user_x",
    first_name: null,
    last_name: null,
    email_addresses: [],
    primary_email_address_id: null,
  });
  assert.doesNotMatch(name, /null/);
  assert.equal(name, "Unknown User");
});
