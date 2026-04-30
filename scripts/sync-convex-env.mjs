#!/usr/bin/env node

/**
 * Sync Doppler secrets to Convex env.
 *
 * Doppler has no native Convex integration, so this script bridges them.
 * Pulls allowlisted secrets from a Doppler config and applies them to the
 * matching Convex deployment. Idempotent: only pushes changed/missing keys
 * and unsets keys that have been removed from Doppler.
 *
 * Usage:
 *   node scripts/sync-convex-env.mjs --config dev
 *   node scripts/sync-convex-env.mjs --config prd
 *
 * For prd, requires CONVEX_DEPLOY_KEY in the Doppler `prd` config so
 * `npx convex env set` targets the production deployment.
 */

import { execSync, spawnSync } from 'node:child_process';
import { downloadSecrets } from './lib/doppler.mjs';

// Allowlist — Convex functions only need these. Anything else stays in Doppler.
const CONVEX_ALLOWLIST = [
  'CLERK_WEBHOOK_SECRET',
  'NEXT_PUBLIC_CLERK_FRONTEND_API_URL',
  'ADMIN_EMAIL',
];

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        args[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        args[arg.slice(2)] = 'true';
      }
    }
  }
  return args;
}

function listConvexEnv(deployKey) {
  // `npx convex env list --json` returns an array of {name, value} pairs.
  const env = { ...process.env };
  if (deployKey) env.CONVEX_DEPLOY_KEY = deployKey;
  const result = spawnSync('npx', ['convex', 'env', 'list', '--json'], {
    encoding: 'utf-8',
    env,
  });
  if (result.status !== 0) {
    throw new Error(`convex env list failed:\n${result.stderr || result.stdout}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (err) {
    throw new Error(`Could not parse convex env list output: ${err.message}\n${result.stdout}`);
  }
  const map = {};
  for (const entry of parsed) {
    if (entry && entry.name) map[entry.name] = entry.value ?? '';
  }
  return map;
}

function setConvexEnv(key, value, deployKey) {
  const env = { ...process.env };
  if (deployKey) env.CONVEX_DEPLOY_KEY = deployKey;
  const result = spawnSync('npx', ['convex', 'env', 'set', key, value], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env,
  });
  if (result.status !== 0) {
    throw new Error(`convex env set ${key} failed.`);
  }
}

function unsetConvexEnv(key, deployKey) {
  const env = { ...process.env };
  if (deployKey) env.CONVEX_DEPLOY_KEY = deployKey;
  const result = spawnSync('npx', ['convex', 'env', 'unset', key], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env,
  });
  if (result.status !== 0) {
    throw new Error(`convex env unset ${key} failed.`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const config = args.config;

  if (!config) {
    console.error('Usage: node scripts/sync-convex-env.mjs --config dev|prd');
    process.exit(1);
  }
  if (config !== 'dev' && config !== 'prd') {
    console.error(`Unknown config "${config}". Expected dev or prd.`);
    process.exit(1);
  }

  const dopplerSecrets = downloadSecrets(config);

  // Filter to allowlist
  const desired = {};
  for (const key of CONVEX_ALLOWLIST) {
    if (dopplerSecrets[key] !== undefined && dopplerSecrets[key] !== '') {
      desired[key] = dopplerSecrets[key];
    }
  }

  // For prd, surface CONVEX_DEPLOY_KEY to convex CLI
  const deployKey = config === 'prd' ? dopplerSecrets.CONVEX_DEPLOY_KEY : undefined;
  if (config === 'prd' && !deployKey) {
    console.error('Missing CONVEX_DEPLOY_KEY in Doppler prd config — cannot target production deployment.');
    process.exit(1);
  }

  const current = listConvexEnv(deployKey);

  const toSet = [];
  const toUnset = [];

  for (const key of CONVEX_ALLOWLIST) {
    const desiredValue = desired[key];
    const currentValue = current[key];

    if (desiredValue === undefined && currentValue !== undefined) {
      toUnset.push(key);
    } else if (desiredValue !== undefined && currentValue !== desiredValue) {
      toSet.push(key);
    }
  }

  if (toSet.length === 0 && toUnset.length === 0) {
    console.log(`Convex env (${config}) is already in sync with Doppler. No changes.`);
    return;
  }

  for (const key of toSet) {
    console.log(`  set ${key}`);
    setConvexEnv(key, desired[key], deployKey);
  }
  for (const key of toUnset) {
    console.log(`  unset ${key}`);
    unsetConvexEnv(key, deployKey);
  }

  console.log(`Synced Convex env (${config}): ${toSet.length} set, ${toUnset.length} unset.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
