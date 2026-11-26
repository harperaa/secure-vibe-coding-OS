/**
 * `setup.mjs migrate-to-doppler --phase=inventory` reports `legacy`, which
 * /install uses to decide whether choosing Doppler means a fresh setup or a
 * migration of existing configuration.
 *
 * Runs the real script in a throwaway repo with stub `vercel`, `npx`, `gh` and
 * `doppler`, on a PATH that holds only those stubs, node/npm and /usr/bin:/bin.
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

// `vercel env pull <file> --environment <t> --yes` writes STUB_VERCEL_ENV to <file>.
const VERCEL = `#!${process.execPath}
const fs = require('node:fs');
const a = process.argv.slice(2);
if (a[0] === '--version') { console.log('66.0.0'); process.exit(0); }
if (a[0] === 'env' && a[1] === 'pull') {
  if (process.env.STUB_VERCEL_FAIL) process.exit(1);
  // Per-target values when STUB_VERCEL_<TARGET> is set, else the same for every target.
  const target = a[a.indexOf('--environment') + 1];
  const perTarget = process.env['STUB_VERCEL_' + String(target).toUpperCase()];
  fs.writeFileSync(a[2], perTarget !== undefined ? perTarget : (process.env.STUB_VERCEL_ENV || ''));
  process.exit(0);
}
process.exit(0);
`;
// `npx convex env list --include-values` prints STUB_CONVEX_ENV (KEY=value lines); without the
// flag it prints names only, like the real CLI when it detects an AI agent. Fails when unset.
const NPX = `#!${process.execPath}\nconst a = process.argv.slice(2).join(' ');\nconst env = process.env.STUB_CONVEX_ENV;\nif (a.startsWith('convex env list') && env !== undefined) { console.log(a.includes('--include-values') ? env : env.split('\\n').map((l) => l.split('=')[0]).join('\\n')); process.exit(0); }\nprocess.exit(1);\n`;
// Records every call (argv + stdin); a migration that is refused must never reach `doppler secrets set`.
const DOPPLER = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
let stdin = null;
if (!process.stdin.isTTY) { try { stdin = fs.readFileSync(0, 'utf8'); } catch { stdin = null; } }
fs.appendFileSync(process.env.STUB_DOPPLER_LOG, argv.join(' ') + '\\n');
fs.appendFileSync(process.env.STUB_DOPPLER_LOG + '.jsonl', JSON.stringify({ argv, stdin }) + '\\n');
process.exit(0);
`;
// gh is never needed here; the stub keeps any accidental call off the real CLI.
const GH = `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.STUB_GH_LOG, process.argv.slice(2).join(' ') + '\\n');\nprocess.exit(1);\n`;

function inventory({ envLocal = "", vercelEnv = "", vercelByTarget = null, convexEnv = null, vercelFail = false, thenMigrate = false, full = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-inv-"));
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of ["setup.mjs", path.join("lib", "doppler.mjs"), path.join("lib", "github-repo.mjs"), path.join("lib", "convex-env-list.mjs")]) {
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
  fs.writeFileSync(path.join(bin, "doppler"), DOPPLER, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "gh"), GH, { mode: 0o755 });
  const dopplerLog = path.join(root, "doppler-calls.log");
  const ghLog = path.join(root, "gh-calls.log");
  const testPath = isolatedTestPath([bin]);
  const env = { ...process.env, STUB_DOPPLER_LOG: dopplerLog, STUB_GH_LOG: ghLog, STUB_VERCEL_ENV: vercelEnv, ...(vercelFail ? { STUB_VERCEL_FAIL: "1" } : {}), ...(convexEnv !== null ? { STUB_CONVEX_ENV: convexEnv } : {}), ...(vercelByTarget ? { STUB_VERCEL_DEVELOPMENT: vercelByTarget.development || "", STUB_VERCEL_PREVIEW: vercelByTarget.preview || "", STUB_VERCEL_PRODUCTION: vercelByTarget.production || "" } : {}), PATH: testPath };
  const r = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "setup.mjs"), "migrate-to-doppler", "--phase=inventory", `--inventory-file=${path.join(root, "inv.json")}`],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
      env,
    }
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  if (thenMigrate) {
    fs.writeFileSync(path.join(root, ".doppler.yaml"), "setup:\n  project: my-product\n  config: dev\n");
    const m = spawnSync(
      process.execPath,
      [path.join(root, "scripts", "setup.mjs"), "migrate-to-doppler", "--phase=migrate", `--inventory-file=${path.join(root, "inv.json")}`],
      { cwd: root, encoding: "utf8", timeout: 60000, env }
    );
    const dopplerCalls = fs.existsSync(dopplerLog) ? fs.readFileSync(dopplerLog, "utf8") : "";
    const jsonl = `${dopplerLog}.jsonl`;
    const dopplerRecords = fs.existsSync(jsonl) ? fs.readFileSync(jsonl, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const ghCalls = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf8") : "";
    const err = m.stderr.includes("{") ? JSON.parse(m.stderr.slice(m.stderr.indexOf("{"))) : null;
    const migrated = m.stdout.includes("{") ? JSON.parse(m.stdout.slice(m.stdout.indexOf("{"))) : null;
    return { out, status: m.status, err, migrated, dopplerCalls, dopplerRecords, ghCalls };
  }
  return full ? out : out.legacy;
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

// Two stacks: local dev on one Clerk app, the deployed site on another.
const TWO_STACKS = {
  envLocal: ROUTING + "CLERK_SECRET_KEY=sk_test_local\n",
  vercelEnv: 'CLERK_SECRET_KEY="sk_test_deployed"\nNEXT_PUBLIC_CONVEX_URL="https://other-animal-2.convex.cloud"\nNEXT_PUBLIC_SITE_NAME="Same"\n',
};

test("inventory lists keys whose sources disagree, by name only", () => {
  const out = inventory({ ...TWO_STACKS, full: true });
  assert.deepEqual(out.conflicts.map((c) => c.key), ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CONVEX_URL"]);
  assert.doesNotMatch(JSON.stringify(out.conflicts), /sk_test_|convex\.cloud/);
});

test("sources that agree have no conflicts", () => {
  const out = inventory({ envLocal: ROUTING + "CLERK_SECRET_KEY=sk_test_same\n", vercelEnv: 'CLERK_SECRET_KEY="sk_test_same"\n', full: true });
  assert.deepEqual(out.conflicts, []);
});

test("migrate refuses to merge conflicting sources and writes nothing to Doppler", () => {
  const { status, err, dopplerCalls } = inventory({ ...TWO_STACKS, thenMigrate: true });
  assert.equal(status, 1);
  assert.equal(err.error, "conflicting_sources");
  assert.deepEqual(err.conflicts.map((c) => c.key), ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CONVEX_URL"]);
  assert.doesNotMatch(dopplerCalls, /secrets set/);
});

test("migrate sends each value to `doppler secrets set KEY` on stdin, never in argv", () => {
  const value = 'sk_test_same$with "quotes" and spaces';
  const { status, migrated, dopplerRecords, ghCalls } = inventory({
    envLocal: ROUTING + `CLERK_SECRET_KEY=${value}\nCSRF_SECRET=csrf-synthetic\n`,
    vercelFail: true,
    thenMigrate: true,
  });
  assert.equal(status, 0);
  assert.ok(migrated.pushedDev.includes("CLERK_SECRET_KEY"));
  const sets = dopplerRecords.filter((c) => c.argv[0] === "secrets" && c.argv[1] === "set");
  const clerk = sets.find((c) => c.argv[2] === "CLERK_SECRET_KEY");
  assert.deepEqual(clerk.argv, ["secrets", "set", "CLERK_SECRET_KEY", "--project", "my-product", "--config", "dev", "--silent"]);
  assert.equal(clerk.stdin, value);
  assert.equal(sets.find((c) => c.argv[2] === "CSRF_SECRET").stdin, "csrf-synthetic");
  for (const c of sets) {
    assert.ok(!c.argv.some((a) => a.includes("=") || a.includes(value) || a.includes("csrf-synthetic")), c.argv.join(" "));
  }
  assert.equal(ghCalls, "");
});

test("Convex env is compared too", () => {
  const out = inventory({
    envLocal: ROUTING,
    convexEnv: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://app-one.clerk.accounts.dev",
    vercelEnv: 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL="https://app-two.clerk.accounts.dev"\n',
    full: true,
  });
  assert.deepEqual(out.conflicts.map((c) => c.key), ["NEXT_PUBLIC_CLERK_FRONTEND_API_URL"]);
  assert.match(out.conflicts[0].sources.join(" | "), /Convex env/);
});

test("before promotion, production differing from development is a conflict", () => {
  const out = inventory({
    envLocal: ROUTING,
    vercelByTarget: {
      development: 'CLERK_SECRET_KEY="sk_test_dev"\n',
      preview: 'CLERK_SECRET_KEY="sk_test_dev"\n',
      production: 'CLERK_SECRET_KEY="sk_test_prod"\n',
    },
    full: true,
  });
  assert.deepEqual(out.conflicts.map((c) => c.key), ["CLERK_SECRET_KEY"]);
  assert.deepEqual(out.conflicts[0].sources, ["Vercel development + Vercel preview", "Vercel production"]);
});

test("after promotion, production goes to prd and is not compared with development", () => {
  const out = inventory({
    envLocal: ROUTING,
    vercelByTarget: {
      development: 'CLERK_SECRET_KEY="sk_test_dev"\n',
      preview: 'CLERK_SECRET_KEY="sk_test_dev"\n',
      production: 'CLERK_SECRET_KEY="sk_live_prod"\n_PROD_PROMOTED_AT="2026-01-01T00:00:00Z"\n',
    },
    full: true,
  });
  assert.deepEqual(out.conflicts, []);
});
