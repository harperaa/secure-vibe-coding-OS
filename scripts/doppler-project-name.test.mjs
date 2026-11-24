/**
 * getProjectName() must never fall back to the template's own package name.
 * A fresh clone has no .doppler.yaml and package.json still says
 * "secure-vibe-coding-os"; using that would read and write the TEMPLATE's
 * Doppler project, which exists in the maintainer's account.
 *
 * Each case copies scripts/lib into a throwaway repo root (getProjectName
 * resolves .doppler.yaml and package.json two levels above lib/).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function projectNameIn({ pkgName, dopplerYaml }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doppler-name-"));
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of ["doppler.mjs", "github-repo.mjs"]) {
    fs.copyFileSync(path.join(here, "lib", f), path.join(root, "scripts", "lib", f));
  }
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: pkgName }));
  if (dopplerYaml) fs.writeFileSync(path.join(root, ".doppler.yaml"), dopplerYaml);
  const lib = path.join(root, "scripts", "lib", "doppler.mjs");
  // Import by file URL: a bare Windows path (C:\\...) is not a valid ESM specifier.
  const script = `import { getProjectName } from ${JSON.stringify(pathToFileURL(lib).href)}; try { console.log("OK " + getProjectName()); } catch (e) { console.log("ERR " + e.message); }`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: root, encoding: "utf8" });
  return r.stdout.trim();
}

test("fresh clone (template package name, no .doppler.yaml) is refused", () => {
  const out = projectNameIn({ pkgName: "secure-vibe-coding-os" });
  assert.match(out, /^ERR /);
  assert.match(out, /doppler-bootstrap --project-name/);
});

test(".doppler.yaml wins, even when package.json still has the template name", () => {
  assert.equal(
    projectNameIn({ pkgName: "secure-vibe-coding-os", dopplerYaml: "setup:\n  project: my-site\n  config: dev\n" }),
    "OK my-site"
  );
});

test("a renamed package.json is still a valid fallback", () => {
  assert.equal(projectNameIn({ pkgName: "my-product" }), "OK my-product");
});
