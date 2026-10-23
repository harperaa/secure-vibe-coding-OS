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
 */

const INDEX_URL = 'https://nodejs.org/dist/index.json';
const running = process.version; // e.g. v24.22.1
const major = running.split('.')[0]; // e.g. v24

let index;
try {
  const res = await fetch(INDEX_URL, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  index = await res.json();
} catch (err) {
  console.warn(`node version gate: could not fetch ${INDEX_URL} (${err.message}); skipping`);
  process.exit(0);
}

const parse = (v) => v.slice(1).split('.').map(Number);
const isNewer = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// index.json is newest-first.
const newerSecurity = index.filter(
  (r) => r.version.startsWith(`${major}.`) && r.security === true && isNewer(r.version, running),
);

if (newerSecurity.length === 0) {
  console.log(`node version gate: ok (${running}; no newer ${major}.x security release)`);
  process.exit(0);
}

const latest = newerSecurity[0];
console.error(
  `node version gate: FAIL — running ${running}, but ${latest.version} (${latest.date}) is a newer ${major}.x security release.`,
);
console.error('  Advisory list: https://nodejs.org/en/blog/vulnerability/');
console.error(`  CI picks it up via setup-node check-latest once actions/node-versions publishes it.`);
console.error(`  Local: nvm install ${latest.version.slice(1)}`);
process.exit(1);
