// Values handed to `convex env set` / `vercel env add` must reach the child
// process byte-for-byte: no shell expansion of `$VAR`, `$(...)`, backticks or
// quotes (issue #39).
//
// Each test runs the real script from a throwaway copy of scripts/ with a fake
// `npx` first on PATH that records what it was given, so nothing touches the
// network, Convex, Vercel or Clerk.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

// The value from the issue: `$b` expands to nothing and `"` ends the quoting.
const TRICKY = 'a$b"c';

const FAKE_NPX = `#!/usr/bin/env node
const fs = require('node:fs');
const argv = process.argv.slice(2);
let stdin = '';
try { stdin = fs.readFileSync(0, 'utf-8'); } catch {}
fs.appendFileSync(process.env.FAKE_NPX_LOG, JSON.stringify({ argv, stdin }) + '\\n');
const cmd = argv.join(' ');
if (cmd.startsWith('convex login status')) {
  console.log('Logged in\\n  - Test Team (test-team)');
} else if (cmd.startsWith('convex dev') || cmd.startsWith('convex function-spec')) {
  process.exit(1); // "project created, functions not pushed"
}
`;

// Stand-ins for the Clerk/Svix calls `setup.mjs configure` makes before it
// reaches the Convex env step. The webhook secret they return is tricky too.
const FAKE_CLERK = `
const key = Buffer.from(JSON.stringify({ appId: 'app', oneTimeToken: 't', region: 'us' })).toString('base64');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ token: 'svix-token' }) });
export function createClerkClient() {
  return { webhooks: {
    createSvixApp: async () => {},
    generateSvixAuthURL: async () => ({ svix_url: 'https://svix.test/?key=' + key }),
  } };
}
`;
const FAKE_SVIX = `
export class Svix {
  endpoint = {
    list: async () => ({ data: [] }),
    create: async () => ({ id: 'ep' }),
    getSecret: async () => ({ key: ${JSON.stringify(TRICKY)} }),
  };
}
`;

function writePackage(root, name, source) {
  const dir = path.join(root, 'node_modules', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
  fs.writeFileSync(path.join(dir, 'index.js'), source);
}

/** Run `node scripts/<script> ...args` in a sandbox; return the fake-npx calls. */
function runScript(t, script, args, envLocal) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-passthrough-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  fs.copyFileSync(path.join(SCRIPTS_DIR, script), path.join(root, 'scripts', script));
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', 'doppler.mjs'), path.join(root, 'scripts', 'lib', 'doppler.mjs'));
  writePackage(root, '@clerk/backend', FAKE_CLERK);
  writePackage(root, 'svix', FAKE_SVIX);
  fs.writeFileSync(path.join(root, '.env.local'), envLocal.join('\n') + '\n');

  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'npx'), FAKE_NPX, { mode: 0o755 });
  const log = path.join(root, 'npx.log');
  fs.writeFileSync(log, '');

  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_NPX_LOG: log };
  delete env.CLERK_SECRET_KEY;
  spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
    cwd: root,
    env,
    input: '',
    encoding: 'utf-8',
    timeout: 60000,
  });

  const calls = fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { root, calls };
}

/** Value the fake CLI received for `convex env set KEY <value>`. */
function convexValue(calls, key) {
  const call = calls.find((c) => c.argv.slice(0, 4).join(' ') === `convex env set ${key}`);
  return call?.argv[4];
}

/** Value the fake CLI received on stdin for `vercel env add KEY production`. */
function vercelValue(calls, key) {
  const call = calls.find((c) => c.argv.slice(0, 5).join(' ') === `vercel env add ${key} production`);
  return call?.stdin;
}

const skip = process.platform === 'win32' ? 'fake npx is a POSIX script' : false;

