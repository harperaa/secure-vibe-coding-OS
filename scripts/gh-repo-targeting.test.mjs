/**
 * A product created by `deploy.mjs github-setup` has two remotes: `origin` (the
 * product) and `upstream` (the template). Scripts that let gh choose the repo
 * then act on the template, or fail with "multiple remotes detected". These
 * tests run the real scripts in a throwaway two-remote repo against a stub `gh`
 * that records its arguments, and check the product repo is named explicitly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGithubRepo, resolveGithubRepo } from "./lib/github-repo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// A repo with the two remotes github-setup leaves behind.
const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gh-repo-")));
execFileSync("git", ["init", "-q"], { cwd: repo });
execFileSync("git", ["remote", "add", "origin", "git@github.com:acme/product.git"], { cwd: repo });
execFileSync("git", ["remote", "add", "upstream", "https://github.com/harperaa/secure-vibe-coding-OS.git"], { cwd: repo });

// Stub gh: logs every call (argv + stdin), and answers `repo view` the way real
// gh does with these remotes and no default set, i.e. with the template.
const bin = fs.mkdtempSync(path.join(os.tmpdir(), "gh-stub-"));
const log = path.join(bin, "calls.log");
fs.writeFileSync(
  path.join(bin, "gh"),
  `#!${process.execPath}
const fs = require("node:fs");
const argv = process.argv.slice(2);
let stdin = null;
if (!process.stdin.isTTY) {
  try { stdin = fs.readFileSync(0, "utf8"); } catch { stdin = null; }
}
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ argv, stdin }) + "\\n");
if (argv[0] === "repo" && argv[1] === "view") console.log("harperaa/secure-vibe-coding-OS");
process.exit(0);
`,
  { mode: 0o755 }
);
const stubEnv = (extra = {}) => {
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, ...extra };
  if (!("GH_REPO" in extra)) delete env.GH_REPO;
  return env;
};
const callRecords = () =>
  fs.existsSync(log)
    ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const calls = () => callRecords().map((c) => c.argv.join(" ")).join("\n");
const reset = () => fs.rmSync(log, { force: true });

test("parseGithubRepo reads owner/repo from github.com remotes only", () => {
  for (const url of [
    "git@github.com:acme/product.git",
    "https://github.com/acme/product.git",
    "https://github.com/acme/product",
    "https://github.com/acme/product/",
    "ssh://git@github.com/acme/product.git",
    "git@github.com:acme/product.git\n",
  ]) {
    assert.equal(parseGithubRepo(url), "acme/product", url);
  }
  assert.equal(parseGithubRepo("https://github.com/acme/my.repo-1.git"), "acme/my.repo-1");
  for (const url of ["", null, "https://gitlab.com/acme/product.git", "https://github.com/acme", "https://github.com/acme/product; rm -rf x"]) {
    assert.equal(parseGithubRepo(url), null, String(url));
  }
});

test("resolveGithubRepo prefers GH_REPO, then origin, never upstream", () => {
  assert.equal(resolveGithubRepo({ cwd: repo, env: {} }), "acme/product");
  assert.equal(resolveGithubRepo({ cwd: repo, env: { GH_REPO: "other/thing" } }), "other/thing");
  assert.equal(resolveGithubRepo({ cwd: os.tmpdir(), env: {} }), null);
});

test("lockdown-main.sh applies protection to origin, not the template", () => {
  reset();
  const r = spawnSync("bash", [path.join(here, "lockdown-main.sh"), "--solo"], { cwd: repo, env: stubEnv(), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(calls(), /api -X PUT repos\/acme\/product\/branches\/main\/protection/);
  assert.doesNotMatch(calls(), /secure-vibe-coding-OS\/branches/);
});

test("lockdown-main.sh reads every origin URL form parseGithubRepo accepts", () => {
  // If the shell pattern rejects a form, the script falls back to `gh repo view`,
  // which answers with the template.
  try {
    for (const url of [
      "https://github.com/acme/product/",
      "https://github.com/acme/product.git",
      "https://github.com/acme/product",
      "ssh://git@github.com/acme/product.git",
      "https://github.com/acme/my.repo-1.git",
    ]) {
      reset();
      execFileSync("git", ["remote", "set-url", "origin", url], { cwd: repo });
      const want = parseGithubRepo(url);
      const r = spawnSync("bash", [path.join(here, "lockdown-main.sh"), "--status"], { cwd: repo, env: stubEnv(), encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      assert.ok(calls().includes(`api repos/${want}/branches/main/protection`), `${url} -> ${calls()}`);
      assert.doesNotMatch(calls(), /repo view/, url);
    }
  } finally {
    execFileSync("git", ["remote", "set-url", "origin", "git@github.com:acme/product.git"], { cwd: repo });
  }
});

test("lockdown-main.sh honours GH_REPO, with or without a host prefix", () => {
  for (const GH_REPO of ["other/thing", "github.com/other/thing"]) {
    reset();
    const r = spawnSync("bash", [path.join(here, "lockdown-main.sh"), "--status"], { cwd: repo, env: stubEnv({ GH_REPO }), encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(calls(), /api repos\/other\/thing\/branches\/main\/protection/, GH_REPO);
  }
});

test("pushTokenToGithub passes -R with the origin repo to gh secret set", () => {
  reset();
  // doppler.mjs resolves the repo from the working directory, so run it there.
  const token = 'dp.st.syn$thetic "with spaces';
  const script = `import { pushTokenToGithub } from ${JSON.stringify(path.join(here, "lib", "doppler.mjs"))}; pushTokenToGithub(${JSON.stringify(token)}, "DOPPLER_TOKEN");`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: repo, env: stubEnv(), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const secretCalls = callRecords().filter((c) => c.argv[0] === "secret" && c.argv[1] === "set");
  assert.equal(secretCalls.length, 1);
  assert.deepEqual(secretCalls[0].argv, ["secret", "set", "DOPPLER_TOKEN", "-R", "acme/product"]);
  assert.equal(secretCalls[0].stdin, token);
  assert.ok(!secretCalls[0].argv.includes(token));
  assert.ok(!secretCalls[0].argv.includes("--body"));
});

test("doppler-create-ci-token defers while origin is still the template", () => {
  // Fresh clone: origin is the template. No Doppler token may be minted and
  // nothing may be pushed to the template's secrets.
  const clone = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gh-clone-")));
  execFileSync("git", ["init", "-q"], { cwd: clone });
  execFileSync("git", ["remote", "add", "origin", "https://github.com/harperaa/secure-vibe-coding-OS.git"], { cwd: clone });
  fs.writeFileSync(path.join(bin, "doppler"), `#!/bin/sh\necho "doppler $*" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  reset();
  const r = spawnSync(process.execPath, [path.join(here, "setup.mjs"), "doppler-create-ci-token"], { cwd: clone, env: stubEnv(), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  assert.equal(out.deferred, true);
  assert.equal(calls(), "");
});

test("github-setup points gh at the product once the template is upstream", () => {
  const src = fs.readFileSync(path.join(here, "deploy.mjs"), "utf8");
  assert.match(src, /tryExecResult\(`gh repo set-default \$\{productRepo\}`\)/);
  // A failed set-default is reported with the command to finish it by hand.
  assert.match(src, /result\.warning = `[^`]*gh repo set-default \$\{productRepo\}`/);
});

test("setup.mjs has no spawn with shell: true (Semgrep spawn-shell-true)", () => {
  const src = fs.readFileSync(path.join(here, "setup.mjs"), "utf8");
  assert.doesNotMatch(src, /shell:\s*true/);
});
