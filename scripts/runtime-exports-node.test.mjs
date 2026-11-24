import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Issue #57: the published package is "type": "module" but dist uses
// extensionless relative imports, so plain Node (no bundler, no resolve hook)
// cannot load most package exports. This test packs the local package, installs
// it in a scratch folder with peers, and imports every exports-map entry.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG_DIR = path.join(ROOT, "packages", "secure-vibe-runtime");

// Scratch installs must not inherit this repo's npm config (strict-allow-scripts,
// min-release-age, etc.) via npm_config_* when the suite is launched by `npm test`.
function scratchEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase().startsWith("npm_config_")) delete env[key];
  }
  return env;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf-8",
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed (status ${r.status}):\n${r.stdout}\n${r.stderr}`
    );
  }
  return r;
}

test("every secure-vibe-runtime export loads under plain Node from a packed tarball", async () => {
  run("npm", ["run", "build"], { cwd: PKG_DIR });

  const pack = run("npm", ["pack", "--json"], { cwd: PKG_DIR });
  const [{ filename }] = JSON.parse(pack.stdout.trim());
  const tarball = path.join(PKG_DIR, filename);

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "svr-exports-"));
  try {
    // Copy, not rename: the checkout and the temp dir may be on different filesystems.
    fs.copyFileSync(tarball, path.join(scratch, filename));
    fs.rmSync(tarball);
    run("npm", ["init", "-y"], { cwd: scratch, env: scratchEnv() });

    // Peers are required for withCsrf / withRateLimit / convex. Install the
    // exact versions the repo's lockfile resolved, so an unrelated new release
    // cannot change this test's result.
    const installedVersion = (name) =>
      JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf-8")).version;
    run(
      "npm",
      [
        "install",
        `./${filename}`,
        `next@${installedVersion("next")}`,
        `convex@${installedVersion("convex")}`,
      ],
      { cwd: scratch, env: scratchEnv() }
    );

    const installedPkg = JSON.parse(
      fs.readFileSync(path.join(scratch, "node_modules", "secure-vibe-runtime", "package.json"), "utf-8")
    );
    const exportKeys = Object.keys(installedPkg.exports);
    assert.ok(exportKeys.length > 0, "package exports map is empty");

    const failures = [];
    for (const key of exportKeys) {
      const specifier = key === "." ? "secure-vibe-runtime" : `secure-vibe-runtime${key.slice(1)}`;
      // Fresh process so one failed import cannot poison the others, and so we
      // use Node's default ESM resolver with no test hooks.
      const probe = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", `await import(${JSON.stringify(specifier)})`],
        { cwd: scratch, encoding: "utf-8" }
      );
      if (probe.status !== 0) {
        failures.push({
          specifier,
          message: (probe.stderr || probe.stdout || `exit ${probe.status}`).trim(),
        });
      }
    }

    assert.equal(
      failures.length,
      0,
      `plain Node failed to import ${failures.length} export(s):\n` +
        failures.map((f) => `- ${f.specifier}: ${f.message}`).join("\n")
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
    if (fs.existsSync(tarball)) fs.unlinkSync(tarball);
  }
});
