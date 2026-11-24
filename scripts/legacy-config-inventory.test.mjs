/**
 * `setup.mjs migrate-to-doppler --phase=inventory` reports `legacy`, which
 * /install uses to decide whether choosing Doppler means a fresh setup or a
 * migration of existing configuration.
 *
 * Runs the real script in a throwaway repo with stub `vercel` and `npx`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// `vercel env pull <file> --environment <t> --yes` writes STUB_VERCEL_ENV to <file>.
const VERCEL = `#!${process.execPath}
const fs = require('node:fs');
const a = process.argv.slice(2);
if (a[0] === '--version') { console.log('66.0.0'); process.exit(0); }
if (a[0] === 'env' && a[1] === 'pull') {
  if (process.env.STUB_VERCEL_FAIL) process.exit(1);
  fs.writeFileSync(a[2], process.env.STUB_VERCEL_ENV || '');
  process.exit(0);
}
process.exit(0);
`;
const NPX = `#!${process.execPath}\nprocess.exit(1);\n`;

function inventory({ envLocal = "", vercelEnv = "", vercelFail = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-inv-"));
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of ["setup.mjs", path.join("lib", "doppler.mjs"), path.join("lib", "github-repo.mjs")]) {
    fs.copyFileSync(path.join(here, f), path.join(root, "scripts", f));
  }
  const clerkDir = path.join(root, "node_modules", "@clerk", "backend");
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, "package.json"), JSON.stringify({ name: "@clerk/backend", type: "module", main: "index.js" }));
  fs.writeFileSync(path.join(clerkDir, "index.js"), "export function createClerkClient() { return {}; }\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "my-product" }));
  fs.writeFileSync(path.join(root, ".env.local"), envLocal);
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "vercel"), VERCEL, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "npx"), NPX, { mode: 0o755 });
  const r = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "setup.mjs"), "migrate-to-doppler", "--phase=inventory", `--inventory-file=${path.join(root, "inv.json")}`],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
      env: { ...process.env, STUB_VERCEL_ENV: vercelEnv, ...(vercelFail ? { STUB_VERCEL_FAIL: "1" } : {}), PATH: `${bin}${path.delimiter}${process.env.PATH}` },
    }
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.slice(r.stdout.indexOf("{"))).legacy;
}

const ROUTING = "CONVEX_DEPLOYMENT=dev:some-animal-1\nNEXT_PUBLIC_CONVEX_URL=https://some-animal-1.convex.cloud\n";

test("fresh clone or Doppler-mode repo: nothing to migrate", () => {
  const legacy = inventory({ envLocal: ROUTING + "VERCEL_OIDC_TOKEN=abc\nCLERK_SECRET_KEY=your_clerk_secret_key\n", vercelEnv: 'DOPPLER_TOKEN="dp.st.x"\nVERCEL_ENV="production"\n' });
  assert.equal(legacy.hasLegacyConfig, false);
  assert.deepEqual(legacy.envLocalAppKeys, []);
  assert.deepEqual(legacy.vercelAppKeys, []);
  assert.equal(legacy.vercelChecked, true);
});

test("app values in .env.local are legacy config", () => {
  const legacy = inventory({ envLocal: ROUTING + "CLERK_SECRET_KEY=sk_test_synthetic\nCSRF_SECRET=abc123\n", vercelFail: true });
  assert.equal(legacy.hasLegacyConfig, true);
  assert.deepEqual(legacy.envLocalAppKeys, ["CLERK_SECRET_KEY", "CSRF_SECRET"]);
  assert.equal(legacy.vercelChecked, false);
});

test("app values stored on the Vercel project are legacy config", () => {
  const legacy = inventory({ envLocal: ROUTING, vercelEnv: 'CLERK_SECRET_KEY="sk_test_synthetic"\nNEXT_PUBLIC_CONVEX_URL="https://other-animal-2.convex.cloud"\nVERCEL_ENV="production"\n' });
  assert.equal(legacy.hasLegacyConfig, true);
  assert.deepEqual(legacy.vercelAppKeys, ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CONVEX_URL"]);
});
