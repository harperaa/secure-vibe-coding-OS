import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedTestPath } from './lib/isolated-test-path.mjs';

// Issue #39: deploy.mjs and setup.mjs must hand env var values to the Convex
// and Vercel CLIs verbatim, never through a shell.
//
// Each test runs the real script in a throwaway copy of the repo layout with a
// fake `npx` first on PATH. The fake records the argv and stdin it receives,
// so the assertions are about what the child process actually got.

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

// `$b` and `$(...)` are expanded inside double quotes, and `"` ends the quoting.
const HOSTILE = 'a$b"c$(echo INJECTED)';

const FAKE_NPX = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
const sub = argv.slice(0, 3).join(' ');
let stdin = null;
if (sub === 'vercel env add' || sub === 'convex env set') {
  try { stdin = fs.readFileSync(0, 'utf-8'); } catch { stdin = null; }
}
fs.appendFileSync(process.env.FAKE_NPX_LOG, JSON.stringify({ argv, stdin }) + '\\n');
if (sub === 'convex login status') {
  console.log('Logged in\\n  - Test Team (test-team)');
  process.exit(0);
}
// Fail pushes and probes so the scripts take their recovery paths.
if (sub.startsWith('convex dev') || sub.startsWith('convex function-spec') ||
    sub.startsWith('convex deploy') || sub === 'vercel env pull') process.exit(1);
process.exit(0);
`;

// Stands in for @clerk/backend so `configure` reaches its Convex step offline.
// The retry delays are collapsed so the failing webhook flow does not take 17s.
const FAKE_CLERK = `
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...rest) => realSetTimeout(fn, 0, ...rest);
export function createClerkClient() {
  const offline = async () => { throw new Error('offline test stub'); };
  return { webhooks: { createSvixApp: offline, generateSvixAuthURL: offline } };
}
`;

function makeSandbox(t, envLocal) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-passthrough-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const file of ['deploy.mjs', 'setup.mjs', path.join('lib', 'doppler.mjs'), path.join('lib', 'github-repo.mjs')]) {
    fs.copyFileSync(path.join(SCRIPTS_DIR, file), path.join(root, 'scripts', file));
  }

  const clerkDir = path.join(root, 'node_modules', '@clerk', 'backend');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(
    path.join(clerkDir, 'package.json'),
    JSON.stringify({ name: '@clerk/backend', type: 'module', main: 'index.js' })
  );
  fs.writeFileSync(path.join(clerkDir, 'index.js'), FAKE_CLERK);

  const binDir = path.join(root, 'bin');
  fs.mkdirSync(binDir);
  // `npx vercel` must not be used: inside this repo npx's install of the CLI is
  // blocked by strict-allow-scripts. The npx stub rejects it without recording a
  // `vercel ...` call, so the Vercel assertions below fail if a script reverts.
  fs.writeFileSync(
    path.join(binDir, 'npx'),
    FAKE_NPX.replace(
      'const argv = process.argv.slice(2);',
      "const argv = process.argv.slice(2);\nif (argv[0] === 'vercel') { fs.appendFileSync(process.env.FAKE_NPX_LOG, JSON.stringify({ argv: ['npx', ...argv], stdin: null }) + '\\n'); process.exit(1); }"
    ),
    { mode: 0o755 }
  );
  // The globally installed `vercel` binary, recorded as `vercel ...`.
  fs.writeFileSync(path.join(binDir, 'vercel'), FAKE_NPX.replace("const argv = process.argv.slice(2);", "const argv = ['vercel', ...process.argv.slice(2)];"), { mode: 0o755 });
  // Stub doppler/gh too so a stray call cannot resolve a real CLI.
  for (const name of ['doppler', 'gh']) {
    fs.writeFileSync(
      path.join(binDir, name),
      `#!${process.execPath}\nprocess.exit(0);\n`,
      { mode: 0o755 }
    );
  }
  const testPath = isolatedTestPath([binDir], t);

  fs.writeFileSync(path.join(root, '.env.local'), envLocal);

  const log = path.join(root, 'npx-calls.jsonl');
  return {
    run(script, args) {
      const env = { ...process.env, FAKE_NPX_LOG: log, PATH: testPath };
      delete env.CLERK_SECRET_KEY;
      const r = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
        cwd: root,
        encoding: 'utf-8',
        env,
        timeout: 60000,
      });
      const calls = fs.existsSync(log)
        ? fs.readFileSync(log, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
        : [];
      return { ...r, calls };
    },
  };
}

