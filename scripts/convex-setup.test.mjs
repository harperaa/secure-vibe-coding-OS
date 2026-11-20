// End-to-end tests for `node scripts/setup.mjs convex-setup` (issue #46).
//
// setup.mjs runs its subcommand on import, so each test copies the script into
// a throwaway sandbox and runs it there with fake `npx` (Convex CLI) and
// `doppler` binaries first on PATH. Nothing touches a real Convex deployment or
// Doppler project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ISSUER = 'https://example-app-12.clerk.accounts.dev';

// Fake Convex CLI. Like the real one, it refuses to push while
// CLERK_JWT_ISSUER_DOMAIN is missing from the deployment's env.
const FAKE_NPX = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const stateFile = path.join(process.env.FAKE_STATE_DIR, 'convex.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state));
const args = process.argv.slice(2).filter((a) => a !== '2>&1');
if (args[0] !== 'convex') process.exit(1);
const sub = args.slice(1);
if (sub[0] === 'login' && sub[1] === 'status') {
  console.log('Logged in\\nTeams:\\n  - Test Team (test-team)');
} else if (sub[0] === 'env' && sub[1] === 'set') {
  state.env[sub[2]] = sub[3];
  save();
} else if (sub[0] === 'function-spec') {
  console.log(JSON.stringify({
    functions: state.pushed ? [{ identifier: 'users.js:current' }] : [],
  }));
} else if (sub[0] === 'dev') {
  if (sub.some((a) => a.startsWith('--configure=new'))) {
    fs.appendFileSync(
      path.join(process.cwd(), '.env.local'),
      'CONVEX_DEPLOYMENT=dev:fake-animal-123\\nNEXT_PUBLIC_CONVEX_URL=https://fake-animal-123.convex.cloud\\n'
    );
  }
  if (!state.env.CLERK_JWT_ISSUER_DOMAIN) {
    console.error('Environment variable CLERK_JWT_ISSUER_DOMAIN is used in auth config file but its value was not set.');
    process.exit(1);
  }
  state.pushed = true;
  save();
} else {
  process.exit(1);
}
`;

// Fake Doppler CLI backed by a JSON file standing in for the `dev` config.
const FAKE_DOPPLER = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const stateFile = path.join(process.env.FAKE_STATE_DIR, 'doppler.json');
const secrets = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
const args = process.argv.slice(2);
if (args[0] === 'secrets' && args[1] === 'download') {
  console.log(JSON.stringify(secrets));
} else if (args[0] === 'secrets' && args[1] === 'set') {
  const eq = args[2].indexOf('=');
  secrets[args[2].slice(0, eq)] = args[2].slice(eq + 1);
  fs.writeFileSync(stateFile, JSON.stringify(secrets));
} else {
  process.exit(1);
}
`;

function makeSandbox({ doppler, envLocal = '', convexEnv = {}, dopplerSecrets = {} }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convex-setup-test-'));
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'setup.mjs'), path.join(root, 'scripts', 'setup.mjs'));
  fs.copyFileSync(
    path.join(SCRIPTS_DIR, 'lib', 'doppler.mjs'),
    path.join(root, 'scripts', 'lib', 'doppler.mjs')
  );
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'sandbox' }));

  // setup.mjs imports @clerk/backend at the top; convex-setup never calls it.
  const clerkDir = path.join(root, 'node_modules', '@clerk', 'backend');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(
    path.join(clerkDir, 'package.json'),
    JSON.stringify({ name: '@clerk/backend', type: 'module', exports: './index.js' })
  );
  fs.writeFileSync(path.join(clerkDir, 'index.js'), 'export function createClerkClient() {}\n');

  fs.writeFileSync(path.join(root, '.env.local'), envLocal);
  if (doppler) {
    fs.writeFileSync(path.join(root, '.doppler.yaml'), 'setup:\n  project: sandbox\n  config: dev\n');
  }

  const bin = path.join(root, 'fake-bin');
  const state = path.join(root, 'fake-state');
  fs.mkdirSync(bin);
  fs.mkdirSync(state);
  fs.writeFileSync(path.join(bin, 'npx'), FAKE_NPX, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'doppler'), FAKE_DOPPLER, { mode: 0o755 });
  fs.writeFileSync(path.join(state, 'convex.json'), JSON.stringify({ env: convexEnv, pushed: false }));
  fs.writeFileSync(path.join(state, 'doppler.json'), JSON.stringify(dopplerSecrets));

  return {
    root,
    run() {
      const res = spawnSync(
        process.execPath,
        [path.join(root, 'scripts', 'setup.mjs'), 'convex-setup', '--project-name=Sandbox App'],
        {
          cwd: root,
          encoding: 'utf-8',
          env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_STATE_DIR: state },
        }
      );
      return JSON.parse(res.stdout);
    },
    convex: () => JSON.parse(fs.readFileSync(path.join(state, 'convex.json'), 'utf-8')),
    doppler: () => JSON.parse(fs.readFileSync(path.join(state, 'doppler.json'), 'utf-8')),
    envLocal: () => fs.readFileSync(path.join(root, '.env.local'), 'utf-8'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test('legacy mode: first push self-heals with the issuer from .env.local', (t) => {
  const sb = makeSandbox({
    doppler: false,
    envLocal: `CLERK_JWT_ISSUER_DOMAIN=${ISSUER}\nNEXT_PUBLIC_CLERK_FRONTEND_API_URL=${ISSUER}\n`,
  });
  t.after(sb.cleanup);

  const out = sb.run();

  assert.equal(out.success, true, JSON.stringify(out));
  assert.equal(sb.convex().env.CLERK_JWT_ISSUER_DOMAIN, ISSUER);
  assert.equal(sb.convex().pushed, true);
  assert.match(sb.envLocal(), /^NEXT_PUBLIC_SITE_URL=http:\/\/localhost:3000$/m);
});

test('doppler mode: first push resolves the issuer from Doppler dev when .env.local is empty', (t) => {
  const sb = makeSandbox({
    doppler: true,
    envLocal: '',
    dopplerSecrets: {
      CLERK_JWT_ISSUER_DOMAIN: ISSUER,
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ISSUER,
    },
  });
  t.after(sb.cleanup);

  const out = sb.run();

  assert.equal(out.success, true, JSON.stringify(out));
  assert.equal(sb.convex().env.CLERK_JWT_ISSUER_DOMAIN, ISSUER);
  assert.equal(sb.convex().pushed, true);
  assert.equal(sb.doppler().NEXT_PUBLIC_SITE_URL, 'http://localhost:3000');
});

test('doppler mode: NEXT_PUBLIC_SITE_URL is pushed on the already-configured path', (t) => {
  const sb = makeSandbox({
    doppler: true,
    envLocal:
      'CONVEX_DEPLOYMENT=dev:fake-animal-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-animal-123.convex.cloud\n',
    convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER, NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ISSUER },
    dopplerSecrets: {
      CLERK_JWT_ISSUER_DOMAIN: ISSUER,
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ISSUER,
    },
  });
  t.after(sb.cleanup);

  const out = sb.run();

  assert.equal(out.success, true, JSON.stringify(out));
  assert.equal(out.alreadyConfigured, true);
  assert.equal(sb.doppler().NEXT_PUBLIC_SITE_URL, 'http://localhost:3000');
});

test('doppler mode: an existing NEXT_PUBLIC_SITE_URL in Doppler dev is not overwritten', (t) => {
  const sb = makeSandbox({
    doppler: true,
    envLocal:
      'CONVEX_DEPLOYMENT=dev:fake-animal-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-animal-123.convex.cloud\n',
    convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER },
    dopplerSecrets: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3001' },
  });
  t.after(sb.cleanup);

  const out = sb.run();

  assert.equal(out.success, true, JSON.stringify(out));
  assert.equal(sb.doppler().NEXT_PUBLIC_SITE_URL, 'http://localhost:3001');
});

test('legacy mode: already-configured path leaves .env.local untouched', (t) => {
  const envLocal =
    'CONVEX_DEPLOYMENT=dev:fake-animal-123\nNEXT_PUBLIC_CONVEX_URL=https://fake-animal-123.convex.cloud\n';
  const sb = makeSandbox({
    doppler: false,
    envLocal,
    convexEnv: { CLERK_JWT_ISSUER_DOMAIN: ISSUER },
  });
  t.after(sb.cleanup);

  const out = sb.run();

  assert.equal(out.alreadyConfigured, true, JSON.stringify(out));
  assert.equal(sb.envLocal(), envLocal);
});
