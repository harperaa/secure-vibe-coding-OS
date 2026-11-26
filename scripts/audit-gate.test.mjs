import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedTestPath } from './lib/isolated-test-path.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ALLOWED = 'GHSA-aaaa-bbbb-cccc';
const OTHER = 'GHSA-dddd-eeee-ffff';

/**
 * Runs a copy of audit-gate.mjs next to a temporary audit-allowlist.json, with
 * a fake `npm` first on an isolated PATH. The fake prints `stdout` and exits
 * with `npmExit` (real `npm audit` exits 1 whenever it reports anything).
 */
function runGate(t, { stdout, npmExit = 1, allowlist = { [ALLOWED]: { reason: 'dev-only chain' } } }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-gate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  fs.copyFileSync(path.join(here, 'audit-gate.mjs'), path.join(dir, 'audit-gate.mjs'));
  fs.writeFileSync(path.join(dir, 'audit-allowlist.json'), JSON.stringify(allowlist));
  fs.writeFileSync(path.join(dir, 'npm-stdout'), stdout);
  fs.writeFileSync(path.join(dir, 'npm-argv'), '');

  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, 'npm'),
    `#!/bin/sh\necho "$@" >> "${dir}/npm-argv"\ncat "${dir}/npm-stdout"\nexit ${npmExit}\n`,
    { mode: 0o755 }
  );

  const result = spawnSync(process.execPath, [path.join(dir, 'audit-gate.mjs')], {
    cwd: dir,
    encoding: 'utf8',
    env: { PATH: isolatedTestPath([bin], t) },
  });
  return { ...result, npmArgv: fs.readFileSync(path.join(dir, 'npm-argv'), 'utf8') };
}

const report = (vulnerabilities) => JSON.stringify({ auditReportVersion: 2, vulnerabilities });
const advisory = (ghsa, title = 'Some advisory') => ({
  title,
  url: `https://github.com/advisories/${ghsa}`,
});
const vuln = (name, severity, via) => ({ name, severity, via });

test('an empty report passes and the gate asks npm for a JSON audit', (t) => {
  const r = runGate(t, { stdout: report({}), npmExit: 0 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /audit gate: ok/);
  assert.equal(r.npmArgv.trim(), 'audit --json');
});

test('findings below high pass', (t) => {
  const r = runGate(t, {
    stdout: report({
      a: vuln('a', 'low', [advisory(OTHER)]),
      b: vuln('b', 'moderate', [advisory(OTHER)]),
    }),
  });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /FAIL/);
});

for (const severity of ['high', 'critical']) {
  test(`a ${severity} finding that is not allowlisted fails with exit 1`, (t) => {
    const r = runGate(t, {
      stdout: report({ leftpad: vuln('leftpad', severity, [advisory(OTHER, 'Prototype pollution')]) }),
    });
    assert.equal(r.status, 1);
    assert.match(r.stdout, new RegExp(`FAIL\\s+leftpad\\s+${severity}\\s+${OTHER} Prototype pollution`));
    assert.match(r.stdout, /1 high\/critical finding\(s\) not in scripts\/audit-allowlist\.json/);
  });
}

test('an allowlisted GHSA is skipped', (t) => {
  const r = runGate(t, { stdout: report({ braces: vuln('braces', 'high', [advisory(ALLOWED)]) }) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`skip\\s+braces\\s+high\\s+${ALLOWED}`));
  assert.match(r.stdout, /audit gate: ok \(1 allowlisted/);
});

test('the allowlist lookup uses the id as written in the advisory URL', (t) => {
  // Documents current behaviour: ids are matched case-sensitively.
  const r = runGate(t, {
    stdout: report({ braces: vuln('braces', 'high', [advisory(ALLOWED.toLowerCase())]) }),
  });
  assert.equal(r.status, 1);
});

test('a package vulnerable only through an allowlisted one is skipped, in either object order', (t) => {
  const direct = vuln('braces', 'high', [advisory(ALLOWED)]);
  const middle = vuln('micromatch', 'high', ['braces']);
  const top = vuln('fast-glob', 'critical', ['micromatch']);

  for (const vulnerabilities of [
    { braces: direct, micromatch: middle, 'fast-glob': top },
    { 'fast-glob': top, micromatch: middle, braces: direct },
  ]) {
    const r = runGate(t, { stdout: report(vulnerabilities) });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /skip\s+micromatch\s+high\s+depends on allowlisted braces/);
    assert.match(r.stdout, /skip\s+fast-glob\s+critical\s+depends on allowlisted micromatch/);
    assert.match(r.stdout, /audit gate: ok \(3 allowlisted/);
  }
});

test('a second, non-allowlisted advisory on an allowlisted package still fails', (t) => {
  const r = runGate(t, {
    stdout: report({
      braces: vuln('braces', 'high', [advisory(ALLOWED), advisory(OTHER, 'New problem')]),
      micromatch: vuln('micromatch', 'high', ['braces']),
    }),
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL\s+braces/);
  assert.match(r.stdout, /FAIL\s+micromatch\s+high\s+depends on braces/);
  assert.match(r.stdout, /2 high\/critical finding/);
});

test('a dependent with its own non-allowlisted advisory fails while the allowlisted package is skipped', (t) => {
  const r = runGate(t, {
    stdout: report({
      braces: vuln('braces', 'high', [advisory(ALLOWED)]),
      micromatch: vuln('micromatch', 'high', ['braces', advisory(OTHER)]),
    }),
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /skip\s+braces/);
  assert.match(r.stdout, /FAIL\s+micromatch/);
});

test('npm error output is not treated as a clean report (exit 2)', (t) => {
  const r = runGate(t, {
    stdout: JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'audit endpoint unreachable' } }),
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /npm audit did not return a vulnerability report/);
  assert.match(r.stderr, /ENOTFOUND/);
  assert.doesNotMatch(r.stdout, /audit gate: ok/);
});

test('JSON without a vulnerabilities object exits 2', (t) => {
  for (const stdout of ['{}', '{"vulnerabilities":null}']) {
    const r = runGate(t, { stdout });
    assert.equal(r.status, 2, stdout);
  }
});

test('a failing npm with empty stdout exits 2', (t) => {
  const r = runGate(t, { stdout: '' });
  assert.equal(r.status, 2);
  assert.doesNotMatch(r.stdout, /audit gate: ok/);
});

test('an allowlist entry with a bad id or an empty reason exits 2 before npm runs', (t) => {
  for (const allowlist of [
    { 'CVE-2026-0001': { reason: 'not a GHSA id' } },
    { 'GHSA-aaaa-bbbb': { reason: 'too short' } },
    { [ALLOWED]: { reason: '' } },
    { [ALLOWED]: { reason: '   ' } },
    { [ALLOWED]: {} },
    { [ALLOWED]: null },
  ]) {
    const r = runGate(t, { stdout: report({}), npmExit: 0, allowlist });
    assert.equal(r.status, 2, JSON.stringify(allowlist));
    assert.match(r.stderr, /must be a GHSA id with a non-empty "reason"/);
    assert.equal(r.npmArgv, '');
  }
});
