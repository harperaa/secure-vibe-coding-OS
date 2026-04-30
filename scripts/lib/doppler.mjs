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
  // POSIX shells use `command -v`; Windows cmd.exe uses `where`. Try both.
  if (os.platform() === 'win32') {
    return tryRun(`where ${name}`).ok;
  }
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
    installOnMac();
  } else if (platform === 'linux') {
    runOfficialCurlInstaller();
  } else if (platform === 'win32') {
    installOnWindows();
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

/**
 * Run Doppler's official curl|sh installer. Used directly on Linux, and as a
 * fallback on macOS when brew is unavailable or fails (e.g. outdated Xcode CLT,
 * broken brew install). Requires sudo because it writes to /usr/local/bin.
 */
function runOfficialCurlInstaller() {
  run(
    `(curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh)`,
    { stdio: 'inherit' }
  );
}

/**
 * macOS install. Tries brew first (zero-sudo, easy uninstall), falls back to
 * Doppler's official curl installer if brew is missing or fails. Brew failure
 * is common when Xcode Command Line Tools are outdated — we don't want a
 * stale CLT to block the whole install when a sudo curl|sh path works fine.
 */
function installOnMac() {
  if (commandExists('brew')) {
    console.log('Trying brew install dopplerhq/cli/doppler…');
    // gnupg is a soft dep used for verifying signed releases; not fatal if it fails.
    tryRun('brew install gnupg');
    const brewInstall = tryRun('brew install dopplerhq/cli/doppler');
    if (brewInstall.ok && commandExists('doppler')) {
      return;
    }
    if (brewInstall.stderr) {
      console.log(brewInstall.stderr);
    }
    console.log('brew install failed — falling back to Doppler\'s official curl installer (will prompt for sudo)…');
  } else {
    console.log('Homebrew not found — using Doppler\'s official curl installer (will prompt for sudo)…');
  }
  runOfficialCurlInstaller();
}

/**
 * Best-effort Windows install. Tries (in order):
 *   1. winget — Doppler's docs claim winget support, but as of this writing
 *      (verified 2026-04) Doppler is not in the official winget-pkgs repo, so
 *      this attempt will usually fail. Kept first because it's zero-setup if
 *      Doppler ever ships the manifest.
 *   2. scoop — Doppler's recommended Windows path; requires user to have
 *      installed scoop themselves (we don't auto-install scoop because that
 *      requires changing PowerShell's execution policy).
 *   3. Throws with a clear, actionable error pointing the user at three
 *      options: install scoop, install via winget once Doppler ships there,
 *      or download the binary directly.
 */
function installOnWindows() {
  // Attempt 1: winget
  const winget = tryRun('winget --version');
  if (winget.ok) {
    console.log('Trying winget install Doppler.doppler…');
    const wingetInstall = tryRun(
      'winget install --id Doppler.doppler -e --accept-source-agreements --accept-package-agreements'
    );
    if (wingetInstall.ok && commandExists('doppler')) {
      console.log('Installed via winget.');
      return;
    }
    // Don't error here — fall through to scoop.
    console.log('winget did not install Doppler (package may not be published yet). Trying scoop…');
  }

  // Attempt 2: scoop (must be already installed; we don't bootstrap it)
  if (commandExists('scoop')) {
    console.log('Adding Doppler bucket and installing via scoop…');
    run('scoop bucket add doppler https://github.com/DopplerHQ/scoop-doppler.git', { stdio: 'inherit' });
    run('scoop install doppler', { stdio: 'inherit' });
    return;
  }

  // Attempt 3: nothing worked — give the user a structured choice.
  throw new Error(
    [
      'Could not auto-install Doppler on Windows.',
      '',
      'Pick one of these and re-run /install:',
      '',
      '  Option A — Install scoop (recommended), then re-run:',
      '    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser',
      '    irm get.scoop.sh | iex',
      '',
      '  Option B — Use WSL: open an Ubuntu/Debian shell and re-run /install',
      '    from the project directory inside WSL. The Linux installer will run.',
      '',
      '  Option C — Download a release binary from',
      '    https://github.com/DopplerHQ/cli/releases',
      '    and add it to your PATH.',
      '',
      'Reference: https://docs.doppler.com/docs/install-cli',
    ].join('\n')
  );
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
