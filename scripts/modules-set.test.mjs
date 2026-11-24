/**
 * `modules.mjs set` makes the installed modules exactly the given selection,
 * whatever is installed now. That is what lets /install offer "Minimal shell"
 * from a repository that ships with every module installed.
 *
 * Most cases run the real script inside a tiny synthetic repo. The last one
 * checks the real template: its installed pages must equal a clean build of
 * all modules, so the pages and templates/modules can never drift apart.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function write(root, rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

// Two modules. "alpha" adds a page and a nav link; "beta" adds a page, replaces
// home.txt, and adds a line to alpha's page when alpha is installed.
function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "modules-set-test-"));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.copyFileSync(path.join(here, "modules.mjs"), path.join(root, "scripts", "modules.mjs"));
  write(root, "templates/base/files/nav.txt", "home\n// modules:nav\n");
  write(root, "templates/base/files/home.txt", "minimal home\n");
  write(root, "templates/modules/alpha/module.json", JSON.stringify({
    name: "alpha", title: "Alpha", description: "", marker: "alpha/page.txt", overwrites: [], installAfter: [],
    edits: [{ file: "nav.txt", anchor: "// modules:nav", position: "before", insert: "alpha\n", skipIfContains: "alpha" }],
  }));
  write(root, "templates/modules/alpha/files/alpha/page.txt", "alpha page\n// alpha:extras\n");
  write(root, "templates/modules/beta/module.json", JSON.stringify({
    name: "beta", title: "Beta", description: "", marker: "beta/page.txt", overwrites: ["home.txt"], installAfter: [],
    edits: [{ file: "alpha/page.txt", ifInstalled: "alpha", anchor: "// alpha:extras", position: "before", insert: "beta was here\n", skipIfContains: "beta was here" }],
  }));
  write(root, "templates/modules/beta/files/beta/page.txt", "beta page\n");
  write(root, "templates/modules/beta/files/home.txt", "beta home\n");
  // The repository ships minimal base files; `set` installs from there.
  write(root, "nav.txt", "home\n// modules:nav\n");
  write(root, "home.txt", "minimal home\n");
  return root;
}

function set(root, ...args) {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "modules.mjs"), "set", ...args, "--json"], { cwd: root, encoding: "utf8" });
  return { status: r.status, out: JSON.parse(r.stdout) };
}

test("a full site can be reduced to minimal, and rebuilt", () => {
  const root = makeRepo();
  assert.equal(set(root, "--all").status, 0);
  assert.equal(read(root, "nav.txt"), "home\nalpha\n// modules:nav\n");
  assert.equal(read(root, "home.txt"), "beta home\n");
  assert.match(read(root, "alpha/page.txt"), /beta was here/);

  const min = set(root, "--minimal");
  assert.equal(min.status, 0);
  assert.deepEqual(min.out.toRemove, ["alpha", "beta"]);
  assert.equal(exists(root, "alpha"), false, "module files and their empty folders are removed");
  assert.equal(exists(root, "beta"), false);
  assert.equal(read(root, "nav.txt"), "home\n// modules:nav\n", "edited files return to their base version");
  assert.equal(read(root, "home.txt"), "minimal home\n", "overwritten files return to their base version");
});

test("a partial selection keeps only what was picked", () => {
  const root = makeRepo();
  set(root, "--all");
  const r = set(root, "alpha");
  assert.deepEqual(r.out.toRemove, ["beta"]);
  assert.equal(exists(root, "beta/page.txt"), false);
  assert.equal(read(root, "home.txt"), "minimal home\n");
  assert.equal(read(root, "alpha/page.txt"), "alpha page\n// alpha:extras\n", "beta's edit to alpha's page is undone");
  assert.equal(read(root, "nav.txt"), "home\nalpha\n// modules:nav\n");
});

test("setting the current selection changes nothing", () => {
  const root = makeRepo();
  set(root, "--all");
  const r = set(root, "--all");
  assert.equal(r.status, 0);
  assert.deepEqual(r.out.changes, []);
});

test("hand-edited files are not overwritten or removed without --force", () => {
  const root = makeRepo();
  set(root, "--all");
  write(root, "alpha/page.txt", "my own page\n");
  write(root, "nav.txt", "home\nalpha\nmy link\n// modules:nav\n");

  const refused = set(root, "--minimal");
  assert.equal(refused.status, 2);
  assert.equal(refused.out.error, "customized_files");
  assert.deepEqual(refused.out.customized, ["alpha/page.txt", "nav.txt"]);
  assert.equal(read(root, "alpha/page.txt"), "my own page\n", "nothing was touched");
  assert.equal(exists(root, "beta/page.txt"), true, "not even the unedited files");

  assert.equal(set(root, "--minimal", "--force").status, 0);
  assert.equal(exists(root, "alpha/page.txt"), false);
});

test("--dry-run reports the plan and changes nothing", () => {
  const root = makeRepo();
  set(root, "--all");
  const r = set(root, "--minimal", "--dry-run");
  assert.equal(r.out.applied, false);
  assert.ok(r.out.changes.length > 0);
  assert.equal(exists(root, "alpha/page.txt"), true);
});

// The template's main branch is the reference site with every module installed.
// Its pages must be exactly what the module templates produce, or a fix made in
// one place silently goes missing from the other. Runs in the template's own CI
// (and locally with TEMPLATE_CHECK=1); a user's project is free to differ.
const isTemplateRepo = process.env.GITHUB_REPOSITORY === "harperaa/secure-vibe-coding-OS" || process.env.TEMPLATE_CHECK === "1";
test("the template's installed pages match a clean build of all modules", { skip: !isTemplateRepo }, () => {
  const repo = path.join(here, "..");
  const r = spawnSync(process.execPath, [path.join(here, "modules.mjs"), "set", "--all", "--dry-run", "--json"], { cwd: repo, encoding: "utf8" });
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.current, out.target, "every module is installed on main");
  assert.deepEqual(out.changes, [], "installed pages differ from templates/modules or templates/base");
});
