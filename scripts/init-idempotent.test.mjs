/**
 * Re-running `setup.mjs init` must not replace a working setup: the Clerk
 * application and the CSRF / session / security-log secrets already in
 * .env.local are reused, and no new accountless Clerk app is created.
 *
 * Runs the real script in a throwaway repo layout with a stub @clerk/backend
 * that records whether an accountless app was requested.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// pk_test_ + base64("example-app-00.clerk.accounts.dev$"); not a real key.
const PK = "pk_test_" + Buffer.from("example-app-00.clerk.accounts.dev$").toString("base64");
const SK = "sk_test_synthetic";

function runInit(envLocal) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "init-idem-"));
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of ["setup.mjs", path.join("lib", "doppler.mjs"), path.join("lib", "github-repo.mjs")]) {
    fs.copyFileSync(path.join(here, f), path.join(root, "scripts", f));
  }
  const marker = path.join(root, "accountless-created");
  const clerkDir = path.join(root, "node_modules", "@clerk", "backend");
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, "package.json"), JSON.stringify({ name: "@clerk/backend", type: "module", main: "index.js" }));
  fs.writeFileSync(
    path.join(clerkDir, "index.js"),
    `import fs from "node:fs";
export function createClerkClient() {
  return {
    __experimental_accountlessApplications: { createAccountlessApplication: async () => {
      fs.writeFileSync(${JSON.stringify(marker)}, "1");
      return { publishableKey: ${JSON.stringify(PK)}, secretKey: "sk_test_new", claimUrl: "https://example.invalid/claim", apiKeysUrl: "" };
    } },
    jwtTemplates: { list: async () => ({ data: [] }), create: async () => ({}), update: async () => ({}) },
    domains: { list: async () => ({ data: [] }) },
  };
}
`
  );
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "my-product" }));
  fs.writeFileSync(path.join(root, ".env.example"), "");
  if (envLocal !== null) fs.writeFileSync(path.join(root, ".env.local"), envLocal);
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "setup.mjs"), "init", "--site-name=My Site", "--admin-email=owner@my-site.test"], { cwd: root, encoding: "utf8" });
  const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1];
  return { r, get, created: fs.existsSync(marker) };
}

test("re-run reuses the configured Clerk app and secrets", () => {
  const { r, get, created } = runInit(
    `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${PK}\nCLERK_SECRET_KEY=${SK}\nCSRF_SECRET=csrf-keep\nSESSION_SECRET=session-keep\nSECURITY_LOG_KEY=log-keep\n`
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal(created, false, "must not create a new accountless Clerk app");
  assert.equal(get("CLERK_SECRET_KEY"), SK);
  assert.equal(get("CSRF_SECRET"), "csrf-keep");
  assert.equal(get("SESSION_SECRET"), "session-keep");
  assert.equal(get("SECURITY_LOG_KEY"), "log-keep");
  assert.match(r.stdout, /"reusedClerk": true/);
});

test("fresh install still creates an accountless Clerk app and new secrets", () => {
  const { r, get, created } = runInit(null);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(created, true);
  assert.equal(get("CLERK_SECRET_KEY"), "sk_test_new");
  assert.ok(get("CSRF_SECRET")?.length >= 32);
});
