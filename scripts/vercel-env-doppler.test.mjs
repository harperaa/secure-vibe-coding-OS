/**
 * Doppler-mode `deploy.mjs vercel-env-dev` (runVercelEnvDoppler).
 *
 * - First run: DOPPLER_TOKEN is set on all three Vercel targets with
 *   `env add --environment <t> --force --yes`, value on stdin, and no `env rm`
 *   (Vercel CLI 66 refuses removals from an agent session).
 * - Re-run: targets that already have the token are left alone. No new Doppler
 *   token is minted and none is ever revoked.
 *
 * - The Doppler token never appears in any child's argv; a generated
 *   REVALIDATE_TOKEN goes to `doppler secrets set` on stdin.
 *
 * Runs the real script in a throwaway repo with stub `doppler`, `vercel` and
 * `npx` binaries that record what they were called with, on a PATH that holds
 * only those stubs, node/npm and /usr/bin:/bin.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isolatedTestPath } from "./lib/isolated-test-path.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = "dp.st.dev.synthetic";

const STUB = (name) => `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
const sub = argv.join(' ');
let stdin = null;
if (${JSON.stringify(name)} === 'vercel' && sub.startsWith('env add')) stdin = fs.readFileSync(0, 'utf-8');
if (${JSON.stringify(name)} === 'doppler' && sub.startsWith('secrets set')) stdin = fs.readFileSync(0, 'utf-8');
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ bin: ${JSON.stringify(name)}, argv, stdin }) + '\\n');
if (${JSON.stringify(name)} === 'doppler') {
  if (sub.startsWith('configs tokens create')) console.log(${JSON.stringify(TOKEN)});
  else if (sub.startsWith('secrets download')) console.log(process.env.STUB_DOPPLER_JSON || JSON.stringify({ REVALIDATE_TOKEN: 'r'.repeat(40), CLERK_SECRET_KEY: 'sk_test_synthetic' }));
}
if (${JSON.stringify(name)} === 'vercel' && sub.startsWith('env ls')) {
  if (process.env.STUB_VERCEL_LS_FAIL) process.exit(1);
  console.log(process.env.STUB_VERCEL_ENVS);
}
process.exit(0);
`;

function run(existingTargets, { extraEnvs = [], lsFail = false, dopplerSecrets = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vercel-env-doppler-"));
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of ["deploy.mjs", path.join("lib", "doppler.mjs"), path.join("lib", "github-repo.mjs")]) {
    fs.copyFileSync(path.join(here, f), path.join(root, "scripts", f));
  }
  const clerkDir = path.join(root, "node_modules", "@clerk", "backend");
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, "package.json"), JSON.stringify({ name: "@clerk/backend", type: "module", main: "index.js" }));
  fs.writeFileSync(path.join(clerkDir, "index.js"), "export function createClerkClient() { return {}; }\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "my-product" }));
  fs.writeFileSync(path.join(root, ".doppler.yaml"), "setup:\n  project: my-product\n  config: dev\n");

  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  for (const name of ["doppler", "vercel", "npx"]) fs.writeFileSync(path.join(bin, name), STUB(name), { mode: 0o755 });

  const log = path.join(root, "calls.jsonl");
  const envs = [...existingTargets.map((t) => ({ key: "DOPPLER_TOKEN", target: [t] })), ...extraEnvs];
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "deploy.mjs"), "vercel-env-dev"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, STUB_LOG: log, STUB_VERCEL_ENVS: JSON.stringify({ envs }), ...(lsFail ? { STUB_VERCEL_LS_FAIL: "1" } : {}), ...(dopplerSecrets ? { STUB_DOPPLER_JSON: JSON.stringify(dopplerSecrets) } : {}), PATH: isolatedTestPath([bin]) },
  });
  const calls = fs.readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  const adds = calls.filter((c) => c.bin === "vercel" && c.argv.slice(0, 3).join(" ") === "env add DOPPLER_TOKEN");
  const minted = calls.filter((c) => c.bin === "doppler" && c.argv.slice(0, 3).join(" ") === "configs tokens create");
  const revoked = calls.filter((c) => c.bin === "doppler" && /\b(revoke|delete)\b/.test(c.argv.join(" ")));
  const removed = calls.filter((c) => c.bin === "vercel" && /^env (rm|remove)\b/.test(c.argv.join(" ")));
  const dopplerSets = calls.filter((c) => c.bin === "doppler" && c.argv[0] === "secrets" && c.argv[1] === "set");
  // The Doppler token is a value: it may go on stdin, never into argv or output.
  assert.ok(!JSON.stringify(calls.map((c) => c.argv)).includes(TOKEN), "Doppler token found in argv");
  assert.ok(!r.stdout.includes(TOKEN) && !r.stderr.includes(TOKEN), "Doppler token found in output");
  return { out, adds, minted, revoked, removed, dopplerSets, calls };
}

test("first run sets DOPPLER_TOKEN on all three targets by overwrite, value on stdin", () => {
  const { out, adds, minted, revoked, removed } = run([]);
  assert.equal(minted.length, 1);
  assert.deepEqual(
    adds.map((c) => c.argv.slice(3)),
    ["development", "preview", "production"].map((t) => ["--environment", t, "--force", "--yes"])
  );
  for (const c of adds) assert.equal(c.stdin, TOKEN);
  assert.equal(removed.length, 0);
  assert.equal(revoked.length, 0);
  assert.equal(out.varsSet.length, 3);
});

test("a missing REVALIDATE_TOKEN is generated and sent to doppler secrets set on stdin", () => {
  const { out, dopplerSets, calls } = run([], { dopplerSecrets: { CLERK_SECRET_KEY: "sk_test_synthetic" } });
  const set = dopplerSets.find((c) => c.argv[2] === "REVALIDATE_TOKEN");
  assert.ok(set, "REVALIDATE_TOKEN was not set");
  assert.deepEqual(set.argv, ["secrets", "set", "REVALIDATE_TOKEN", "--project", "my-product", "--config", "dev", "--silent"]);
  assert.match(set.stdin, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!JSON.stringify(calls.map((c) => c.argv)).includes(set.stdin), "REVALIDATE_TOKEN found in argv");
  assert.ok(out.steps.includes("Generated REVALIDATE_TOKEN in Doppler config=dev"));
  assert.ok(!JSON.stringify(out).includes(set.stdin));
});

test("an existing REVALIDATE_TOKEN is kept", () => {
  const { dopplerSets } = run([]);
  assert.equal(dopplerSets.filter((c) => c.argv[2] === "REVALIDATE_TOKEN").length, 0);
});

test("re-run leaves existing tokens alone: nothing minted, set, removed or revoked", () => {
  const { out, adds, minted, revoked, removed } = run(["development", "preview", "production"]);
  assert.equal(minted.length, 0);
  assert.equal(adds.length, 0);
  assert.equal(removed.length, 0);
  assert.equal(revoked.length, 0);
  assert.equal(out.alreadySet.length, 3);
});

test("a target missing the token gets one; the others are untouched", () => {
  const { adds, minted, revoked } = run(["development", "production"]);
  assert.equal(minted.length, 1);
  assert.deepEqual(adds.map((c) => c.argv[4]), ["preview"]);
  assert.equal(revoked.length, 0);
});

test("refuses to add DOPPLER_TOKEN when Vercel already stores app values Doppler provides", () => {
  // A legacy-mode project: its own Clerk key lives in Vercel. Adding the token would
  // mix Vercel's build-time values with Doppler's runtime values and break sign-in.
  const { out, adds, minted } = run([], { extraEnvs: [{ key: "CLERK_SECRET_KEY", target: ["production"] }] });
  assert.equal(out.success, false);
  assert.equal(out.error, "vercel_has_app_env");
  assert.deepEqual(out.keys, ["CLERK_SECRET_KEY"]);
  assert.match(out.hint, /migrate-to-doppler/);
  assert.equal(minted.length, 0);
  assert.equal(adds.length, 0);
});

test("variables Doppler does not provide are not a conflict", () => {
  const { out, adds } = run([], { extraEnvs: [{ key: "SOME_VERCEL_ONLY_FLAG", target: ["production"] }] });
  assert.equal(out.error, undefined);
  assert.equal(adds.length, 3);
});

test("stops without changing anything when the Vercel variables can't be listed", () => {
  const { out, adds, minted } = run([], { lsFail: true });
  assert.equal(out.error, "vercel_env_unreadable");
  assert.equal(minted.length, 0);
  assert.equal(adds.length, 0);
});
