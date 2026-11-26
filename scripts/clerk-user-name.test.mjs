/**
 * Clerk sends first_name / last_name as null when the user has not set them (e.g. an email-only
 * sign-up). users.upsertFromClerk built the name with a template literal, so the stored name
 * became the literal text "null null" (or "Ada null").
 *
 * convex/users.ts cannot be imported by node directly (extensionless and type-only imports), so
 * the real source is transpiled and its handler is run against an in-memory users table.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadUsersModule() {
  const source = readFileSync(join(here, "..", "convex/users.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const passthrough = (def) => def;
  const stubs = {
    "./_generated/server": { internalMutation: passthrough, mutation: passthrough, query: passthrough },
  };
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => stubs[id] ?? require(id),
    mod,
    mod.exports,
  );
  return mod.exports;
}

const { upsertFromClerk } = loadUsersModule();

/** Runs the mutation against an empty users table and returns the stored row. */
async function storedUser(data) {
  const rows = [];
  const ctx = {
    db: {
      query: () => ({ withIndex: () => ({ unique: async () => null }) }),
      insert: async (_table, doc) => void rows.push(doc),
      patch: async () => assert.fail("no existing user expected"),
    },
  };
  await upsertFromClerk.handler(ctx, { data });
  assert.equal(rows.length, 1);
  return rows[0];
}

const EMAIL = { id: "idn_1", email_address: "ada@example.com" };

test("both names set: stored as 'first last'", async () => {
  const user = await storedUser({
    id: "user_x", first_name: "Ada", last_name: "Lovelace",
    email_addresses: [EMAIL], primary_email_address_id: "idn_1",
  });
  assert.equal(user.name, "Ada Lovelace");
});

test("both names null and no email: falls back to a placeholder", async () => {
  const user = await storedUser({
    id: "user_x", first_name: null, last_name: null,
    email_addresses: [], primary_email_address_id: null,
  });
  assert.equal(user.name, "Unknown User");
});

test("both names null with a primary email: falls back to the email", async () => {
  const user = await storedUser({
    id: "user_x", first_name: null, last_name: null,
    email_addresses: [EMAIL], primary_email_address_id: "idn_1",
  });
  assert.equal(user.name, "ada@example.com");
});

test("last name null: only the first name is stored", async () => {
  const user = await storedUser({
    id: "user_x", first_name: "Ada", last_name: null,
    email_addresses: [EMAIL], primary_email_address_id: "idn_1",
  });
  assert.equal(user.name, "Ada");
});

test("first name null: only the last name is stored", async () => {
  const user = await storedUser({
    id: "user_x", first_name: null, last_name: "Lovelace",
    email_addresses: [EMAIL], primary_email_address_id: "idn_1",
  });
  assert.equal(user.name, "Lovelace");
});