test('deploy.mjs convex-prod-env passes values to convex unchanged', { skip }, (t) => {
  const { calls } = runScript(
    t,
    'deploy.mjs',
    ['convex-prod-env', '--deploy-key=prod:x|y', `--webhook-secret=${TRICKY}`],
    [`SECURITY_LOG_KEY=${TRICKY}`]
  );
  assert.equal(convexValue(calls, 'CLERK_WEBHOOK_SECRET'), TRICKY);
  assert.equal(convexValue(calls, 'SECURITY_LOG_KEY'), TRICKY);
});

test('deploy.mjs vercel-env-dev passes .env.local values to vercel unchanged', { skip }, (t) => {
  const { calls } = runScript(t, 'deploy.mjs', ['vercel-env-dev'], [
    `CLERK_SECRET_KEY=${TRICKY}`,
    'CSRF_SECRET=pa$$word`id`',
  ]);
  assert.equal(vercelValue(calls, 'CLERK_SECRET_KEY'), TRICKY);
  assert.equal(vercelValue(calls, 'CSRF_SECRET'), 'pa$$word`id`');
});

test('deploy.mjs vercel-env-dev does not execute a command substitution in a value', { skip }, (t) => {
  const value = 'x$(touch pwned)y';
  const { root, calls } = runScript(t, 'deploy.mjs', ['vercel-env-dev'], [`SESSION_SECRET=${value}`]);
  assert.equal(fs.existsSync(path.join(root, 'pwned')), false, 'value was executed by the shell');
  assert.equal(vercelValue(calls, 'SESSION_SECRET'), value);
});

test('deploy.mjs vercel-env passes values to vercel unchanged', { skip }, (t) => {
  const { calls } = runScript(
    t,
    'deploy.mjs',
    [
      'vercel-env',
      '--clerk-pk=pk_test_x',
      `--clerk-sk=${TRICKY}`,
      '--deploy-key=prod:x|y',
      '--frontend-api-url=https://clerk.test',
      '--site-name=Test',
    ],
    [`CSRF_SECRET=${TRICKY}`, 'SESSION_SECRET=s', 'SECURITY_LOG_KEY=k']
  );
  assert.equal(vercelValue(calls, 'CLERK_SECRET_KEY'), TRICKY);
  assert.equal(vercelValue(calls, 'CSRF_SECRET'), TRICKY);
});

test('deploy.mjs update-vercel-clerk-keys passes values to vercel unchanged', { skip }, (t) => {
  const { calls } = runScript(
    t,
    'deploy.mjs',
    ['update-vercel-clerk-keys', '--clerk-pk=pk_live_x', `--clerk-sk=${TRICKY}`, '--frontend-api-url=https://clerk.test'],
    []
  );
  assert.equal(vercelValue(calls, 'CLERK_SECRET_KEY'), TRICKY);
});

test('setup.mjs configure passes values to convex unchanged', { skip }, (t) => {
  const { calls } = runScript(t, 'setup.mjs', ['configure', '--admin-email=owner@site.test', '--clerk-sk=sk_test_x'], [
    'NEXT_PUBLIC_CONVEX_URL=https://happy-animal-1.convex.cloud',
    'NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.test',
    `SECURITY_LOG_KEY=${TRICKY}`,
  ]);
  assert.equal(convexValue(calls, 'SECURITY_LOG_KEY'), TRICKY);
  assert.equal(convexValue(calls, 'CLERK_WEBHOOK_SECRET'), TRICKY);
});

test('setup.mjs convex-setup passes the issuer to convex unchanged', { skip }, (t) => {
  const issuer = `https://${TRICKY}.clerk.test`;
  const { calls } = runScript(t, 'setup.mjs', ['convex-setup', '--project-name=Test'], [
    'CONVEX_DEPLOYMENT=dev:happy-animal-1',
    'NEXT_PUBLIC_CONVEX_URL=https://happy-animal-1.convex.cloud',
    `CLERK_JWT_ISSUER_DOMAIN=${issuer}`,
  ]);
  assert.equal(convexValue(calls, 'CLERK_JWT_ISSUER_DOMAIN'), issuer);
  assert.equal(convexValue(calls, 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL'), issuer);
});
