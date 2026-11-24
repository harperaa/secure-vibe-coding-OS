/**
 * ensureProject: new projects remove unused `stg`; existing projects leave
 * environments untouched. Uses a fake `doppler` on an isolated PATH.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

function makeFakeDoppler(binDir, logPath, mode) {
  // mode: 'new' → projects get fails; 'existing' → projects get succeeds
  const script = `#!/bin/sh
echo "$*" >> "${logPath}"
cmd="$1 $2"
case "$cmd" in
  "projects get")
    if [ "${mode}" = "existing" ]; then
      echo '{}'
      exit 0
    fi
    exit 1
    ;;
  "projects create")
    exit 0
    ;;
  "environments delete")
    # tolerate missing stg: exit 0 when present, 1 when simulating not-found
    exit 0
    ;;
  "setup"*)
    exit 0
    ;;
  "me"*)
    echo '{}'
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`;
  fs.writeFileSync(path.join(binDir, 'doppler'), script, { mode: 0o755 });
}

function isolatedEnv(binDir, extra = {}) {
  // Stubs first, then scratch bin (node/npm + fake doppler), then system bins only.
  return {
    ...process.env,
    ...extra,
    PATH: `${binDir}${path.delimiter}/usr/bin${path.delimiter}/bin`,
  };
}

function calls(logPath) {
  return fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf-8') : '';
}

test('new Doppler project removes stg environment', async () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doppler-fake-'));
  const logPath = path.join(binDir, 'calls.log');
  makeFakeDoppler(binDir, logPath, 'new');

  // Import a fresh copy so PATH is read when ensureProject shells out.
  const tmpMod = path.join(binDir, 'doppler.mjs');
  const ghMod = path.join(binDir, 'github-repo.mjs');
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', 'doppler.mjs'), tmpMod);
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', 'github-repo.mjs'), ghMod);

  // Run via a tiny driver so the child inherits the isolated PATH.
  const driver = path.join(binDir, 'driver.mjs');
  fs.writeFileSync(
    driver,
    `
import { ensureProject } from './doppler.mjs';
const r = ensureProject('test-app');
console.log(JSON.stringify(r));
`
  );

  const r = spawnSync(process.execPath, [driver], {
    encoding: 'utf-8',
    env: isolatedEnv(binDir),
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const result = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.deepEqual(result, { created: true, stgRemoved: true });

  const log = calls(logPath);
  assert.match(log, /projects create/);
  // Shell strips quotes before argv reaches the fake CLI.
  assert.match(log, /environments delete stg --project test-app --yes/);
  assert.doesNotMatch(log, /configs delete/);
});

test('existing Doppler project leaves environments untouched', () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doppler-fake-'));
  const logPath = path.join(binDir, 'calls.log');
  makeFakeDoppler(binDir, logPath, 'existing');

  const tmpMod = path.join(binDir, 'doppler.mjs');
  const ghMod = path.join(binDir, 'github-repo.mjs');
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', 'doppler.mjs'), tmpMod);
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', 'github-repo.mjs'), ghMod);

  const driver = path.join(binDir, 'driver.mjs');
  fs.writeFileSync(
    driver,
    `
import { ensureProject } from './doppler.mjs';
const r = ensureProject('already-there');
console.log(JSON.stringify(r));
`
  );

  const r = spawnSync(process.execPath, [driver], {
    encoding: 'utf-8',
    env: isolatedEnv(binDir),
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const result = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.deepEqual(result, { created: false, stgRemoved: false });

  const log = calls(logPath);
  assert.match(log, /projects get/);
  assert.doesNotMatch(log, /projects create/);
  assert.doesNotMatch(log, /environments delete/);
  assert.doesNotMatch(log, /configs delete/);
});
