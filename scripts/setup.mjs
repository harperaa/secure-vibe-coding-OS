#!/usr/bin/env node

/**
 * Automated Setup Script for Secure Vibe Coding OS
 *
 * Subcommands:
 *   init                - Create Clerk app, generate secrets, write .env.local
 *   convex-setup        - Login check, team selection, project creation (non-interactive)
 *   configure           - Set up webhook + Convex env vars (run after Convex setup)
 *   detect-port         - Find an available port starting from 3000
 *   write-install-summary - Write installation summary to docs/INSTALL.md
 *
 * All input comes from CLI arguments (no interactive prompts).
 * Designed to be called by the /install Claude Code command.
 *
 * Usage:
 *   node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com"
 *   node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com" --clerk-pk=pk_test_... --clerk-sk=sk_test_...
 *   node scripts/setup.mjs convex-setup --project-name="My App" [--team=team-slug]
 *   node scripts/setup.mjs configure --clerk-sk=sk_test_... --admin-email="me@example.com"
 *   node scripts/setup.mjs write-install-summary [--claim-url=...] [--accountless=true] [--completed-steps=...] [--manual-steps=...]
 */

import { createClerkClient } from '@clerk/backend';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import {
  ensureCliInstalled as dopplerEnsureCli,
  ensureLoggedIn as dopplerEnsureLoggedIn,
  ensureProject as dopplerEnsureProject,
  setupRepoForConfig as dopplerSetupRepoForConfig,
  setSecrets as dopplerSetSecrets,
  downloadSecrets as dopplerDownloadSecrets,
  createServiceToken as dopplerCreateServiceToken,
  pushTokenToGithub as dopplerPushTokenToGithub,
  isDopplerEnabled as dopplerIsEnabled,
  getProjectName as dopplerGetProjectName,
} from './lib/doppler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env.local');
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

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
    } else if (!args._cmd) {
      args._cmd = arg;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// .env.local Helpers
// ---------------------------------------------------------------------------

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

function getEnvValue(content, key) {
  const regex = new RegExp(`^${key}=(.*)$`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function writeEnvVar(filePath, key, value) {
  let content = readEnvFile(filePath);
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + '\n' + line + '\n';
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

function ensureEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    if (fs.existsSync(ENV_EXAMPLE)) {
      fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
      console.log('Created .env.local from .env.example');
    } else {
      fs.writeFileSync(ENV_FILE, '', 'utf-8');
      console.log('Created empty .env.local');
    }
  }
}

// ---------------------------------------------------------------------------
// Secret Generation
// ---------------------------------------------------------------------------

function generateSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

// Reject obviously-bad admin emails. We only block what's clearly wrong
// (empty, malformed, or known placeholder strings) — actual deliverability
// is verified later when Clerk sends the sign-in email.
function isValidAdminEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  const blocked = ['example@example.com', 'admin@example.com', 'user@example.com', 'test@example.com'];
  return !blocked.includes(trimmed.toLowerCase());
}

// ---------------------------------------------------------------------------
// init Subcommand
// ---------------------------------------------------------------------------

async function runInit(args) {
  const siteName = args['site-name'];
  const adminEmail = args['admin-email'];
  let clerkPk = args['clerk-pk'];
  let clerkSk = args['clerk-sk'];

  if (!siteName || !adminEmail) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --site-name and --admin-email',
    }));
    process.exit(1);
  }

  if (!isValidAdminEmail(adminEmail)) {
    console.error(JSON.stringify({
      success: false,
      error: `Invalid --admin-email "${adminEmail}". Must be a real email; placeholders like example@example.com are not allowed.`,
    }));
    process.exit(1);
  }

  // Doppler mode is detected once at the start of init. If enabled, every value
  // we'd otherwise write to .env.local is collected into pendingDopplerValues
  // and pushed to Doppler `dev` in a single batch at the end of init. We never
  // touch .env.local in Doppler mode — its own header tells the user secrets
  // live in Doppler, and writing them locally would contradict that.
  const dopplerMode = dopplerIsEnabled();
  const pendingDopplerValues = {};

  function persistEnvVar(key, value) {
    if (dopplerMode) {
      pendingDopplerValues[key] = value;
    } else {
      writeEnvVar(ENV_FILE, key, value);
    }
  }

  const result = {
    success: true,
    steps: [],
    claimUrl: null,
    apiKeysUrl: null,
    envVarsSet: [],
    nextSteps: [],
  };

  // Step 1: Ensure .env.local exists (legacy mode only — Doppler mode never
  // writes secrets to .env.local; Convex CLI may create the file later for its
  // own deployment IDs, which is fine since those aren't secrets).
  if (!dopplerMode) {
    ensureEnvFile();
    result.steps.push('Ensured .env.local exists');

    // Step 1b: Clear Convex placeholder values so `npx convex dev` will prompt for fresh setup
    const placeholders = [
      { key: 'CONVEX_DEPLOYMENT', patterns: ['your_convex_deployment'] },
      { key: 'NEXT_PUBLIC_CONVEX_URL', patterns: ['your-convex-url', 'your_convex'] },
    ];
    for (const { key, patterns } of placeholders) {
      const val = getEnvValue(readEnvFile(ENV_FILE), key);
      if (val && patterns.some(p => val.includes(p))) {
        writeEnvVar(ENV_FILE, key, '');
        result.steps.push(`Cleared placeholder for ${key}`);
      }
    }
  }

  // Step 2: Generate CSRF and Session secrets. In legacy mode, reuse any existing
  // secrets in .env.local (so re-running init is idempotent). In Doppler mode,
  // always generate fresh — the bootstrap precondition is a clean Doppler config.
  let csrfSecret;
  let sessionSecret;
  if (dopplerMode) {
    csrfSecret = generateSecret();
    sessionSecret = generateSecret();
  } else {
    const envContent = readEnvFile(ENV_FILE);
    const existingCsrf = getEnvValue(envContent, 'CSRF_SECRET');
    const existingSession = getEnvValue(envContent, 'SESSION_SECRET');
    csrfSecret = (existingCsrf && !existingCsrf.includes('<')) ? existingCsrf : generateSecret();
    sessionSecret = (existingSession && !existingSession.includes('<')) ? existingSession : generateSecret();
  }

  persistEnvVar('CSRF_SECRET', csrfSecret);
  persistEnvVar('SESSION_SECRET', sessionSecret);
  result.steps.push('Generated CSRF_SECRET and SESSION_SECRET');
  result.envVarsSet.push('CSRF_SECRET', 'SESSION_SECRET');

  // Step 3: Site name
  persistEnvVar('NEXT_PUBLIC_SITE_NAME', siteName);
  result.steps.push(`Set NEXT_PUBLIC_SITE_NAME=${siteName}`);
  result.envVarsSet.push('NEXT_PUBLIC_SITE_NAME');

  // Step 4: Clerk keys - create accountless app or use provided
  let accountless = false;
  if (!clerkPk || !clerkSk) {
    console.log('No Clerk keys provided, creating accountless application...');
    try {
      const clerkClient = createClerkClient({ secretKey: '' });
      const app = await clerkClient.__experimental_accountlessApplications.createAccountlessApplication();
      clerkPk = app.publishableKey;
      clerkSk = app.secretKey;
      result.claimUrl = app.claimUrl;
      result.apiKeysUrl = app.apiKeysUrl;
      accountless = true;
      result.steps.push('Created Clerk accountless application');
    } catch (err) {
      console.error(JSON.stringify({
        success: false,
        error: `Failed to create accountless application: ${err.message}`,
        hint: 'You may need to provide --clerk-pk and --clerk-sk instead',
      }));
      process.exit(1);
    }
  } else {
    result.steps.push('Using provided Clerk API keys');
  }

  persistEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', clerkPk);
  persistEnvVar('CLERK_SECRET_KEY', clerkSk);
  result.envVarsSet.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY');

  // Step 5: Get Frontend API URL and create JWT template
  const clerk = createClerkClient({ secretKey: clerkSk });

  // Get the frontend API URL from domains
  let frontendApiUrl;
  try {
    // Clerk's publishable key contains the frontend API as base64
    // Format: pk_test_<base64-encoded-frontend-api-minus-.accounts.dev>
    const pkParts = clerkPk.split('_');
    const encoded = pkParts[pkParts.length - 1];
    // Remove any trailing characters and decode
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    // The decoded value ends with '$' - remove it, then append .accounts.dev if needed
    const cleanDomain = decoded.replace(/\$$/, '');
    if (cleanDomain.includes('.clerk.accounts.')) {
      frontendApiUrl = `https://${cleanDomain}`;
    } else {
      frontendApiUrl = `https://${cleanDomain}.clerk.accounts.dev`;
    }
    result.steps.push(`Derived Frontend API URL: ${frontendApiUrl}`);
  } catch (err) {
    // Fallback: try domains.list()
    try {
      const domains = await clerk.domains.list();
      const primary = domains.data?.find(d => d.isPrimary) || domains.data?.[0];
      if (primary) {
        frontendApiUrl = `https://${primary.name}`;
        result.steps.push(`Got Frontend API URL from domains: ${frontendApiUrl}`);
      }
    } catch (domainErr) {
      result.steps.push(`Warning: Could not determine Frontend API URL: ${err.message}`);
    }
  }

  if (frontendApiUrl) {
    persistEnvVar('NEXT_PUBLIC_CLERK_FRONTEND_API_URL', frontendApiUrl);
    result.envVarsSet.push('NEXT_PUBLIC_CLERK_FRONTEND_API_URL');
  }

  // Step 6: Create JWT template for Convex (idempotent)
  try {
    const existingTemplates = await clerk.jwtTemplates.list();
    const convexTemplate = existingTemplates.data?.find(
      t => t.name?.toLowerCase() === 'convex'
    );

    if (convexTemplate) {
      result.steps.push('JWT template "convex" already exists, skipping');
    } else {
      await clerk.jwtTemplates.create({
        name: 'convex',
        claims: { aud: 'convex' },
        lifetime: 60,
      });
      result.steps.push('Created JWT template "convex"');
    }
  } catch (err) {
    result.steps.push(`Warning: JWT template creation failed: ${err.message}. You may need to create it manually in Clerk Dashboard > JWT Templates > convex`);
  }

  // Step 7: Set redirect URLs
  const redirectVars = {
    'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL': '/dashboard',
  };
  for (const [key, value] of Object.entries(redirectVars)) {
    persistEnvVar(key, value);
    result.envVarsSet.push(key);
  }
  result.steps.push('Set Clerk redirect URLs');

  // Step 8 (Doppler mode only): flush all collected values to Doppler `dev`.
  // No values were written to .env.local above — Doppler is the only store.
  // Convex outputs (CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL) come later from
  // `npx convex dev` and are synced via `doppler-sync-env-local`.
  if (dopplerMode) {
    try {
      dopplerSetSecrets(pendingDopplerValues, 'dev');
      result.steps.push(`Pushed ${Object.keys(pendingDopplerValues).length} secrets to Doppler dev config (no .env.local written)`);
    } catch (err) {
      result.steps.push(`Warning: Doppler push failed: ${err.message}`);
    }
  }

  // Build next steps
  if (accountless) {
    result.nextSteps.push(`Claim your Clerk app at: ${result.claimUrl}`);
  }
  result.nextSteps.push('Run: npx convex dev --once (to set up Convex project)');
  if (dopplerIsEnabled()) {
    result.nextSteps.push('Run: node scripts/setup.mjs doppler-sync-env-local (push Convex outputs to Doppler)');
  }
  result.nextSteps.push('Run: node scripts/setup.mjs configure --clerk-sk=<key> --admin-email=<email>');

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// configure Subcommand
// ---------------------------------------------------------------------------

