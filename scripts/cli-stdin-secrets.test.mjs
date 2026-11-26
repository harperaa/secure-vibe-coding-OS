import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedTestPath } from './lib/isolated-test-path.mjs';

// Secret values handed to CLIs must arrive on stdin (or env), never as argv.
// Fake CLIs on PATH record argv + stdin so these assertions fail on the old form.

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
// Spaces/$/quotes in the middle; no leading/trailing whitespace (convex env list trims lines).
const HOSTILE = 'a$b"c $(echo INJECTED) mid-space';

function makeBin(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-stdin-secrets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const log = path.join(root, 'calls.jsonl');
  const testPath = isolatedTestPath([bin], t);

  const recorder = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
let stdin = null;
try { stdin = fs.readFileSync(0, 'utf8'); } catch { stdin = null; }
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify({ cmd: process.env.FAKE_CLI_NAME, argv, stdin }) + '\\n');
process.exit(0);
`;

  for (const name of ['gh', 'doppler', 'npx']) {
    fs.writeFileSync(path.join(bin, name), recorder, { mode: 0o755 });
  }

  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const file of [
    path.join('lib', 'doppler.mjs'),
    path.join('lib', 'github-repo.mjs'),
    path.join('lib', 'convex-env-list.mjs'),
    'sync-convex-env.mjs',
  ]) {
    fs.copyFileSync(path.join(SCRIPTS_DIR, file), path.join(root, 'scripts', file));
  }
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'cli-stdin-secrets-fixture' })
  );
  fs.writeFileSync(path.join(root, '.doppler.yaml'), 'setup:\n  project: cli-stdin-secrets-fixture\n  config: dev\n');

  const readCalls = () =>
    fs.existsSync(log)
      ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];

  const envFor = (cliName) => {
    const env = {
      ...process.env,
      PATH: testPath,
      FAKE_CLI_LOG: log,
      FAKE_CLI_NAME: cliName,
    };
    delete env.GH_REPO;
    return env;
  };

  return { root, bin, log, readCalls, envFor, reset: () => fs.rmSync(log, { force: true }) };
}

test('pushTokenToGithub sends the token on stdin and omits --body', (t) => {
  const box = makeBin(t);
  box.reset();
  const script = `
    import { pushTokenToGithub } from ${JSON.stringify(path.join(box.root, 'scripts', 'lib', 'doppler.mjs'))};
    pushTokenToGithub(${JSON.stringify(HOSTILE)}, 'DOPPLER_TOKEN', 'acme/product');
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: box.root,
    env: box.envFor('gh'),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const calls = box.readCalls().filter((c) => c.argv[0] === 'secret');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].argv, ['secret', 'set', 'DOPPLER_TOKEN', '-R', 'acme/product']);
  assert.equal(calls[0].stdin, HOSTILE);
  assert.ok(!calls[0].argv.some((a) => a.includes(HOSTILE) || a === '--body'));
});

test('setSecret sends the value on stdin, not as KEY=value argv', (t) => {
  const box = makeBin(t);
  box.reset();
  const script = `
    import { setSecret } from ${JSON.stringify(path.join(box.root, 'scripts', 'lib', 'doppler.mjs'))};
    setSecret('CSRF_SECRET', ${JSON.stringify(HOSTILE)}, 'dev', 'cli-stdin-secrets-fixture');
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: box.root,
    env: box.envFor('doppler'),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const calls = box.readCalls().filter((c) => c.argv[0] === 'secrets' && c.argv[1] === 'set');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].argv[2], 'CSRF_SECRET');
  assert.ok(!calls[0].argv.some((a) => String(a).includes(HOSTILE) || String(a).includes('=')));
  assert.equal(calls[0].stdin, HOSTILE);
});

test('sync-convex-env.mjs passes secret values to convex on stdin', (t) => {
  const box = makeBin(t);
  box.reset();

  // Fake npx: persist env set values so the post-sync verify list succeeds.
  const npx = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const argv = process.argv.slice(2);
let stdin = null;
try { stdin = fs.readFileSync(0, 'utf8'); } catch { stdin = null; }
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify({ cmd: 'npx', argv, stdin }) + '\\n');
const stateFile = path.join(process.cwd(), 'convex-env-state.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
if (argv[0] === 'convex' && argv[1] === 'env' && argv[2] === 'list') {
  // Like the real CLI when it detects an AI agent (AI_AGENT, CLAUDECODE): names only,
  // unless --include-values is passed.
  const withValues = argv.includes('--include-values');
  for (const [k, v] of Object.entries(state)) console.log(withValues ? k + '=' + v : k);
  process.exit(0);
}
if (argv[0] === 'convex' && argv[1] === 'env' && argv[2] === 'set') {
  state[argv[3]] = stdin;
  fs.writeFileSync(stateFile, JSON.stringify(state));
  process.exit(0);
}
process.exit(0);
`;
  fs.writeFileSync(path.join(box.root, 'bin', 'npx'), npx, { mode: 0o755 });

  const doppler = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
if (argv[0] === 'secrets' && argv[1] === 'download') {
  console.log(JSON.stringify({ SECURITY_LOG_KEY: ${JSON.stringify(HOSTILE)} }));
  process.exit(0);
}
process.exit(0);
`;
  fs.writeFileSync(path.join(box.root, 'bin', 'doppler'), doppler, { mode: 0o755 });

  const r = spawnSync(process.execPath, [path.join(box.root, 'scripts', 'sync-convex-env.mjs'), '--config=dev'], {
    cwd: box.root,
    env: box.envFor('npx'),
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const sets = box.readCalls().filter(
    (c) => c.argv[0] === 'convex' && c.argv[1] === 'env' && c.argv[2] === 'set'
  );
  assert.ok(sets.length >= 1, JSON.stringify(box.readCalls()));
  const security = sets.find((c) => c.argv[3] === 'SECURITY_LOG_KEY');
  assert.ok(security, JSON.stringify(sets));
  assert.equal(security.stdin, HOSTILE);
  assert.equal(security.argv[4], undefined);
  assert.ok(!security.argv.includes(HOSTILE));
});
