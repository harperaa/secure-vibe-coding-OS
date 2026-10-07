#!/usr/bin/env node

/**
 * Convex auth gate.
 *
 * Why this exists: in Convex, every exported `mutation` / `query` / `action` is
 * a public internet endpoint reachable by anyone who knows the deployment URL.
 * Next.js `middleware.ts` does NOT run for these calls — it only sees requests
 * to the Next.js server, and Convex RPC goes straight from the browser to the
 * Convex deployment. So an exported function that omits an identity check is
 * unauthenticated, silently, with nothing in the diff to signal it.
 *
 * That is not hypothetical: a security assessment of a downstream fork found
 * `logSecurityEvent` in this very repo accepting a caller-supplied `userId` and
 * inserting audit records with no identity check, permitting forged security
 * events attributed to arbitrary users. It had zero callers. A skill telling
 * developers to check identity did not prevent it, because the baseline itself
 * shipped the counter-example.
 *
 * Rules enforced:
 *   1. Every exported public `mutation` / `query` / `action` must either
 *      reference an auth helper, or carry an explicit `@public-endpoint` opt-out.
 *   2. `internalMutation` / `internalQuery` / `internalAction` are exempt —
 *      they are not reachable from a client at all, which is the correct fix
 *      for anything that only needs to be called server-side.
 *   3. `httpAction` is exempt — those do their own request-level verification
 *      (e.g. Svix webhook signatures) and are not part of the RPC surface.
 *
 * The opt-out is deliberately verbose. Write it directly above the export:
 *
 *   // @public-endpoint: violations are recorded before a session exists, so
 *   // this cannot require auth. Abuse is bounded by <the actual control>.
 *   export const logSecurityViolation = mutation({ ... })
 *
 * A bare `@public-endpoint` with no reason is rejected. The point is to make
 * "this is public" a sentence someone had to write and a reviewer had to read.
 *
 * Usage:  node scripts/check-convex-auth.mjs [--json]
 * Exit:   0 = clean, 1 = violations found, 2 = script/usage error
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const CONVEX_DIR = path.join(ROOT_DIR, 'convex');

// Helpers that establish caller identity. Extend this list if you add another,
// otherwise the gate will report a false positive rather than a false negative —
// which is the correct direction for a security check to fail.
const AUTH_HELPERS = [
  'getUserIdentity',
  'ctx.auth',
  'requireAuth',
  'getCurrentUser',
  'getCurrentUserOrThrow',
  'getCurrentUserOrThrowForMutation',
  'isCurrentUserAdmin',
  'isCurrentUserAdminMutation',
];

const PUBLIC_KINDS = ['mutation', 'query', 'action'];
const EXEMPT_KINDS = ['internalMutation', 'internalQuery', 'internalAction', 'httpAction'];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_generated') continue;
      out.push(...walk(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

/** Text immediately preceding an export — where the opt-out annotation lives. */
function precedingBlock(src, exportStart) {
  const before = src.slice(0, exportStart);
  const lines = before.split('\n');
  // Walk back over the contiguous comment block directly above the export.
  const block = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l === '') { if (block.length) break; continue; }
    if (l.startsWith('//') || l.startsWith('*') || l.startsWith('/*') || l.startsWith('*/')) {
      block.unshift(l);
    } else break;
  }
  return block.join('\n');
}

const findings = [];
const stats = { total: 0, internal: 0, authed: 0, declaredPublic: 0, violations: 0 };

for (const file of walk(CONVEX_DIR)) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT_DIR, file);
  const matches = [...src.matchAll(/\nexport const (\w+)\s*=\s*(\w+)\(/g)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const [, name, kind] = m;
    if (![...PUBLIC_KINDS, ...EXEMPT_KINDS].includes(kind)) continue;

    stats.total++;
    if (EXEMPT_KINDS.includes(kind)) { stats.internal++; continue; }

    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : src.length;
    const body = src.slice(start, end);
    const doc = precedingBlock(src, start);

    const hasAuth = AUTH_HELPERS.some((h) => body.includes(h));
    const optOut = /@public-endpoint:?\s*(.*)/.exec(doc);
    const reason = optOut ? optOut[1].trim() : '';

    if (hasAuth) { stats.authed++; continue; }

    if (optOut && reason.length >= 12) { stats.declaredPublic++; continue; }

    stats.violations++;
    findings.push({
      file: rel,
      line: lineOf(src, start + 1),
      name,
      kind,
      reason: optOut
        ? '@public-endpoint present but its justification is missing or too short'
        : 'exported public function with no identity check and no @public-endpoint declaration',
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok: findings.length === 0, stats, findings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

console.log('Convex auth gate');
console.log('----------------');
console.log(`  exported functions checked : ${stats.total}`);
console.log(`  internal (not client-reachable) : ${stats.internal}`);
console.log(`  public, identity checked   : ${stats.authed}`);
console.log(`  public, declared via @public-endpoint : ${stats.declaredPublic}`);
console.log(`  violations                 : ${stats.violations}`);

if (findings.length === 0) {
  console.log('\nOK — every public Convex function checks identity or declares itself public.');
  process.exit(0);
}

console.log('\nVIOLATIONS\n');
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.name} (${f.kind})`);
  console.log(`    ${f.reason}\n`);
}
console.log('Fix by one of:');
console.log('  - add an identity check (getCurrentUserOrThrow / isCurrentUserAdmin / ctx.auth.getUserIdentity)');
console.log('  - change it to internalMutation / internalQuery if no client needs to call it');
console.log('  - if it genuinely must be public, declare it above the export:');
console.log('      // @public-endpoint: <why this cannot require auth, and what bounds abuse>');
process.exit(1);