async function runConfigure(args) {
  const clerkSk = args['clerk-sk'];
  const adminEmail = args['admin-email'];

  if (!clerkSk || !adminEmail) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --clerk-sk and --admin-email',
    }));
    process.exit(1);
  }

  if (!isValidAdminEmail(adminEmail)) {
    console.error(JSON.stringify({
      success: false,
      error: `Invalid --admin-email "${adminEmail}". Must be a real email; placeholders like example@example.com are not allowed.`,
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    convexEnvVarsSet: [],
    manualSteps: [],
  };

  // Step 1: Read NEXT_PUBLIC_CONVEX_URL. Convex CLI always writes this to
  // .env.local, even in Doppler mode, so .env.local is authoritative for it.
  const envContent = readEnvFile(ENV_FILE);
  const convexUrl = getEnvValue(envContent, 'NEXT_PUBLIC_CONVEX_URL');

  if (!convexUrl || convexUrl.includes('your-convex')) {
    console.error(JSON.stringify({
      success: false,
      error: 'NEXT_PUBLIC_CONVEX_URL not found in .env.local. Run "npx convex dev --once" first.',
    }));
    process.exit(1);
  }

  // Step 2: Derive HTTP Actions URL
  const httpActionsUrl = convexUrl.replace('.convex.cloud', '.convex.site');
  const webhookEndpointUrl = `${httpActionsUrl}/clerk-users-webhook`;
  result.steps.push(`Derived webhook endpoint URL: ${webhookEndpointUrl}`);

  // Step 3: Get Frontend API URL. In Doppler mode this lives in Doppler, not
  // .env.local (init pushed it straight to Doppler `dev`). Fall back to .env.local
  // for legacy mode.
  let frontendApiUrl;
  if (dopplerIsEnabled()) {
    try {
      const dopplerSecrets = dopplerDownloadSecrets('dev');
      frontendApiUrl = dopplerSecrets?.NEXT_PUBLIC_CLERK_FRONTEND_API_URL;
    } catch (err) {
      result.steps.push(`Warning: could not read NEXT_PUBLIC_CLERK_FRONTEND_API_URL from Doppler: ${err.message}`);
    }
  } else {
    frontendApiUrl = getEnvValue(envContent, 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL');
  }

  // Step 4: Create webhook endpoint via Svix
  const clerk = createClerkClient({ secretKey: clerkSk });
  let webhookSecret = null;

  try {
    // Ensure Svix app exists for this Clerk instance
    try {
      await clerk.webhooks.createSvixApp();
      result.steps.push('Created Svix app for Clerk webhooks');
    } catch {
      // Already exists is expected — continue
      result.steps.push('Svix app already configured');
    }

    // Get one-time token from Clerk's Svix auth URL
    const svixAuth = await clerk.webhooks.generateSvixAuthURL();
    const svixUrl = svixAuth.svix_url;
    const keyMatch = svixUrl.match(/key=([^&]+)/);
    if (!keyMatch) throw new Error('Could not extract key from Svix auth URL');

    const decoded = JSON.parse(Buffer.from(keyMatch[1], 'base64').toString('utf-8'));
    const { appId, oneTimeToken, region } = decoded;
    const svixBaseUrl = region === 'eu' ? 'https://api.eu.svix.com' : 'https://api.svix.com';

    // Exchange one-time token for a real Svix API token
    const tokenResp = await fetch(`${svixBaseUrl}/api/v1/auth/one-time-token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oneTimeToken, appId }),
    });
    if (!tokenResp.ok) {
      throw new Error(`Svix token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`);
    }
    const { token: svixToken } = await tokenResp.json();
    result.steps.push('Exchanged Svix one-time token for API token');

    // Create Svix client with the real API token
    const { Svix } = await import('svix');
    const svix = new Svix(svixToken, { serverUrl: svixBaseUrl });

    // Check for existing endpoint with same URL (idempotent)
    const existing = await svix.endpoint.list(appId);
    const existingEp = existing.data?.find(ep => ep.url === webhookEndpointUrl);

    let endpointId;
    if (existingEp) {
      endpointId = existingEp.id;
      result.steps.push('Webhook endpoint already exists, reusing');
    } else {
      const endpoint = await svix.endpoint.create(appId, {
        url: webhookEndpointUrl,
        description: 'Convex clerk-users-webhook',
        filterTypes: [
          'user.created',
          'user.updated',
          'user.deleted',
          'paymentAttempt.updated',
        ],
      });
      endpointId = endpoint.id;
      result.steps.push('Created webhook endpoint via Svix');
    }

    // Get the webhook signing secret
    const secret = await svix.endpoint.getSecret(appId, endpointId);
    webhookSecret = secret.key;
    result.steps.push(`Retrieved webhook signing secret: ${webhookSecret.substring(0, 10)}...`);
  } catch (err) {
    result.steps.push(`Webhook creation failed: ${err.message}`);
    result.manualSteps.push(
      'Create webhook manually in Clerk Dashboard:',
      `  1. Go to Clerk Dashboard > Configure > Webhooks > Add Endpoint`,
      `  2. Endpoint URL: ${webhookEndpointUrl}`,
      `  3. Subscribe to events: user.created, user.updated, user.deleted, paymentAttempt.updated`,
      `  4. Click Create, copy the Signing Secret (whsec_...)`,
      `  5. Run: npx convex env set CLERK_WEBHOOK_SECRET whsec_YOUR_SECRET`,
    );
  }

  // Step 5: Set Convex env vars
  const convexVarsToSet = {};

  if (webhookSecret) {
    convexVarsToSet['CLERK_WEBHOOK_SECRET'] = webhookSecret;
  }
  if (frontendApiUrl && !frontendApiUrl.includes('your-clerk')) {
    convexVarsToSet['NEXT_PUBLIC_CLERK_FRONTEND_API_URL'] = frontendApiUrl;
  }
  convexVarsToSet['ADMIN_EMAIL'] = adminEmail;

  // In Doppler mode: push the values to Doppler dev first, then run the sync
  // script so Doppler is the source of truth and Convex's env mirrors it.
  if (dopplerIsEnabled()) {
    try {
      dopplerSetSecrets(convexVarsToSet, 'dev');
      result.steps.push(`Mirrored Convex-bound secrets to Doppler dev config`);
    } catch (err) {
      result.steps.push(`Warning: Doppler mirror failed: ${err.message}`);
    }
    const sync = spawnSync('node', ['scripts/sync-convex-env.mjs', '--config=dev'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    if (sync.status === 0) {
      const last = (sync.stdout || '').trim().split('\n').pop();
      result.steps.push(`Synced Convex env via Doppler: ${last}`);
      // Best-effort: report which keys actually got set (Convex sync output mentions them)
      result.convexEnvVarsSet = Object.keys(convexVarsToSet);
    } else {
      result.steps.push(`Convex sync failed: ${(sync.stderr || sync.stdout || '').trim()}`);
      result.manualSteps.push(
        'Run `node scripts/sync-convex-env.mjs --config=dev` after fixing the error.'
      );
    }
  } else {
    for (const [key, value] of Object.entries(convexVarsToSet)) {
      try {
        execSync(`npx convex env set ${key} "${value}"`, {
          cwd: ROOT_DIR,
          stdio: 'pipe',
          timeout: 30000,
        });
        result.convexEnvVarsSet.push(key);
        result.steps.push(`Set Convex env var: ${key}`);
      } catch (err) {
        result.steps.push(`Failed to set Convex env var ${key}: ${err.message}`);
        result.manualSteps.push(
          `Set ${key} in Convex Dashboard > Settings > Environment Variables`
        );
      }
    }
  }

  // Build remaining manual steps
  if (result.manualSteps.length === 0) {
    result.steps.push('All Convex environment variables set successfully');
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// convex-setup Subcommand
// ---------------------------------------------------------------------------

async function runConvexSetup(args) {
  const projectName = args['project-name'];
  const teamSlug = args['team'];

  if (!projectName) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required argument: --project-name',
    }));
    process.exit(1);
  }

  const result = {
    success: false,
    steps: [],
  };

  // Step 1: Check if already configured with valid deployment
  const envContent = readEnvFile(ENV_FILE);
  const deployment = getEnvValue(envContent, 'CONVEX_DEPLOYMENT');
  const convexUrl = getEnvValue(envContent, 'NEXT_PUBLIC_CONVEX_URL');

  if (deployment && !deployment.includes('your_') && deployment !== '' &&
      convexUrl && !convexUrl.includes('your_') && convexUrl !== '') {
    // Already configured — try syncing
    try {
      execSync('npx convex dev --once', {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 120000,
      });
      result.success = true;
      result.alreadyConfigured = true;
      result.steps.push('Convex already configured, synced successfully');
      result.deployment = deployment;
      result.url = convexUrl;
      console.log(JSON.stringify(result, null, 2));
      return;
    } catch {
      // Config exists but sync failed — fall through to fresh setup
      result.steps.push('Existing configuration found but sync failed, proceeding with setup');
    }
  }

  // Step 2: Check login status
  let loginOutput = '';
  try {
    loginOutput = execSync('npx convex login status 2>&1', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      timeout: 15000,
    });
  } catch (err) {
    loginOutput = (err.stdout || '') + (err.stderr || '');
  }

  const isLoggedIn = loginOutput.includes('Logged in');

  if (!isLoggedIn) {
    console.log(JSON.stringify({
      success: false,
      needsLogin: true,
      message: 'Not logged in to Convex. Run the login command first.',
    }));
    return;
  }

  result.steps.push('Convex login verified');

  // Step 3: Parse teams from login status output
  const teams = [];
  const teamRegex = /^\s+-\s+(.+?)\s+\(([^)]+)\)\s*$/gm;
  let match;
  while ((match = teamRegex.exec(loginOutput)) !== null) {
    teams.push({ name: match[1], slug: match[2] });
  }

  if (teams.length === 0) {
    console.log(JSON.stringify({
      success: false,
      error: 'No Convex teams found. Create a team at https://dashboard.convex.dev first.',
    }));
    return;
  }

  // Step 4: Select team
  const selectedTeam = teamSlug || (teams.length === 1 ? teams[0].slug : null);

  if (!selectedTeam) {
    console.log(JSON.stringify({
      success: false,
      needsTeamSelection: true,
      teams,
      message: 'Multiple teams found. Specify which team with --team=SLUG.',
    }));
    return;
  }

  result.steps.push(`Selected team: ${selectedTeam}`);

  // Step 5: Derive project slug from project name
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);

  result.steps.push(`Project slug: ${projectSlug}`);

  // Step 6: Clear any stale/empty Convex values before configure=new
  for (const key of ['CONVEX_DEPLOYMENT', 'NEXT_PUBLIC_CONVEX_URL']) {
    const val = getEnvValue(readEnvFile(ENV_FILE), key);
    if (val === '' || (val && val.includes('your_'))) {
      writeEnvVar(ENV_FILE, key, '');
    }
  }

  // Step 7: Create project via Convex CLI (non-interactive)
  try {
    const cmd = [
      'npx convex dev --once',
      `--configure=new`,
      `--team="${selectedTeam}"`,
      `--project="${projectSlug}"`,
      `--dev-deployment=cloud`,
    ].join(' ');

    const output = execSync(cmd, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000,
    });
    result.steps.push('Convex project created and functions deployed');

    if (output) {
      // Capture any useful info from output
      const lines = output.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        result.steps.push(`CLI output: ${lines.slice(-3).join(' | ')}`);
      }
    }
  } catch (err) {
    // The Convex CLI may exit non-zero but still succeed in creating the project
    // and writing to .env.local (e.g. due to warnings or typecheck issues).
    // Check .env.local before reporting failure.
    const errOutput = ((err.stdout || '') + (err.stderr || '')).trim();
    const fallbackEnv = readEnvFile(ENV_FILE);
    const fallbackDeployment = getEnvValue(fallbackEnv, 'CONVEX_DEPLOYMENT');
    const fallbackUrl = getEnvValue(fallbackEnv, 'NEXT_PUBLIC_CONVEX_URL');

    if (fallbackDeployment && fallbackDeployment !== '' && !fallbackDeployment.includes('your_') &&
        fallbackUrl && fallbackUrl !== '' && !fallbackUrl.includes('your_')) {
      // Project was actually created despite the non-zero exit code
      result.steps.push('Convex CLI exited with warnings but project was created successfully');
    } else {
      console.log(JSON.stringify({
        success: false,
        error: `Convex project creation failed`,
        detail: errOutput.substring(0, 1000),
        hint: 'Try running manually: npx convex dev --once',
        steps: result.steps,
      }));
      return;
    }
  }

  // Step 8: Verify .env.local was updated
  const updatedEnv = readEnvFile(ENV_FILE);
  const newDeployment = getEnvValue(updatedEnv, 'CONVEX_DEPLOYMENT');
  const newUrl = getEnvValue(updatedEnv, 'NEXT_PUBLIC_CONVEX_URL');

  if (!newDeployment || newDeployment === '' || !newUrl || newUrl === '') {
    console.log(JSON.stringify({
      success: false,
      error: 'Convex CLI ran but .env.local was not updated with deployment info',
      hint: 'Check .env.local manually or re-run: npx convex dev --once',
      steps: result.steps,
    }));
    return;
  }

  result.success = true;
  result.deployment = newDeployment;
  result.url = newUrl;
  result.steps.push(`Deployment: ${newDeployment}`);
  result.steps.push(`URL: ${newUrl}`);

  // Also set the local site URL. In Doppler mode this goes straight to Doppler;
  // in legacy mode it lands in .env.local like the other values.
  const existingSiteUrl = getEnvValue(updatedEnv, 'NEXT_PUBLIC_SITE_URL');
  if (!existingSiteUrl || existingSiteUrl.includes('your_')) {
    if (dopplerIsEnabled()) {
      try {
        dopplerSetSecrets({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }, 'dev');
        result.steps.push('Pushed NEXT_PUBLIC_SITE_URL=http://localhost:3000 to Doppler dev');
      } catch (err) {
        result.steps.push(`Warning: Doppler push for NEXT_PUBLIC_SITE_URL failed: ${err.message}`);
      }
    } else {
      writeEnvVar(ENV_FILE, 'NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
      result.steps.push('Set NEXT_PUBLIC_SITE_URL=http://localhost:3000');
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// detect-port Subcommand
// ---------------------------------------------------------------------------

import net from 'node:net';

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function runDetectPort() {
  let port = 3000;
  while (!(await checkPort(port))) {
    port++;
  }
  console.log(JSON.stringify({ port, url: `http://localhost:${port}` }));
}

// ---------------------------------------------------------------------------
// write-install-summary Subcommand
// ---------------------------------------------------------------------------

async function runWriteInstallSummary(args) {
  const claimUrl = args['claim-url'] || '';
  const accountless = args['accountless'] === 'true';

  const completedSteps = (args['completed-steps'] || '').split(',').filter(Boolean);
  const manualSteps = (args['manual-steps'] || '').split(',').filter(Boolean);

  const lines = [
    `# Installation Complete!`,
    ``,
    `## Automated Steps`,
    ``,
  ];

  for (const step of completedSteps) {
    lines.push(`- ${step}`);
  }

  if (claimUrl && accountless) {
    lines.push(``);
    lines.push(`## Claim Your Clerk App`);
    lines.push(``);
    lines.push(`Visit: ${claimUrl}`);
    lines.push(``);
    lines.push(`Click the **Claim** button to create your Clerk account — then skip the remaining`);
    lines.push(`setup steps on that page, as the installer has already configured everything for you.`);
    lines.push(`Refresh the page after claiming to access your Clerk dashboard.`);
  }

  if (manualSteps.length > 0) {
    lines.push(``);
    lines.push(`## Remaining Manual Steps`);
    lines.push(``);
    for (const step of manualSteps) {
      lines.push(`- [ ] ${step}`);
    }
  }

  lines.push(``);
  lines.push(`## Optional Steps (can be done later)`);
  lines.push(``);
  lines.push(`These are only needed when you're ready to enable paid subscriptions:`);
  lines.push(``);
  lines.push(`1. **Enable Billing** in Clerk Dashboard:`);
  lines.push(`   - Go to Clerk Dashboard > Billing > Settings > Enable Billing`);
  lines.push(`2. **Create a Subscription Plan**:`);
  lines.push(`   - Clerk Dashboard > Billing > Plans > Create Plan`);
  lines.push(`   - Name it, set monthly price, save`);
  lines.push(``);

  lines.push(`## Start Development`);
  lines.push(``);
  if (dopplerIsEnabled()) {
    lines.push(`Doppler mode is active — env vars come from your Doppler \`dev\` config.`);
    lines.push(``);
    lines.push(`Terminal 1: \`npm run convex:doppler\``);
    lines.push(`Terminal 2: \`npm run dev:doppler\``);
  } else {
    lines.push(`Terminal 1: \`npm run convex\``);
    lines.push(`Terminal 2: \`npm run dev\``);
  }
  lines.push(``);
  lines.push(`The URL to access your app will be shown in Terminal 2 output.`);
  lines.push(``);

  const content = lines.join('\n');
  const docsDir = path.join(ROOT_DIR, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const summaryPath = path.join(docsDir, 'INSTALL.md');
  fs.writeFileSync(summaryPath, content, 'utf-8');

  console.log(JSON.stringify({
    success: true,
    path: 'docs/INSTALL.md',
    absolutePath: summaryPath,
  }));
}

// ---------------------------------------------------------------------------
// doppler-bootstrap Subcommand (Doppler mode opt-in)
// ---------------------------------------------------------------------------
//
// Auto-installs Doppler CLI, drives `doppler login`, creates the project
// with `dev` and `prd` configs, and pins the repo to `dev` via .doppler.yaml.
// Idempotent — safe to re-run.

async function runDopplerBootstrap() {
  const result = { success: true, steps: [], project: null };

  try {
    dopplerEnsureCli();
    result.steps.push('Doppler CLI present');
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'install', error: err.message }));
    process.exit(1);
  }

  try {
    dopplerEnsureLoggedIn();
    result.steps.push('Doppler login confirmed');
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'login', error: err.message }));
    process.exit(1);
  }

  const projectName = dopplerGetProjectName();
  result.project = projectName;

  try {
    dopplerEnsureProject(projectName);
    result.steps.push(`Doppler project "${projectName}" ready (configs: dev, prd)`);
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'project', error: err.message }));
    process.exit(1);
  }

  try {
    dopplerSetupRepoForConfig('dev', projectName);
    result.steps.push('Repo pinned to project/config dev (.doppler.yaml written)');
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'setup-repo', error: err.message }));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// doppler-sync-env-local Subcommand
// ---------------------------------------------------------------------------
//
// Reads non-empty, non-placeholder values from .env.local and pushes them to
// the Doppler `dev` config. Used after `npx convex dev` writes
// CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL — those then need to land in
// Doppler so it remains the source of truth.