// The value `convex env set KEY` received on stdin, or undefined if it never ran.
function convexValue(calls, key) {
  const call = calls.find(
    (c) => c.argv.slice(0, 3).join(' ') === 'convex env set' && c.argv.includes(key)
  );
  if (!call) return undefined;
  // Value must be on stdin, not argv after the key.
  assert.equal(call.argv[call.argv.indexOf(key) + 1], undefined);
  assert.ok(!call.argv.includes(HOSTILE));
  return call.stdin;
}

// The value `vercel env add KEY ...` received on stdin, or undefined if it never ran.
function vercelValue(calls, key) {
  const call = calls.find(
    (c) => c.argv.slice(0, 3).join(' ') === 'vercel env add' && c.argv.includes(key)
  );
  if (!call) return undefined;
  assert.ok(!call.argv.includes(HOSTILE));
  assert.ok(!call.argv.includes('--value'));
  return call.stdin;
}

// True if a script tried to remove a Vercel variable. Vercel CLI 66 refuses `env rm --yes`
// from an agent session, so values are overwritten with `env add --force` instead.
const usedVercelEnvRm = (calls) => calls.some((c) => c.argv.slice(0, 3).join(' ') === 'vercel env rm');

// True if any script reached for the Vercel CLI through npx.
const usedNpxVercel = (calls) => calls.some((c) => c.argv[0] === 'npx' && c.argv[1] === 'vercel');

test('deploy.mjs convex-prod-env passes SECURITY_LOG_KEY to Convex verbatim', (t) => {
  const box = makeSandbox(t, `SECURITY_LOG_KEY=${HOSTILE}\n`);
  const { calls } = box.run('deploy.mjs', ['convex-prod-env', '--deploy-key=prod:fake']);
  assert.equal(convexValue(calls, 'SECURITY_LOG_KEY'), HOSTILE);
});

test('deploy.mjs vercel-env-dev passes .env.local values to Vercel verbatim', (t) => {
  const box = makeSandbox(t, `CSRF_SECRET=${HOSTILE}\n`);
  const { calls } = box.run('deploy.mjs', ['vercel-env-dev']);
  assert.equal(vercelValue(calls, 'CSRF_SECRET'), HOSTILE);
  assert.equal(usedNpxVercel(calls), false);
  assert.equal(usedVercelEnvRm(calls), false);
});

test('deploy.mjs vercel-env passes .env.local values to Vercel verbatim', (t) => {
  const box = makeSandbox(t, `CSRF_SECRET=${HOSTILE}\nSECURITY_LOG_KEY=plain\n`);
  const { calls } = box.run('deploy.mjs', [
    'vercel-env',
    '--clerk-pk=pk_live_fake',
    '--clerk-sk=sk_live_fake',
    '--deploy-key=prod:fake',
    '--frontend-api-url=https://clerk.example.test',
    '--site-name=Test',
  ]);
  assert.equal(vercelValue(calls, 'CSRF_SECRET'), HOSTILE);
  assert.equal(usedNpxVercel(calls), false);
  assert.equal(usedVercelEnvRm(calls), false);
});

test('deploy.mjs update-vercel-clerk-keys passes the Clerk secret key to Vercel verbatim', (t) => {
  const box = makeSandbox(t, '');
  const { calls } = box.run('deploy.mjs', [
    'update-vercel-clerk-keys',
    '--clerk-pk=pk_live_fake',
    `--clerk-sk=${HOSTILE}`,
    '--frontend-api-url=https://clerk.example.test',
  ]);
  assert.equal(vercelValue(calls, 'CLERK_SECRET_KEY'), HOSTILE);
  assert.equal(usedNpxVercel(calls), false);
  assert.equal(usedVercelEnvRm(calls), false);
});

test('setup.mjs configure passes SECURITY_LOG_KEY to Convex verbatim', (t) => {
  const box = makeSandbox(
    t,
    [
      'CLERK_SECRET_KEY=sk_test_fake',
      'NEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud',
      `SECURITY_LOG_KEY=${HOSTILE}`,
      '',
    ].join('\n')
  );
  const { calls } = box.run('setup.mjs', ['configure', '--admin-email=owner@site.test']);
  assert.equal(convexValue(calls, 'SECURITY_LOG_KEY'), HOSTILE);
});

test('setup.mjs convex-setup passes the Clerk issuer to Convex verbatim', (t) => {
  const box = makeSandbox(
    t,
    [
      'CONVEX_DEPLOYMENT=dev:fake-123',
      'NEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud',
      `CLERK_JWT_ISSUER_DOMAIN=${HOSTILE}`,
      '',
    ].join('\n')
  );
  const { calls } = box.run('setup.mjs', ['convex-setup', '--project-name=Test']);
  assert.equal(convexValue(calls, 'CLERK_JWT_ISSUER_DOMAIN'), HOSTILE);
});
