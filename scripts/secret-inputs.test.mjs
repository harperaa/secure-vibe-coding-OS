/**
 * Secret inputs of deploy.mjs / setup.mjs init without command-line flags.
 *
 * Each subcommand that used to take a secret only as a flag now resolves it
 * from: the flag, the env var of the same name, Doppler (prd for production
 * subcommands), then .env.local in legacy mode. These tests run the real
 * scripts in a throwaway repo under an isolated PATH, with stub `doppler`,
 * `npx` and `vercel` that record argv + stdin, a fake `@clerk/backend` that
 * records the key it was given, and `fetch` disabled. They check the value
 * reaches its consumer and never appears in any child's argv or in the
 * script's output.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isolatedTestPath } from './lib/isolated-test-path.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const PROD = {
  pk: 'pk_live_Y2xlcmsuZXhhbXBsZS5jb20k',
  sk: 'sk_live_synthetic$secret "x"',
  deployKey: 'prod:happy-cat-123|dk-synthetic-secret',
  deployKeySecretPart: 'dk-synthetic-secret',
  whsec: 'whsec_synthetic_prod',
};
const DEV = {
  pk: 'pk_test_ZGV2LWFwcC0xLmNsZXJrLmFjY291bnRzLmRldiQ',
  sk: 'sk_test_synthetic_dev',
  deployKey: 'dev:sleepy-dog-1|dev-synthetic-secret',
  whsec: 'whsec_synthetic_dev',
};
const SECRET_ENV_KEYS = ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CONVEX_DEPLOY_KEY', 'CLERK_WEBHOOK_SECRET'];

const STUB = (name) => `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
let stdin = null;
if (!process.stdin.isTTY) { try { stdin = fs.readFileSync(0, 'utf8'); } catch { stdin = null; } }
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ bin: ${JSON.stringify(name)}, argv, stdin, deployKeyEnv: process.env.CONVEX_DEPLOY_KEY || null }) + '\\n');
if (${JSON.stringify(name)} === 'doppler' && argv[0] === 'secrets' && argv[1] === 'download') {
  const config = argv[argv.indexOf('--config') + 1];
  console.log(process.env['STUB_DOPPLER_' + config.toUpperCase()] || '{}');
}
if (${JSON.stringify(name)} === 'vercel' && argv[0] === 'env' && argv[1] === 'ls') console.log('{"envs":[]}');
process.exit(0);
`;

const FAKE_CLERK = `import fs from 'node:fs';
export function createClerkClient({ secretKey }) {
  fs.appendFileSync(process.env.CLERK_LOG, JSON.stringify({ secretKey }) + '\\n');
  return {
    users: { getCount: async () => 0 },
    jwtTemplates: { list: async () => ({ data: [{ id: 't', name: 'convex', lifetime: 300, claims: { aud: 'convex' } }] }) },
    webhooks: {
      createSvixApp: async () => ({}),
      generateSvixAuthURL: async () => { throw new Error('offline test'); },
    },
  };
}
`;

function fixture(t, { doppler = false, envLocal = null } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'secret-inputs-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const f of ['deploy.mjs', 'setup.mjs', path.join('lib', 'doppler.mjs'), path.join('lib', 'github-repo.mjs')]) {
    fs.copyFileSync(path.join(here, f), path.join(root, 'scripts', f));
  }
  const clerkDir = path.join(root, 'node_modules', '@clerk', 'backend');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, 'package.json'), JSON.stringify({ name: '@clerk/backend', type: 'module', main: 'index.js' }));
  fs.writeFileSync(path.join(clerkDir, 'index.js'), FAKE_CLERK);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'my-product' }));
  if (doppler) fs.writeFileSync(path.join(root, '.doppler.yaml'), 'setup:\n  project: my-product\n  config: dev\n');
  if (envLocal !== null) fs.writeFileSync(path.join(root, '.env.local'), envLocal);
  // No network: the scripts' own fetch calls (Clerk /v1/domains) fail fast.
  const noNet = path.join(root, 'no-network.mjs');
  fs.writeFileSync(noNet, "globalThis.fetch = async () => { throw new Error('network disabled in test'); };\n");

  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  for (const name of ['doppler', 'npx', 'vercel']) fs.writeFileSync(path.join(bin, name), STUB(name), { mode: 0o755 });
  const testPath = isolatedTestPath([bin], t);
  const log = path.join(root, 'calls.jsonl');
  const clerkLog = path.join(root, 'clerk.jsonl');

  const readJsonl = (file) =>
    fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];

  function run(script, argv, { env = {}, dopplerConfigs = {} } = {}) {
    fs.rmSync(log, { force: true });
    fs.rmSync(clerkLog, { force: true });
    const base = { ...process.env };
    for (const k of SECRET_ENV_KEYS) delete base[k];
    const childEnv = { ...base, PATH: testPath, STUB_LOG: log, CLERK_LOG: clerkLog, ...env };
    for (const [config, values] of Object.entries(dopplerConfigs)) {
      childEnv[`STUB_DOPPLER_${config.toUpperCase()}`] = JSON.stringify(values);
    }
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(noNet).href, path.join(root, 'scripts', script), ...argv], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
      env: childEnv,
    });
    const calls = readJsonl(log);
    return {
      status: r.status,
      stdout: r.stdout,
      stderr: r.stderr,
      out: r.stdout.includes('{') ? JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))) : null,
      err: r.stderr.includes('{') ? JSON.parse(r.stderr.slice(r.stderr.indexOf('{'))) : null,
      calls,
      clerkKeys: readJsonl(clerkLog).map((c) => c.secretKey),
      argvText: JSON.stringify(calls.map((c) => c.argv)),
    };
  }

  return { root, run };
}

// No secret value in any child's argv, nor in the script's stdout/stderr.
function assertNotExposed(r, ...secrets) {
  for (const s of secrets) {
    assert.ok(!r.argvText.includes(s), `secret found in argv: ${r.argvText}`);
    assert.ok(!r.stdout.includes(s), 'secret found in stdout');
    assert.ok(!r.stderr.includes(s), 'secret found in stderr');
  }
}

test('validate-keys --require-prod reads the Clerk keys and deploy key from the environment', (t) => {
  const { run } = fixture(t);
  const r = run('deploy.mjs', ['validate-keys', '--require-prod=true'], {
    env: { CLERK_SECRET_KEY: PROD.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PROD.pk, CONVEX_DEPLOY_KEY: PROD.deployKey },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.success, true);
  assert.equal(r.out.keyType, 'production');
  assert.ok(r.out.steps.includes('Deploy key format validated'));
  assert.deepEqual(r.clerkKeys, [PROD.sk]);
  assertNotExposed(r, PROD.sk, PROD.deployKeySecretPart);
});

test('validate-keys --require-prod reads Doppler prd and skips dev keys in the environment', (t) => {
  // `doppler run` on the pinned dev config puts dev keys in the environment.
  const { run } = fixture(t, { doppler: true });
  const r = run('deploy.mjs', ['validate-keys', '--require-prod=true'], {
    env: { CLERK_SECRET_KEY: DEV.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: DEV.pk },
    dopplerConfigs: { prd: { CLERK_SECRET_KEY: PROD.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PROD.pk } },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.keyType, 'production');
  assert.deepEqual(r.clerkKeys, [PROD.sk]);
  const downloads = r.calls.filter((c) => c.bin === 'doppler' && c.argv[1] === 'download');
  assert.ok(downloads.length >= 1);
  for (const d of downloads) assert.equal(d.argv[d.argv.indexOf('--config') + 1], 'prd');
  assertNotExposed(r, PROD.sk, DEV.sk);
});

test('validate-keys --require-prod refuses the dev keys in .env.local and names what is missing', (t) => {
  const { run } = fixture(t, { envLocal: `CLERK_SECRET_KEY=${DEV.sk}\nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${DEV.pk}\n` });
  const r = run('deploy.mjs', ['validate-keys', '--require-prod=true']);
  assert.equal(r.status, 1);
  assert.match(r.err.error, /CLERK_SECRET_KEY not found/);
  assert.match(r.err.error, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found/);
  assert.match(r.err.error, /Skipped the value in \.env\.local: expected a production key \(sk_live_\)/);
  assert.deepEqual(r.clerkKeys, []);
  assertNotExposed(r, DEV.sk);
});

test('validate-keys (development) falls back to .env.local in legacy mode', (t) => {
  const { run } = fixture(t, { envLocal: `CLERK_SECRET_KEY=${DEV.sk}\nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${DEV.pk}\nCONVEX_DEPLOY_KEY=${DEV.deployKey}\n` });
  const r = run('deploy.mjs', ['validate-keys']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.keyType, 'development');
  // A dev deploy key in .env.local is not picked up (only with --require-prod).
  assert.ok(!r.out.steps.includes('Deploy key format validated'));
  assert.deepEqual(r.clerkKeys, [DEV.sk]);
  assertNotExposed(r, DEV.sk);
});

test('validate-keys flags still win over the environment', (t) => {
  const { run } = fixture(t);
  const flagSk = 'sk_live_from_flag';
  const r = run('deploy.mjs', ['validate-keys', `--clerk-pk=${PROD.pk}`, `--clerk-sk=${flagSk}`, '--require-prod=true'], {
    env: { CLERK_SECRET_KEY: PROD.sk },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.clerkKeys, [flagSk]);
});

test('convex-deploy-functions passes a deploy key from the environment to convex via env, not argv', (t) => {
  const { run } = fixture(t);
  const r = run('deploy.mjs', ['convex-deploy-functions'], { env: { CONVEX_DEPLOY_KEY: PROD.deployKey } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.success, true);
  assert.equal(r.out.prodUrl, 'https://happy-cat-123.convex.cloud');
  const deploy = r.calls.find((c) => c.bin === 'npx');
  assert.deepEqual(deploy.argv, ['convex', 'deploy']);
  assert.equal(deploy.deployKeyEnv, PROD.deployKey);
  assertNotExposed(r, PROD.deployKeySecretPart);
});

test('convex-deploy-functions reads Doppler prd; the --deploy-key flag still works', (t) => {
  const { run } = fixture(t, { doppler: true });
  const fromDoppler = run('deploy.mjs', ['convex-deploy-functions'], { dopplerConfigs: { prd: { CONVEX_DEPLOY_KEY: PROD.deployKey } } });
  assert.equal(fromDoppler.status, 0, fromDoppler.stderr);
  assert.equal(fromDoppler.calls.find((c) => c.bin === 'npx').deployKeyEnv, PROD.deployKey);
  assertNotExposed(fromDoppler, PROD.deployKeySecretPart);

  const flagKey = 'prod:flag-cat-9|flag-secret';
  const fromFlag = run('deploy.mjs', ['convex-deploy-functions', `--deploy-key=${flagKey}`], { dopplerConfigs: { prd: { CONVEX_DEPLOY_KEY: PROD.deployKey } } });
  assert.equal(fromFlag.status, 0, fromFlag.stderr);
  assert.equal(fromFlag.calls.find((c) => c.bin === 'npx').deployKeyEnv, flagKey);
  assert.equal(fromFlag.calls.filter((c) => c.bin === 'doppler').length, 0);
});

test('convex-deploy-functions without any deploy key exits and names the variable', (t) => {
  const { run } = fixture(t, { envLocal: `CONVEX_DEPLOY_KEY=${DEV.deployKey}\n` });
  const r = run('deploy.mjs', ['convex-deploy-functions']);
  assert.equal(r.status, 1);
  assert.match(r.err.error, /CONVEX_DEPLOY_KEY not found \(checked the CONVEX_DEPLOY_KEY environment variable, \.env\.local, --deploy-key\)/);
  assert.equal(r.calls.filter((c) => c.bin === 'npx').length, 0);
  assertNotExposed(r, 'dev-synthetic-secret');
});

test('convex-prod-env reads the deploy key and webhook secret from Doppler prd and sends values on stdin', (t) => {
  const { run } = fixture(t, { doppler: true });
  const r = run('deploy.mjs', ['convex-prod-env', '--frontend-api-url=https://clerk.example.com', '--admin-email=owner@acme.dev'], {
    dopplerConfigs: { prd: { CONVEX_DEPLOY_KEY: PROD.deployKey, CLERK_WEBHOOK_SECRET: PROD.whsec } },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.success, true);
  const sets = r.calls.filter((c) => c.bin === 'npx' && c.argv.slice(0, 3).join(' ') === 'convex env set');
  const whsec = sets.find((c) => c.argv[3] === 'CLERK_WEBHOOK_SECRET');
  assert.deepEqual(whsec.argv, ['convex', 'env', 'set', 'CLERK_WEBHOOK_SECRET']);
  assert.equal(whsec.stdin, PROD.whsec);
  for (const c of sets) assert.equal(c.deployKeyEnv, PROD.deployKey);
  assertNotExposed(r, PROD.whsec, PROD.deployKeySecretPart);
});

test('convex-prod-env reads both from the environment in legacy mode', (t) => {
  const { run } = fixture(t, { envLocal: '' });
  const r = run('deploy.mjs', ['convex-prod-env', '--admin-email=owner@acme.dev'], {
    env: { CONVEX_DEPLOY_KEY: PROD.deployKey, CLERK_WEBHOOK_SECRET: PROD.whsec },
  });
  assert.equal(r.status, 0, r.stderr);
  const whsec = r.calls.find((c) => c.bin === 'npx' && c.argv[3] === 'CLERK_WEBHOOK_SECRET');
  assert.equal(whsec.stdin, PROD.whsec);
  assertNotExposed(r, PROD.whsec, PROD.deployKeySecretPart);
});

test('prod-webhook reads the Clerk secret key from the environment', (t) => {
  const { run } = fixture(t);
  const r = run('deploy.mjs', ['prod-webhook', '--convex-site-url=https://happy-cat-123.convex.site'], { env: { CLERK_SECRET_KEY: PROD.sk } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.endpointUrl, 'https://happy-cat-123.convex.site/clerk-users-webhook');
  assert.deepEqual(r.clerkKeys, [PROD.sk]);
  assertNotExposed(r, PROD.sk);
});

test('prod-webhook reads Doppler prd and never the dev key', (t) => {
  const { run } = fixture(t, { doppler: true });
  const r = run('deploy.mjs', ['prod-webhook', '--convex-site-url=https://happy-cat-123.convex.site'], {
    env: { CLERK_SECRET_KEY: DEV.sk },
    dopplerConfigs: { dev: { CLERK_SECRET_KEY: DEV.sk }, prd: { CLERK_SECRET_KEY: PROD.sk } },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.clerkKeys, [PROD.sk]);
  assertNotExposed(r, PROD.sk, DEV.sk);
});

test('vercel-env (legacy) reads Clerk keys and deploy key from the environment and sends them on stdin', (t) => {
  const { run } = fixture(t, { envLocal: `CLERK_SECRET_KEY=${DEV.sk}\n` });
  const r = run('deploy.mjs', ['vercel-env', '--frontend-api-url=https://clerk.example.com', '--site-name=Acme'], {
    env: { CLERK_SECRET_KEY: PROD.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PROD.pk, CONVEX_DEPLOY_KEY: PROD.deployKey },
  });
  assert.equal(r.status, 0, r.stderr);
  const add = (key) => r.calls.find((c) => c.bin === 'vercel' && c.argv[0] === 'env' && c.argv[1] === 'add' && c.argv[2] === key);
  assert.deepEqual(add('CLERK_SECRET_KEY').argv, ['env', 'add', 'CLERK_SECRET_KEY', 'production', '--force']);
  assert.equal(add('CLERK_SECRET_KEY').stdin, PROD.sk);
  assert.equal(add('CONVEX_DEPLOY_KEY').stdin, PROD.deployKey);
  assert.equal(add('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY').stdin, PROD.pk);
  assertNotExposed(r, PROD.sk, PROD.deployKeySecretPart, DEV.sk);
});

test('update-vercel-clerk-keys reads the keys from the environment', (t) => {
  const { run } = fixture(t, { envLocal: '' });
  const r = run('deploy.mjs', ['update-vercel-clerk-keys', '--frontend-api-url=https://clerk.example.com'], {
    env: { CLERK_SECRET_KEY: DEV.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: DEV.pk },
  });
  assert.equal(r.status, 0, r.stderr);
  const sk = r.calls.find((c) => c.bin === 'vercel' && c.argv[2] === 'CLERK_SECRET_KEY');
  assert.equal(sk.stdin, DEV.sk);
  assertNotExposed(r, DEV.sk);
});

test('setup.mjs init takes Clerk keys from the environment and stores them in Doppler dev via stdin', (t) => {
  const { run } = fixture(t, { doppler: true });
  const r = run('setup.mjs', ['init', '--site-name=Acme', '--admin-email=owner@acme.dev'], {
    env: { CLERK_SECRET_KEY: DEV.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: DEV.pk },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.out.steps.includes('Using provided Clerk API keys'));
  assert.deepEqual(r.clerkKeys, [DEV.sk]);
  const set = r.calls.find((c) => c.bin === 'doppler' && c.argv[1] === 'set' && c.argv[2] === 'CLERK_SECRET_KEY');
  assert.equal(set.stdin, DEV.sk);
  assert.equal(set.argv[set.argv.indexOf('--config') + 1], 'dev');
  assertNotExposed(r, DEV.sk);
});

test('setup.mjs init (legacy) writes Clerk keys from the environment to .env.local; flags still win', (t) => {
  const { root, run } = fixture(t, { envLocal: '' });
  const r = run('setup.mjs', ['init', '--site-name=Acme', '--admin-email=owner@acme.dev'], {
    env: { CLERK_SECRET_KEY: DEV.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: DEV.pk },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(root, '.env.local'), 'utf8'), new RegExp(`^CLERK_SECRET_KEY=${DEV.sk}$`, 'm'));
  assertNotExposed(r, DEV.sk);

  const flagSk = 'sk_test_from_flag';
  const f = run('setup.mjs', ['init', '--site-name=Acme', '--admin-email=owner@acme.dev', `--clerk-pk=${DEV.pk}`, `--clerk-sk=${flagSk}`], {
    env: { CLERK_SECRET_KEY: DEV.sk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: DEV.pk },
  });
  assert.equal(f.status, 0, f.stderr);
  assert.deepEqual(f.clerkKeys, [flagSk]);
  assert.match(fs.readFileSync(path.join(root, '.env.local'), 'utf8'), new RegExp(`^CLERK_SECRET_KEY=${flagSk}$`, 'm'));
});