async function runDopplerSyncEnvLocal() {
  if (!dopplerIsEnabled()) {
    console.error(JSON.stringify({
      success: false,
      error: 'Doppler is not enabled for this repo (.doppler.yaml not found). Run `node scripts/setup.mjs doppler-bootstrap` first.',
    }));
    process.exit(1);
  }

  const result = { success: true, pushed: [], skipped: [] };

  if (!fs.existsSync(ENV_FILE)) {
    console.error(JSON.stringify({ success: false, error: '.env.local not found' }));
    process.exit(1);
  }

  const content = readEnvFile(ENV_FILE);
  const lines = content.split('\n');
  const payload = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip optional surrounding quotes.
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith(`'`) && value.endsWith(`'`))) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    if (!value || value.includes('your_') || value.includes('<')) {
      result.skipped.push(key);
      continue;
    }
    payload[key] = value;
  }

  try {
    dopplerSetSecrets(payload, 'dev');
    result.pushed = Object.keys(payload);
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// doppler-create-ci-token Subcommand
// ---------------------------------------------------------------------------
//
// Creates a read-only Doppler service token for the `dev` config and stores
// it as the GitHub Actions secret DOPPLER_TOKEN, so CI can run
// `doppler run -- npm run build` for branches that need NEXT_PUBLIC_* baked in.

async function runDopplerCreateCiToken() {
  const tokenName = 'github-actions-ci';
  const result = { success: true, steps: [] };

  let token;
  try {
    token = dopplerCreateServiceToken('dev', tokenName);
    result.steps.push(`Created Doppler service token "${tokenName}" (config=dev)`);
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'create-token', error: err.message }));
    process.exit(1);
  }

  try {
    dopplerPushTokenToGithub(token, 'DOPPLER_TOKEN');
    result.steps.push('Pushed DOPPLER_TOKEN to GitHub repo secrets via gh');
  } catch (err) {
    console.error(JSON.stringify({ success: false, step: 'gh-secret-set', error: err.message }));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// migrate-to-doppler Subcommand
// ---------------------------------------------------------------------------
//
// Walks an existing repo through migration to Doppler mode in three phases:
//   --phase=inventory   read-only: list what's in .env.local, Convex env, and
//                       Vercel env (per environment). Outputs JSON.
//   --phase=migrate     push the discovered values into Doppler (dev for the
//                       union of .env.local + Convex + Vercel-Development +
//                       Vercel-Preview, prd for Vercel-Production). Idempotent.
//   --phase=cleanup     destructive: remove the migrated keys from .env.local,
//                       Convex env, and Vercel env. Adds DOPPLER_TOKEN to
//                       Vercel as the only remaining env var. Requires --yes.
//
// Each phase is its own invocation so the slash command can prompt the user
// between them. The data flow uses --inventory-file=<path> to pass discovered
// values from `inventory` into `migrate` and `cleanup` without re-reading.

const PROTECTED_KEYS = new Set([
  // Bootstrap credential — never migrate this; we add it back at the end.
  'DOPPLER_TOKEN',
  // Vercel system vars — owned by the platform, never migrate.
  'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_REGION', 'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_REF', 'VERCEL_GIT_COMMIT_MESSAGE', 'VERCEL_GIT_COMMIT_AUTHOR_LOGIN',
  'VERCEL_GIT_COMMIT_AUTHOR_NAME', 'VERCEL_GIT_PROVIDER', 'VERCEL_GIT_REPO_OWNER',
  'VERCEL_GIT_REPO_SLUG', 'VERCEL_GIT_REPO_ID', 'VERCEL_GIT_PULL_REQUEST_ID',
  'VERCEL_DEPLOYMENT_ID', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_BRANCH_URL',
  'VERCEL_TARGET_ENV', 'VERCEL_OIDC_TOKEN',
]);

// Keys that must stay in Convex env after migration. Two reasons a key lands here:
//   1. Convex-local: lives only in Convex, never elsewhere (deploy keys).
//   2. Convex-mirrored: source of truth lives in Doppler, but Convex functions
//      run in Convex's runtime — they read process.env from Convex's env store,
//      not Doppler. So these have to be in BOTH places (Doppler upstream,
//      Convex mirror). `scripts/sync-convex-env.mjs` keeps the mirror current.
//      Keep this list in sync with sync-convex-env.mjs's CONVEX_ALLOWLIST.
const KEEP_IN_CONVEX = new Set([
  'CONVEX_DEPLOY_KEY',                    // Convex-local
  'CLERK_WEBHOOK_SECRET',                 // Convex-mirrored (used by convex/http.ts)
  'NEXT_PUBLIC_CLERK_FRONTEND_API_URL',   // Convex-mirrored (used by convex/auth.config.ts)
  'ADMIN_EMAIL',                          // Convex-mirrored (used by admin queries)
]);

function commandAvailable(name) {
  if (os.platform() === 'win32') {
    return spawnSync('where', [name], { stdio: 'ignore' }).status === 0;
  }
  return spawnSync('command', ['-v', name], { stdio: 'ignore', shell: true }).status === 0;
}

// Vercel is invoked via `npx vercel ...` everywhere in this repo (no global
// install required). Probe with `npx vercel --version` — npx returns non-zero
// if the package can't be resolved or the user has no internet to fetch it.
function vercelAvailable() {
  const r = spawnSync('npx', ['--no-install', 'vercel', '--version'], { stdio: 'ignore' });
  if (r.status === 0) return true;
  // Fall back to letting npx resolve from cache or registry once.
  const r2 = spawnSync('npx', ['vercel', '--version'], { stdio: 'ignore' });
  return r2.status === 0;
}

function readEnvFileAsMap(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const map = {};
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith(`'`) && value.endsWith(`'`));
    if (isQuoted) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments. Convex CLI in particular writes lines like
      //   CONVEX_DEPLOYMENT=dev:foo-bar-1 # team: allen, project: x
      // and we don't want the comment baked into the value when we push to
      // Doppler. Convention (matches dotenv): a SPACE then `#` introduces a
      // comment on an unquoted value. Values that legitimately contain `#`
      // (URL fragments, cron schedules, hex colors) won't have a leading
      // space, so they survive.
      const hashIdx = value.indexOf(' #');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trimEnd();
    }
    if (!key) continue;
    if (!value || value.includes('your_') || value.includes('<')) continue;
    map[key] = value;
  }
  return map;
}

