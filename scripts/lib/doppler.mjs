/**
 * Doppler CLI helper — fully CLI-driven, no dashboard interaction.
 *
 * Used by setup.mjs, deploy.mjs, sync-convex-env.mjs, and the rotate command.
 *
 * Conventions:
 *   - Project name is read from package.json `name` field.
 *   - Configs are: `dev` (local dev, deploy-to-dev, CI build) and `prd` (deploy-to-prod).
 *   - The marker `.doppler.yaml` (created by `doppler setup`) signals Doppler mode.
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');
const DOPPLER_MARKER = path.join(ROOT_DIR, '.doppler.yaml');

// ---------------------------------------------------------------------------
// Project identity
// ---------------------------------------------------------------------------

let _projectName = null;
export function getProjectName() {
  if (_projectName) return _projectName;
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  _projectName = pkg.name;
  if (!_projectName) {
    throw new Error('package.json has no "name" field — cannot derive Doppler project name.');
  }
  return _projectName;
}

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------

export function isDopplerEnabled() {
  return fs.existsSync(DOPPLER_MARKER);
}

// ---------------------------------------------------------------------------
// Shell helpers
// ---------------------------------------------------------------------------

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function tryRun(cmd) {
  try {
    return { ok: true, stdout: execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }) };
  } catch (err) {
    return { ok: false, stdout: err.stdout?.toString() || '', stderr: err.stderr?.toString() || '', code: err.status };
  }
}

function commandExists(name) {
  return tryRun(`command -v ${name}`).ok;
}

// ---------------------------------------------------------------------------
// CLI install
// ---------------------------------------------------------------------------

export function ensureCliInstalled() {
  if (commandExists('doppler')) return;

  const platform = os.platform();
  console.log('Doppler CLI not found — installing…');

  if (platform === 'darwin') {
    if (!commandExists('brew')) {
      throw new Error(
        'Homebrew is required to install Doppler on macOS but is not installed.\n' +
        'Install Homebrew from https://brew.sh and re-run this script.'
      );
    }
    run('brew install gnupg', { stdio: 'inherit' });
    run('brew install dopplerhq/cli/doppler', { stdio: 'inherit' });
  } else if (platform === 'linux') {
    run(
      `(curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh)`,
      { stdio: 'inherit' }
    );
  } else {
    throw new Error(
      `Unsupported platform "${platform}" for auto-install. ` +
      `Install Doppler manually: https://docs.doppler.com/docs/install-cli`
    );
  }

  if (!commandExists('doppler')) {
    throw new Error('Doppler install completed but `doppler` is still not on PATH.');
  }
  console.log('Doppler CLI installed.');
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export function ensureLoggedIn() {
  const probe = tryRun('doppler me --json');
  if (probe.ok) return;
  console.log('Doppler login required — opening browser…');
  // `doppler login` opens the OAuth flow. It blocks until the user completes
  // it in the browser. No dashboard navigation is required beyond OAuth.
  const result = spawnSync('doppler', ['login', '--yes'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('doppler login failed or was cancelled.');
  }
}

// ---------------------------------------------------------------------------
// Project & config provisioning
// ---------------------------------------------------------------------------

export function ensureProject(name = getProjectName()) {
  const probe = tryRun(`doppler projects get ${shellQuote(name)} --json`);
  if (probe.ok) return;

  console.log(`Creating Doppler project "${name}"…`);
  run(`doppler projects create ${shellQuote(name)}`);

  // Doppler auto-creates dev/stg/prd configs. We only want dev and prd.
  // Best-effort delete; ignore failures if `stg` doesn't exist.
  tryRun(`doppler configs delete stg --project ${shellQuote(name)} --yes`);
}

export function setupRepoForConfig(config = 'dev', name = getProjectName()) {
  // Pin this repo to <project>/<config>. Writes .doppler.yaml.
  run(`doppler setup --no-interactive --project ${shellQuote(name)} --config ${shellQuote(config)}`);
}

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

export function setSecret(key, value, config, name = getProjectName()) {
  // Use spawnSync to avoid escaping problems with secret values.
  const result = spawnSync(
    'doppler',
    ['secrets', 'set', `${key}=${value}`, '--project', name, '--config', config, '--silent'],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  );
  if (result.status !== 0) {
    throw new Error(`doppler secrets set ${key} failed.`);
  }
}

export function setSecrets(entries, config, name = getProjectName()) {
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null) continue;
    setSecret(key, String(value), config, name);
  }
}

export function downloadSecrets(config, name = getProjectName()) {
  const out = run(
    `doppler secrets download --no-file --format json --project ${shellQuote(name)} --config ${shellQuote(config)}`,
    { stdio: 'pipe', silent: true }
  );
  return JSON.parse(out);
}

export function uploadInitialSecrets(envFilePath, config, name = getProjectName()) {
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Cannot upload secrets — file not found: ${envFilePath}`);
  }
  run(
    `doppler secrets upload ${shellQuote(envFilePath)} --project ${shellQuote(name)} --config ${shellQuote(config)}`
  );
}

// ---------------------------------------------------------------------------
// Service tokens
// ---------------------------------------------------------------------------

export function createServiceToken(config, tokenName, name = getProjectName()) {
  const out = run(
    `doppler configs tokens create ${shellQuote(tokenName)} --project ${shellQuote(name)} --config ${shellQuote(config)} --plain`,
    { stdio: 'pipe', silent: true }
  );
  const token = out.trim();
  if (!token.startsWith('dp.')) {
    throw new Error(`Unexpected service-token format from doppler: ${token.slice(0, 10)}…`);
  }
  return token;
}

export function revokeServiceToken(config, tokenName, name = getProjectName()) {
  // Idempotent — Doppler returns non-zero if token doesn't exist; treat as success.
  const result = tryRun(
    `doppler configs tokens revoke ${shellQuote(tokenName)} --project ${shellQuote(name)} --config ${shellQuote(config)} --yes`
  );
  return result.ok;
}

// ---------------------------------------------------------------------------
// GitHub Actions secrets
// ---------------------------------------------------------------------------

export function pushTokenToGithub(token, secretName) {
  if (!commandExists('gh')) {
    throw new Error(
      'GitHub CLI (`gh`) is required to push the CI service token to GitHub Actions secrets.\n' +
      'Install: https://cli.github.com/'
    );
  }
  const result = spawnSync('gh', ['secret', 'set', secretName, '--body', token], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (result.status !== 0) {
    throw new Error(`gh secret set ${secretName} failed.`);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function shellQuote(value) {
  // Wrap in single quotes; escape any embedded single quotes.
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
