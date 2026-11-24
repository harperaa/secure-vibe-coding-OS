import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #46: `setup.mjs convex-setup` on a fresh project.
//
// Each test runs the real script in a throwaway copy of the repo layout with
// fake `npx` and `doppler` binaries first on PATH. The fake Convex CLI behaves
// like a brand-new deployment: it refuses to push functions until
// CLERK_JWT_ISSUER_DOMAIN has been set on it (auth.config.ts needs it).

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ISSUER = 'https://fake-app.clerk.accounts.dev';

const FAKE_NPX = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const argv = process.argv.slice(2);
const sub = argv.slice(0, 3).join(' ');
const stateFile = path.join(process.cwd(), 'convex-state.json');
const state = fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
  : { env: {}, pushed: false };
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state));

if (sub === 'convex login status') {
  console.log('Logged in\\n  - Test Team (test-team)');
} else if (sub === 'convex env set') {
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf-8'); } catch {}
  // Prefer stdin (omit-value form); fall back to argv for older callers.
  state.env[argv[3]] = stdin !== '' ? stdin : argv[4];
  save();
} else if (sub === 'convex dev --once') {
  if (argv.includes('--configure=new')) {
    // The real CLI writes the deployment to .env.local before it pushes.
    fs.appendFileSync(
      path.join(process.cwd(), '.env.local'),
      'CONVEX_DEPLOYMENT=dev:fake-123\\nNEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud\\n'
    );
  }
  if (!state.env.CLERK_JWT_ISSUER_DOMAIN) {
    console.error('Environment variable CLERK_JWT_ISSUER_DOMAIN is used in auth config file but its value was not set');
    process.exit(1);
  }
  state.pushed = true;
  save();
} else if (sub.startsWith('convex function-spec')) {
  console.log(JSON.stringify({ functions: state.pushed ? [{ identifier: 'users.js:current' }] : [] }));
} else {
  process.exit(1);
}
`;

const FAKE_DOPPLER = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
let stdin = null;
if (!process.stdin.isTTY) {
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { stdin = null; }
}
fs.appendFileSync(process.env.FAKE_DOPPLER_LOG, JSON.stringify({ argv, stdin }) + '\\n');
if (argv[0] === 'secrets' && argv[1] === 'download') {
  console.log(process.env.FAKE_DOPPLER_SECRETS);
}
`;

function makeSandbox(t, { envLocal, doppler, convexEnv }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convex-setup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const file of ['setup.mjs', path.join('lib', 'doppler.mjs'), path.join('lib', 'github-repo.mjs')]) {
    fs.copyFileSync(path.join(SCRIPTS_DIR, file), path.join(root, 'scripts', file));
  }

  // setup.mjs imports @clerk/backend at load time; convex-setup never calls it.
  const clerkDir = path.join(root, 'node_modules', '@clerk', 'backend');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(
    path.join(clerkDir, 'package.json'),
    JSON.stringify({ name: '@clerk/backend', type: 'module', main: 'index.js' })
  );
  fs.writeFileSync(path.join(clerkDir, 'index.js'), 'export function createClerkClient() {}\n');

  const binDir = path.join(root, 'bin');
  fs.mkdirSync(binDir);
  fs.writeFileSync(path.join(binDir, 'npx'), FAKE_NPX, { mode: 0o755 });
  fs.writeFileSync(path.join(binDir, 'doppler'), FAKE_DOPPLER, { mode: 0o755 });

  fs.writeFileSync(path.join(root, '.env.local'), envLocal);
  if (convexEnv) {
    fs.writeFileSync(path.join(root, 'convex-state.json'), JSON.stringify({ env: convexEnv, pushed: true }));
  }
  if (doppler) {
    fs.writeFileSync(path.join(root, '.doppler.yaml'), 'setup:\n  project: test-project\n  config: dev\n');
  }

  const dopplerLog = path.join(root, 'doppler-calls.jsonl');
  return {
    run() {
      const env = {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        FAKE_DOPPLER_LOG: dopplerLog,
        FAKE_DOPPLER_SECRETS: JSON.stringify(doppler || {}),
      };
      // The issuer must come from the sandbox, not from the developer's shell.
      delete env.CLERK_JWT_ISSUER_DOMAIN;
      delete env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL;
      const r = spawnSync(
        process.execPath,
        [path.join(root, 'scripts', 'setup.mjs'), 'convex-setup', '--project-name=Test'],
        {
          cwd: root,
          encoding: 'utf-8',
          env,
          timeout: 60000,
        }
      );
      const statePath = path.join(root, 'convex-state.json');
      return {
        result: JSON.parse(r.stdout),
        convex: fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf-8')) : { env: {}, pushed: false },
        dopplerCalls: fs.existsSync(dopplerLog)
          ? fs.readFileSync(dopplerLog, 'utf-8').trim().split('\n').map((l) => JSON.parse(l))
          : [],
        envLocal: fs.readFileSync(path.join(root, '.env.local'), 'utf-8'),
      };
    },
  };
}

