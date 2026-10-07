#!/usr/bin/env node

/**
 * Dependency audit gate.
 *
 * Why this exists: `npm audit --audit-level=high` has one knob, severity, and
 * no way to say "this one advisory is known, unfixable, and irrelevant here".
 * When an advisory with no patched release lands in a devDependency chain, the
 * security job goes red on every PR and stays red for months. A check that is
 * always red trains reviewers to ignore it, which is worse than no check.
 *
 * This runs `npm audit --json`, fails on any high or critical finding, and
 * skips only the advisories listed in scripts/audit-allowlist.json. Each entry
 * must carry a reason. Packages that are vulnerable solely because they depend
 * on an allowlisted package are skipped too (npm reports the whole chain).
 *
 * Any new advisory, allowlisted or not, still shows up here. The allowlist
 * covers a GHSA id, not a package, so a second advisory on braces would fail.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FAIL_ON = new Set(["high", "critical"]);
const here = dirname(fileURLToPath(import.meta.url));
const allowlist = JSON.parse(readFileSync(join(here, "audit-allowlist.json"), "utf8"));
for (const [id, entry] of Object.entries(allowlist)) {
  if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(id) || typeof entry?.reason !== "string" || !entry.reason.trim()) {
    console.error(`audit gate: allowlist entry "${id}" must be a GHSA id with a non-empty "reason"`);
    process.exit(2);
  }
}

let report;
try {
  report = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
  if (!err.stdout) {
    console.error(err.stderr || err.message);
    process.exit(2);
  }
  report = err.stdout;
}

// npm writes `{"error": {...}}` (still exit 1) when the audit endpoint is
// unreachable or rejects the request. That is not a clean report, and treating
// it as "no findings" would pass CI without auditing anything.
const parsed = JSON.parse(report);
if (parsed.error || typeof parsed.vulnerabilities !== "object" || parsed.vulnerabilities === null) {
  console.error("audit gate: npm audit did not return a vulnerability report");
  console.error(JSON.stringify(parsed.error ?? parsed, null, 2).slice(0, 2000));
  process.exit(2);
}
const vulns = parsed.vulnerabilities;
const ghsaOf = (url) => (url?.match(/GHSA-[a-z0-9-]+/i) ?? [null])[0];

// A package is "covered" when every reason npm gives for it is either an
// allowlisted advisory or a dependency on another covered package.
// Iterate to a fixpoint so chains resolve regardless of object order.
const covered = new Set();
let changed = true;
while (changed) {
  changed = false;
  for (const [name, v] of Object.entries(vulns)) {
    if (covered.has(name)) continue;
    const ok = v.via.every((via) =>
      typeof via === "string" ? covered.has(via) : Boolean(allowlist[ghsaOf(via.url)])
    );
    if (ok) { covered.add(name); changed = true; }
  }
}

const skipped = [];
const failing = [];
for (const [name, v] of Object.entries(vulns)) {
  if (!FAIL_ON.has(v.severity)) continue;
  (covered.has(name) ? skipped : failing).push(v);
}

for (const v of skipped) {
  const ids = v.via.filter((x) => typeof x === "object").map((x) => ghsaOf(x.url)).filter(Boolean);
  const why = ids.length ? ids.join(", ") : `depends on allowlisted ${v.via.join(", ")}`;
  console.log(`skip  ${v.name.padEnd(28)} ${v.severity.padEnd(9)} ${why}`);
}
for (const v of failing) {
  const ids = v.via.filter((x) => typeof x === "object").map((x) => `${ghsaOf(x.url)} ${x.title}`);
  const why = ids.length ? ids.join("; ") : `depends on ${v.via.join(", ")}`;
  console.log(`FAIL  ${v.name.padEnd(28)} ${v.severity.padEnd(9)} ${why}`);
}

if (failing.length) {
  console.log(`\n${failing.length} high/critical finding(s) not in scripts/audit-allowlist.json. Run \`npm audit\` for details.`);
  process.exit(1);
}
console.log(`\naudit gate: ok (${skipped.length} allowlisted, ${Object.keys(vulns).length} total findings below threshold or allowlisted)`);
