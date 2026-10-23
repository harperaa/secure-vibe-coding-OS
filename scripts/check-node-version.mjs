#!/usr/bin/env node
/**
 * Node.js security release gate.
 *
 * `npm audit`, Dependabot and the audit gate only see packages in
 * package-lock.json. The Node runtime itself is not an npm package, so a
 * Node security release (e.g. 24.22.1, Oct 2026) never shows up there. This
 * closes that gap: it fetches the official release index and fails when a
 * NEWER version in the running major line is flagged as a security release.
 *
 * Deliberately narrow:
 *   - Only the running major line (24.x here) is considered.
 *   - Only releases marked `security: true` fail the gate, so routine patch
 *     releases that lag the runner image for a day do not turn CI red.
 *   - If nodejs.org is unreachable, warn and pass; a flaky network must not
 *     block merges.
 *
 * Usage: node scripts/check-node-version.mjs
 * Tests: node --test scripts/check-node-version.test.mjs
 */

import { pathToFileURL } from 'node:url';

export const INDEX_URL = 'https://nodejs.org/dist/index.json';

const parse = (v) => v.replace(/^v/, '').split('.').map(Number);

/** True when semver string `a` is strictly newer than `b`. */
export function isNewer(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

/**
 * Pure decision: given the running version and the release index (newest
 * first, as nodejs.org publishes it), return the newest security release in
 * the same major line that is newer than `running`, or null.
 */
export function newerSecurityRelease(running, index) {
  const major = running.split('.')[0];
  const candidates = index.filter(
    (r) => r.version.startsWith(`${major}.`) && r.security === true && isNewer(r.version, running),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) => (isNewer(r.version, best.version) ? r : best));
}

/**
 * Run the gate. Returns the process exit code. `fetchImpl` is injectable so
 * the fetch-failure path can be tested without a network.
 */
export async function run({ running = process.version, fetchImpl = fetch, log = console } = {}) {
  let index;
  try {
    const res = await fetchImpl(INDEX_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    index = await res.json();
  } catch (err) {
    log.warn(`node version gate: could not fetch ${INDEX_URL} (${err.message}); skipping`);
    return 0;
  }

  const latest = newerSecurityRelease(running, index);
  const major = running.split('.')[0];

  if (!latest) {
    log.log(`node version gate: ok (${running}; no newer ${major}.x security release)`);
    return 0;
  }

  log.error(
    `node version gate: FAIL — running ${running}, but ${latest.version} (${latest.date}) is a newer ${major}.x security release.`,
  );
  log.error('  Advisory list: https://nodejs.org/en/blog/vulnerability/');
  log.error('  CI picks it up via setup-node check-latest once actions/node-versions publishes it.');
  log.error(`  Local: nvm install ${latest.version.replace(/^v/, '')}`);
  return 1;
}

// Only run when executed directly, not when imported by the tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await run());
}