function readConvexEnvList() {
  const result = spawnSync('npx', ['convex', 'env', 'list'], { encoding: 'utf-8' });
  if (result.status !== 0) {
    return { ok: false, error: (result.stderr || result.stdout || '').trim() };
  }
  const map = {};
  for (const line of (result.stdout || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value) map[key] = value;
  }
  return { ok: true, map };
}

// Returns { ok, byTarget: { production: {KEY:VAL}, preview: {...}, development: {...} } }
function readVercelEnv() {
  if (!vercelAvailable()) {
    return { ok: false, error: 'vercel CLI not resolvable via `npx vercel` (skipping Vercel migration)' };
  }
  const byTarget = { production: {}, preview: {}, development: {} };
  for (const target of Object.keys(byTarget)) {
    const tmp = path.join(os.tmpdir(), `vercel-env-${target}-${Date.now()}.txt`);
    const result = spawnSync(
      'npx',
      ['vercel', 'env', 'pull', tmp, '--environment', target, '--yes'],
      { encoding: 'utf-8' }
    );
    if (result.status !== 0) {
      // Project may not be linked yet, or no values for that target.
      continue;
    }
    if (fs.existsSync(tmp)) {
      byTarget[target] = readEnvFileAsMap(tmp);
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
  return { ok: true, byTarget };
}

async function runMigrateToDoppler(args) {
  const phase = args.phase || 'inventory';
  const inventoryPath = args['inventory-file'] || path.join(os.tmpdir(), 'doppler-migration-inventory.json');
  const yes = args.yes === 'true' || args.yes === true;

  if (!dopplerIsEnabled() && phase !== 'inventory') {
    console.error(JSON.stringify({
      success: false,
      error: 'Doppler is not enabled (.doppler.yaml missing). Run `node scripts/setup.mjs doppler-bootstrap` first.',
    }));
    process.exit(1);
  }

  if (phase === 'inventory') {
    const inventory = {
      envLocal: readEnvFileAsMap(ENV_FILE),
      convex: { ok: false, map: {} },
      vercel: { ok: false, byTarget: { production: {}, preview: {}, development: {} } },
    };

    const convex = readConvexEnvList();
    inventory.convex = convex.ok ? { ok: true, map: convex.map } : { ok: false, error: convex.error, map: {} };

    const vercel = readVercelEnv();
    inventory.vercel = vercel.ok ? { ok: true, byTarget: vercel.byTarget } : { ok: false, error: vercel.error, byTarget: { production: {}, preview: {}, development: {} } };

    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf-8');

    const counts = {
      envLocal: Object.keys(inventory.envLocal).length,
      convex: Object.keys(inventory.convex.map).length,
      vercelProduction: Object.keys(inventory.vercel.byTarget.production).length,
      vercelPreview: Object.keys(inventory.vercel.byTarget.preview).length,
      vercelDevelopment: Object.keys(inventory.vercel.byTarget.development).length,
    };

    console.log(JSON.stringify({ success: true, phase: 'inventory', inventoryPath, counts, inventory }, null, 2));
    return;
  }

  if (!fs.existsSync(inventoryPath)) {
    console.error(JSON.stringify({
      success: false,
      error: `Inventory file not found at ${inventoryPath}. Run --phase=inventory first.`,
    }));
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

  if (phase === 'migrate') {
    // Build the dev payload: union of .env.local + Convex + Vercel-Development + Vercel-Preview.
    // Build the prd payload: Vercel-Production.
    // Conflict resolution: .env.local > Convex > Vercel-Development > Vercel-Preview (most-local wins).
    const devPayload = {};
    const prdPayload = {};

    const merge = (target, source) => {
      for (const [k, v] of Object.entries(source || {})) {
        if (PROTECTED_KEYS.has(k)) continue;
        if (k in target) continue; // first writer wins
        target[k] = v;
      }
    };

    merge(devPayload, inventory.envLocal);
    merge(devPayload, inventory.convex.map);
    merge(devPayload, inventory.vercel.byTarget?.development);
    merge(devPayload, inventory.vercel.byTarget?.preview);
    merge(prdPayload, inventory.vercel.byTarget?.production);

    const result = { success: true, phase: 'migrate', pushedDev: [], pushedPrd: [] };

    if (Object.keys(devPayload).length > 0) {
      try {
        dopplerSetSecrets(devPayload, 'dev');
        result.pushedDev = Object.keys(devPayload);
      } catch (err) {
        console.error(JSON.stringify({ success: false, step: 'doppler-set-dev', error: err.message }));
        process.exit(1);
      }
    }

    if (Object.keys(prdPayload).length > 0) {
      try {
        dopplerSetSecrets(prdPayload, 'prd');
        result.pushedPrd = Object.keys(prdPayload);
      } catch (err) {
        console.error(JSON.stringify({ success: false, step: 'doppler-set-prd', error: err.message }));
        process.exit(1);
      }
    }

    // Persist what was migrated so cleanup knows exactly what to remove.
    inventory._migrated = { dev: Object.keys(devPayload), prd: Object.keys(prdPayload) };
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf-8');

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (phase === 'cleanup') {
    if (!yes) {
      console.error(JSON.stringify({
        success: false,
        error: 'Cleanup is destructive. Re-run with --yes after confirming.',
      }));
      process.exit(1);
    }

    const migrated = inventory._migrated || { dev: [], prd: [] };
    const allMigrated = new Set([...migrated.dev, ...migrated.prd]);

    const result = {
      success: true,
      phase: 'cleanup',
      removedFromEnvLocal: [],
      removedFromConvex: [],
      removedFromVercel: { production: [], preview: [], development: [] },
      envLocalDeleted: false,
      skipped: [],
    };

    // 1. Remove migrated keys from Convex env FIRST — `npx convex env unset`
    //    needs CONVEX_DEPLOYMENT in process.env (which Convex CLI loads from
    //    .env.local), so we must run Convex cleanup before stripping
    //    .env.local. Keys in KEEP_IN_CONVEX stay put — Convex-local deploy
    //    keys plus Convex-mirrored runtime values (sync-convex-env.mjs keeps
    //    the latter in sync with Doppler).
    if (inventory.convex.ok) {
      for (const key of Object.keys(inventory.convex.map)) {
        if (!allMigrated.has(key)) continue;
        if (KEEP_IN_CONVEX.has(key)) {
          result.skipped.push(`convex:${key} (kept — Convex runtime needs it)`);
          continue;
        }
        // One key per call — `convex env unset` only accepts a single arg.
        const r = spawnSync('npx', ['convex', 'env', 'unset', key], { stdio: 'inherit' });
        if (r.status === 0) result.removedFromConvex.push(key);
      }
    }

    // 2. Strip migrated keys out of .env.local. If the resulting file has
    //    nothing left except comments/empty lines, delete it.
    if (fs.existsSync(ENV_FILE)) {
      const original = fs.readFileSync(ENV_FILE, 'utf-8').split('\n');
      const kept = [];
      for (const line of original) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          kept.push(line);
          continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
          kept.push(line);
          continue;
        }
        const key = trimmed.slice(0, eq).trim();
        if (allMigrated.has(key)) {
          result.removedFromEnvLocal.push(key);
        } else {
          kept.push(line);
        }
      }
      const remainingNonComment = kept.filter(l => l.trim() && !l.trim().startsWith('#'));
      if (remainingNonComment.length === 0) {
        fs.unlinkSync(ENV_FILE);
        result.envLocalDeleted = true;
      } else {
        fs.writeFileSync(ENV_FILE, kept.join('\n'), 'utf-8');
      }
    }

    // 3. Remove migrated keys from Vercel env in each target.
    if (inventory.vercel.ok && vercelAvailable()) {
      for (const target of ['production', 'preview', 'development']) {
        const targetMap = inventory.vercel.byTarget?.[target] || {};
        for (const key of Object.keys(targetMap)) {
          if (!allMigrated.has(key)) continue;
          if (PROTECTED_KEYS.has(key)) continue;
          const r = spawnSync('npx', ['vercel', 'env', 'rm', key, target, '--yes'], { stdio: 'inherit' });
          if (r.status === 0) result.removedFromVercel[target].push(key);
        }
      }
    }

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(JSON.stringify({
    success: false,
    error: `Unknown --phase "${phase}". Valid: inventory | migrate | cleanup`,
  }));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);
const command = args._cmd;

switch (command) {
  case 'init':
    await runInit(args);
    break;
  case 'configure':
    await runConfigure(args);
    break;
  case 'convex-setup':
    await runConvexSetup(args);
    break;
  case 'detect-port':
    await runDetectPort();
    break;
  case 'write-install-summary':
    await runWriteInstallSummary(args);
    break;
  case 'doppler-bootstrap':
    await runDopplerBootstrap();
    break;
  case 'doppler-sync-env-local':
    await runDopplerSyncEnvLocal();
    break;
  case 'doppler-create-ci-token':
    await runDopplerCreateCiToken();
    break;
  case 'migrate-to-doppler':
    await runMigrateToDoppler(args);
    break;
  default:
    console.error(`Usage:
  node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com" [--clerk-pk=... --clerk-sk=...]
  node scripts/setup.mjs convex-setup --project-name="My App" [--team=SLUG]
  node scripts/setup.mjs configure --clerk-sk=... --admin-email="me@example.com"
  node scripts/setup.mjs detect-port
  node scripts/setup.mjs write-install-summary [--claim-url=...] [--accountless=true] [--completed-steps=...] [--manual-steps=...]
  node scripts/setup.mjs doppler-bootstrap                        (Doppler mode opt-in: install CLI, login, create project, pin repo to dev)
  node scripts/setup.mjs doppler-sync-env-local                   (push .env.local values to Doppler dev)
  node scripts/setup.mjs doppler-create-ci-token                  (create CI service token and push to GitHub via gh)
  node scripts/setup.mjs migrate-to-doppler --phase=inventory     (read .env.local + Convex + Vercel; writes inventory JSON)
  node scripts/setup.mjs migrate-to-doppler --phase=migrate       (push inventory values to Doppler dev / prd)
  node scripts/setup.mjs migrate-to-doppler --phase=cleanup --yes (remove migrated keys from .env.local, Convex, Vercel)`);
    process.exit(1);
}
