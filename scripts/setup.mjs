#!/usr/bin/env node

/**
 * Automated Setup Script for Secure Vibe Coding OS
 *
 * Subcommands:
 *   init         - Create Clerk app, generate secrets, write .env.local
 *   convex-setup - Login check, team selection, project creation (non-interactive)
 *   configure    - Set up webhook + Convex env vars (run after Convex setup)
 *
 * All input comes from CLI arguments (no interactive prompts).
 * Designed to be called by the /install Claude Code command.
 *
 * Usage:
 *   node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com"
 *   node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com" --clerk-pk=pk_test_... --clerk-sk=sk_test_...
 *   node scripts/setup.mjs convex-setup --project-name="My App" [--team=team-slug]
 *   node scripts/setup.mjs configure --clerk-sk=sk_test_... --admin-email="me@example.com"
 */

import { createClerkClient } from '@clerk/backend';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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

  const result = {
    success: true,
    steps: [],
    claimUrl: null,
    apiKeysUrl: null,
    envVarsSet: [],
    nextSteps: [],
  };

  // Step 1: Ensure .env.local exists
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

  // Step 2: Generate CSRF and Session secrets
  const envContent = readEnvFile(ENV_FILE);
  const existingCsrf = getEnvValue(envContent, 'CSRF_SECRET');
  const existingSession = getEnvValue(envContent, 'SESSION_SECRET');

  const csrfSecret = (existingCsrf && !existingCsrf.includes('<'))
    ? existingCsrf : generateSecret();
  const sessionSecret = (existingSession && !existingSession.includes('<'))
    ? existingSession : generateSecret();

  writeEnvVar(ENV_FILE, 'CSRF_SECRET', csrfSecret);
  writeEnvVar(ENV_FILE, 'SESSION_SECRET', sessionSecret);
  result.steps.push('Generated CSRF_SECRET and SESSION_SECRET');
  result.envVarsSet.push('CSRF_SECRET', 'SESSION_SECRET');

  // Step 3: Site name
  writeEnvVar(ENV_FILE, 'NEXT_PUBLIC_SITE_NAME', siteName);
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

  writeEnvVar(ENV_FILE, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', clerkPk);
  writeEnvVar(ENV_FILE, 'CLERK_SECRET_KEY', clerkSk);
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
    writeEnvVar(ENV_FILE, 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL', frontendApiUrl);
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
    writeEnvVar(ENV_FILE, key, value);
    result.envVarsSet.push(key);
  }
  result.steps.push('Set Clerk redirect URLs');

  // Build next steps
  if (accountless) {
    result.nextSteps.push(`Claim your Clerk app at: ${result.claimUrl}`);
  }
  result.nextSteps.push('Run: npx convex dev --once (to set up Convex project)');
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

  const result = {
    success: true,
    steps: [],
    convexEnvVarsSet: [],
    manualSteps: [],
  };

  // Step 1: Read Convex URL from .env.local
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

  // Step 3: Get Frontend API URL
  const frontendApiUrl = getEnvValue(envContent, 'NEXT_PUBLIC_CLERK_FRONTEND_API_URL');

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

  // Also set the local site URL
  const existingSiteUrl = getEnvValue(updatedEnv, 'NEXT_PUBLIC_SITE_URL');
  if (!existingSiteUrl || existingSiteUrl.includes('your_')) {
    writeEnvVar(ENV_FILE, 'NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    result.steps.push('Set NEXT_PUBLIC_SITE_URL=http://localhost:3000');
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
  default:
    console.error(`Usage:
  node scripts/setup.mjs init --site-name="My App" --admin-email="me@example.com" [--clerk-pk=... --clerk-sk=...]
  node scripts/setup.mjs convex-setup --project-name="My App" [--team=SLUG]
  node scripts/setup.mjs configure --clerk-sk=... --admin-email="me@example.com"
  node scripts/setup.mjs detect-port`);
    process.exit(1);
}
