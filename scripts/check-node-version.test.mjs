import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, newerSecurityRelease, run } from './check-node-version.mjs';

// Fixed release list in nodejs.org order (newest first). Mirrors the real
// shape around the Oct 2026 security release.
const INDEX = [
  { version: 'v26.12.1', date: '2026-10-20', security: true },
  { version: 'v26.12.0', date: '2026-10-10', security: false },
  { version: 'v24.22.1', date: '2026-10-20', security: true },
  { version: 'v24.22.0', date: '2026-10-14', security: false },
  { version: 'v24.21.0', date: '2026-09-07', security: false },
  { version: 'v24.10.0', date: '2026-05-01', security: true },
  { version: 'v22.23.4', date: '2026-10-20', security: true },
];

const silent = { log() {}, warn() {}, error() {} };
const fetchOk = async () => ({ ok: true, json: async () => INDEX });

test('isNewer orders numerically, not lexically', () => {
  assert.equal(isNewer('v24.10.0', 'v24.9.0'), true);
  assert.equal(isNewer('v24.9.0', 'v24.10.0'), false);
  assert.equal(isNewer('v24.22.1', 'v24.22.1'), false);
  assert.equal(isNewer('24.22.1', 'v24.22.0'), true);
});

test('newer security release in the same major fails the gate', () => {
  const hit = newerSecurityRelease('v24.21.0', INDEX);
  assert.equal(hit?.version, 'v24.22.1');
});

test('equal version passes', () => {
  assert.equal(newerSecurityRelease('v24.22.1', INDEX), null);
});

test('newer ordinary (non-security) release does not fail the gate', () => {
  assert.equal(newerSecurityRelease('v24.22.0', [
    { version: 'v24.22.1', date: '2026-10-20', security: false },
    { version: 'v24.22.0', date: '2026-10-14', security: false },
  ]), null);
});

test('security releases in another major line are ignored', () => {
  assert.equal(newerSecurityRelease('v24.22.1', INDEX), null); // v26.12.1 is security but not 24.x
  assert.equal(newerSecurityRelease('v22.23.4', INDEX), null);
});

test('older security releases do not count', () => {
  // v24.10.0 is a security release but older than what is running.
  assert.equal(newerSecurityRelease('v24.21.0', INDEX)?.version, 'v24.22.1');
  assert.equal(newerSecurityRelease('v24.22.1', INDEX), null);
});

test('run returns 1 when behind a security release', async () => {
  assert.equal(await run({ running: 'v24.21.0', fetchImpl: fetchOk, log: silent }), 1);
});

test('run returns 0 when current', async () => {
  assert.equal(await run({ running: 'v24.22.1', fetchImpl: fetchOk, log: silent }), 0);
});

test('run warns and passes when the index cannot be fetched', async () => {
  const warnings = [];
  const log = { ...silent, warn: (m) => warnings.push(m) };
  const fetchFail = async () => { throw new Error('fetch failed'); };
  assert.equal(await run({ running: 'v24.21.0', fetchImpl: fetchFail, log }), 0);
  assert.match(warnings[0], /could not fetch/);
});

test('run warns and passes on a non-2xx response', async () => {
  const fetch503 = async () => ({ ok: false, status: 503 });
  assert.equal(await run({ running: 'v24.21.0', fetchImpl: fetch503, log: silent }), 0);
});
