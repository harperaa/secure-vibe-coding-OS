/**
 * write-install-summary must split --completed-steps on unescaped commas only,
 * so items that contain `\,` (from /install's Doppler-mode list) stay intact.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(SCRIPTS_DIR, '..');

const EXPECTED_DOPPLER_STEPS = [
  'Dependencies installed',
  'Doppler CLI installed and authenticated',
  'Doppler project created with dev/prd configs',
  'Repo pinned to dev (.doppler.yaml written)',
  'CSRF, Session and Security Log secrets pushed to Doppler dev',
  'Clerk application created (accountless)',
  'JWT template for Convex created',
  'Frontend API URL pushed to Doppler dev',
  'Convex project set up and functions deployed',
  'Webhook endpoint created via Svix',
  'Convex environment variables set (CLERK_WEBHOOK_SECRET, ADMIN_EMAIL, NEXT_PUBLIC_CLERK_FRONTEND_API_URL, SECURITY_LOG_KEY)',
  'Convex deployment IDs synced to Doppler dev',
  'CI service token created and pushed to GitHub Actions',
];

function extractDopplerCompletedStepsFromInstallMd() {
  const text = fs.readFileSync(path.join(ROOT, '.claude/commands/install.md'), 'utf-8');
  const match = text.match(/\*\*Doppler mode\*\*[^\n]*: "([^"]+)"/);
  assert.ok(match, 'Doppler-mode --completed-steps string missing from install.md');
  // install.md doubles backslashes so agents can paste into a double-quoted
  // shell arg; the CLI receives single-backslash escapes (`\,`).
  return match[1].replace(/\\\\,/g, '\\,');
}

test('write-install-summary keeps escaped commas from install.md Doppler list', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'install-summary-'));
  const docsDir = path.join(root, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });

  for (const file of ['setup.mjs', path.join('lib', 'doppler.mjs'), path.join('lib', 'github-repo.mjs'), path.join('lib', 'convex-env-list.mjs')]) {
    fs.copyFileSync(path.join(SCRIPTS_DIR, file), path.join(root, 'scripts', file));
  }

  // setup.mjs imports @clerk/backend at load time; stub it so the summary
  // subcommand can run offline without the full install tree.
  const clerkDir = path.join(root, 'node_modules', '@clerk', 'backend');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(
    path.join(clerkDir, 'package.json'),
    JSON.stringify({ name: '@clerk/backend', type: 'module', main: 'index.js' })
  );
  fs.writeFileSync(
    path.join(clerkDir, 'index.js'),
    'export function createClerkClient() { return {}; }\n'
  );

  const completedSteps = extractDopplerCompletedStepsFromInstallMd();
  const r = spawnSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'setup.mjs'),
      'write-install-summary',
      `--completed-steps=${completedSteps}`,
      '--accountless=false',
    ],
    { cwd: root, encoding: 'utf-8', env: { ...process.env } }
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);

  const summary = fs.readFileSync(path.join(root, 'docs', 'INSTALL.md'), 'utf-8');
  const automated = summary.match(/## Automated Steps\n\n([\s\S]*?)(?=\n## |\n*$)/);
  assert.ok(automated, 'Automated Steps section missing');
  const items = automated[1]
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));

  assert.deepEqual(items, EXPECTED_DOPPLER_STEPS);
  assert.match(
    summary,
    /CLAUDE_CODE_OAUTH_TOKEN/,
    'optional-steps note about Claude review secret must be present'
  );
});