const siteUrlSets = (calls) =>
  calls.filter(
    (c) =>
      c.argv[0] === 'secrets' &&
      c.argv[1] === 'set' &&
      (c.argv[2] === 'NEXT_PUBLIC_SITE_URL' || String(c.argv[2] || '').startsWith('NEXT_PUBLIC_SITE_URL='))
  );
const setsSiteUrl = (calls) =>
  siteUrlSets(calls).some(
    (c) =>
      (c.argv[2] === 'NEXT_PUBLIC_SITE_URL' && c.stdin === 'http://localhost:3000') ||
      c.argv[2] === 'NEXT_PUBLIC_SITE_URL=http://localhost:3000'
  );

test('legacy mode: convex-setup resolves the Clerk issuer from .env.local on a fresh project', (t) => {
  const box = makeSandbox(t, { envLocal: `CLERK_JWT_ISSUER_DOMAIN=${ISSUER}\n` });
  const { result, convex, envLocal } = box.run();
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(convex.env.CLERK_JWT_ISSUER_DOMAIN, ISSUER);
  assert.equal(convex.pushed, true);
  assert.match(envLocal, /^NEXT_PUBLIC_SITE_URL=http:\/\/localhost:3000$/m);
});

test('Doppler mode: convex-setup resolves the Clerk issuer from Doppler dev on a fresh project with an empty .env.local', (t) => {
  const box = makeSandbox(t, { envLocal: '', doppler: { CLERK_JWT_ISSUER_DOMAIN: ISSUER } });
  const { result, convex, dopplerCalls } = box.run();
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(convex.env.CLERK_JWT_ISSUER_DOMAIN, ISSUER);
  assert.equal(convex.pushed, true);
  assert.ok(setsSiteUrl(dopplerCalls), 'NEXT_PUBLIC_SITE_URL was not pushed to Doppler dev');
});

test('Doppler mode: convex-setup pushes NEXT_PUBLIC_SITE_URL to Doppler dev when Convex is already configured', (t) => {
  const box = makeSandbox(t, {
    envLocal: 'CONVEX_DEPLOYMENT=dev:fake-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud\n',
    doppler: { CLERK_JWT_ISSUER_DOMAIN: ISSUER },
    // The issuer is already on the deployment (the issue's manual workaround).
    convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER },
  });
  const first = box.run();
  assert.equal(first.result.success, true, JSON.stringify(first.result));
  assert.equal(first.result.alreadyConfigured, true);
  assert.ok(setsSiteUrl(first.dopplerCalls), 'NEXT_PUBLIC_SITE_URL was not pushed to Doppler dev');
});

test('Doppler mode: convex-setup leaves an existing NEXT_PUBLIC_SITE_URL in Doppler dev alone', (t) => {
  const box = makeSandbox(t, {
    envLocal: 'CONVEX_DEPLOYMENT=dev:fake-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud\n',
    doppler: { CLERK_JWT_ISSUER_DOMAIN: ISSUER, NEXT_PUBLIC_SITE_URL: 'http://localhost:3005' },
    convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER },
  });
  const { result, dopplerCalls } = box.run();
  assert.equal(result.success, true, JSON.stringify(result));
  assert.deepEqual(siteUrlSets(dopplerCalls), []);
});

test('legacy mode: convex-setup on an already configured project does not touch Doppler or .env.local', (t) => {
  const envLocal = 'CONVEX_DEPLOYMENT=dev:fake-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-123.convex.cloud\n';
  const box = makeSandbox(t, { envLocal, convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER } });
  const run = box.run();
  assert.equal(run.result.alreadyConfigured, true, JSON.stringify(run.result));
  assert.deepEqual(run.dopplerCalls, []);
  assert.equal(run.envLocal, envLocal);
});
