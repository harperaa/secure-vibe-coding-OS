import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { convexEnvListWithValues } from './lib/convex-env-list.mjs';

// A fake `npx` that behaves like one convex CLI generation and records every call.
//   agent: a newer CLI that detected an AI agent; names only unless --include-values.
//   old:   a CLI from before --include-values; rejects the flag, always prints values.
//   broken: fails for another reason (auth, network); must not trigger the retry.
function fakeCli(t, kind) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convex-env-list-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const log = path.join(root, 'calls.log');
  fs.writeFileSync(
    path.join(root, 'npx'),
    `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, argv.join(' ') + '\\n');
const kind = ${JSON.stringify(kind)};
const flag = argv.includes('--include-values');
if (kind === 'broken') { console.error('error: not authorized'); process.exit(1); }
if (kind === 'old' && flag) { console.error("error: unknown option '--include-values'"); process.exit(1); }
console.log(kind === 'agent' && !flag ? 'SECRET_KEY' : 'SECRET_KEY=synthetic-value');
`,
    { mode: 0o755 }
  );
  const env = { ...process.env, PATH: `${root}${path.delimiter}${process.env.PATH}` };
  const calls = () => fs.readFileSync(log, 'utf8').trim().split('\n');
  return { env, calls };
}

test('a CLI that detected an AI agent still returns values', (t) => {
  const cli = fakeCli(t, 'agent');
  const r = convexEnvListWithValues({ encoding: 'utf-8', env: cli.env });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'SECRET_KEY=synthetic-value');
  assert.deepEqual(cli.calls(), ['convex env list --include-values']);
});

test('an older CLI without --include-values falls back to the plain listing', (t) => {
  const cli = fakeCli(t, 'old');
  const r = convexEnvListWithValues({ encoding: 'utf-8', env: cli.env });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'SECRET_KEY=synthetic-value');
  assert.deepEqual(cli.calls(), ['convex env list --include-values', 'convex env list']);
});

test('any other failure is returned as is, without a retry', (t) => {
  const cli = fakeCli(t, 'broken');
  const r = convexEnvListWithValues({ encoding: 'utf-8', env: cli.env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not authorized/);
  assert.deepEqual(cli.calls(), ['convex env list --include-values']);
});
