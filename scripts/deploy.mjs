#!/usr/bin/env node

/**
 * Automated Production Deployment Script for Secure Vibe Coding OS
 *
 * Subcommands:
 *   check-tools           - Check prerequisites (Node, git, gh, vercel)
 *   github-setup          - Create private GitHub repo, reconfigure remotes
 *   convex-deploy-key     - Generate Convex production deploy key via Management API
 *   validate-keys         - Validate Clerk keys (dev or prod), create JWT template
 *   convex-deploy-functions - Deploy Convex functions to production
 *   prod-webhook          - Create production webhook via Svix
 *   convex-prod-env       - Set Convex production environment variables
 *   vercel-env-dev        - Set Vercel env vars from .env.local (for /deploy-to-dev)
 *   vercel-env            - Set Vercel production environment variables
 *   vercel-deploy         - Trigger production deployment
 *   write-summary         - Write deployment summary to docs/DEPLOYMENT.md
 *   update-vercel-clerk-keys - Update only Clerk-related Vercel env vars
 *
 * All input comes from CLI arguments (no interactive prompts).
 * Designed to be called by the /deploy-to-dev and /deploy-to-prod Claude Code commands.
 *
 * Usage:
 *   node scripts/deploy.mjs check-tools
 *   node scripts/deploy.mjs github-setup --repo-name="my-project"
 *   node scripts/deploy.mjs convex-deploy-key
 *   node scripts/deploy.mjs validate-keys --clerk-pk=pk_live_... --clerk-sk=sk_live_... [--deploy-key=prod:...|...]
 *   node scripts/deploy.mjs convex-deploy-functions --deploy-key=prod:...|...
 *   node scripts/deploy.mjs prod-webhook --clerk-sk=sk_live_... --convex-site-url=https://xxx.convex.site --admin-email=admin@example.com
 *   node scripts/deploy.mjs convex-prod-env --deploy-key=prod:...|... --webhook-secret=whsec_... --frontend-api-url=https://... --admin-email=admin@example.com
 *   node scripts/deploy.mjs vercel-env --clerk-pk=... --clerk-sk=... --deploy-key=... --frontend-api-url=... --site-name=... [--convex-url=...]
 *   node scripts/deploy.mjs vercel-deploy
 */

import { createClerkClient } from '@clerk/backend';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env.local');

// Template repo identifiers used to detect upstream origin
const TEMPLATE_REPOS = [
  'harperaa/secure-vibe-coding-OS',
  'harperaa/secure-vibe-coding-os',
];

// ---------------------------------------------------------------------------
// Argument Parsing (same pattern as setup.mjs)
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
// .env.local Helpers (same pattern as setup.mjs)
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

// ---------------------------------------------------------------------------
// Shell Helpers
// ---------------------------------------------------------------------------

function tryExec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
      ...options,
    }).trim();
  } catch (err) {
    return null;
  }
}

function tryExecResult(cmd, options = {}) {
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
      ...options,
    }).trim();
    return { success: true, stdout };
  } catch (err) {
    return {
      success: false,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      exitCode: err.status,
    };
  }
}

// ---------------------------------------------------------------------------
// check-tools Subcommand
// ---------------------------------------------------------------------------

async function runCheckTools() {
  const platform = os.platform();
  const result = {
    os: platform,
    tools: {},
    installed: [],
    missing: [],
    gitRemote: null,
    isUpstreamTemplate: false,
    needsRepo: false,
  };

  // Node.js version
  const nodeVersion = tryExec('node -v');
  if (nodeVersion) {
    result.tools.node = nodeVersion.replace('v', '');
  }

  // Git version
  const gitVersion = tryExec('git --version');
  if (gitVersion) {
    const match = gitVersion.match(/(\d+\.\d+\.\d+)/);
    result.tools.git = match ? match[1] : gitVersion;
  } else {
    result.missing.push('git');
  }

  // gh CLI
  const ghVersion = tryExec('gh --version');
  if (ghVersion) {
    const match = ghVersion.match(/(\d+\.\d+\.\d+)/);
    result.tools.gh = match ? match[1] : ghVersion;

    // Check gh auth
    const ghAuth = tryExecResult('gh auth status');
    result.tools.ghAuth = ghAuth.success;
  } else {
    result.tools.gh = null;
    result.tools.ghAuth = false;
    result.missing.push('gh');
  }

  // Vercel CLI
  const vercelVersion = tryExec('npx vercel --version');
  if (vercelVersion) {
    const match = vercelVersion.match(/(\d+\.\d+\.\d+)/);
    result.tools.vercel = match ? match[1] : vercelVersion;
  } else {
    result.tools.vercel = null;
    result.missing.push('vercel');
  }

  // Git remote origin
  const remoteUrl = tryExec('git remote get-url origin');
  result.gitRemote = remoteUrl;

  if (remoteUrl) {
    result.isUpstreamTemplate = TEMPLATE_REPOS.some(
      repo => remoteUrl.toLowerCase().includes(repo.toLowerCase())
    );
  }

  result.needsRepo = result.isUpstreamTemplate || !remoteUrl;

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// github-setup Subcommand
// ---------------------------------------------------------------------------

async function runGithubSetup(args) {
  const repoName = args['repo-name'];

  if (!repoName) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required argument: --repo-name',
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    repoUrl: null,
    remoteUrl: null,
    upstreamPreserved: false,
  };

  // Check gh is installed
  const ghVersion = tryExec('gh --version');
  if (!ghVersion) {
    console.log(JSON.stringify({
      success: false,
      error: 'gh_not_installed',
      installHint: os.platform() === 'darwin' ? 'brew install gh' : 'See https://cli.github.com/manual/installation',
    }));
    return;
  }

  // Check gh auth
  const ghAuth = tryExecResult('gh auth status');
  if (!ghAuth.success) {
    console.log(JSON.stringify({
      success: false,
      error: 'gh_not_authenticated',
      hint: 'Run: gh auth login',
    }));
    return;
  }

  // Check if origin points to template — rename to upstream
  const currentOrigin = tryExec('git remote get-url origin');
  if (currentOrigin) {
    const isTemplate = TEMPLATE_REPOS.some(
      repo => currentOrigin.toLowerCase().includes(repo.toLowerCase())
    );

    if (isTemplate) {
      // Check if upstream already exists
      const existingUpstream = tryExec('git remote get-url upstream');
      if (!existingUpstream) {
        tryExec('git remote rename origin upstream');
        result.upstreamPreserved = true;
        result.steps.push('Renamed template origin to upstream');
      } else {
        // upstream already exists, just remove origin
        tryExec('git remote remove origin');
        result.upstreamPreserved = true;
        result.steps.push('Removed template origin (upstream already exists)');
      }
    } else {
      // Origin exists but isn't template — user may already have their own repo
      console.log(JSON.stringify({
        success: false,
        error: 'origin_exists',
        currentOrigin,
        hint: 'Origin remote already points to a non-template repo. Remove it first if you want to create a new one.',
      }));
      return;
    }
  }

  // Create private repo via gh CLI
  const createResult = tryExecResult(
    `gh repo create "${repoName}" --private --source=. --remote=origin --push`,
    { timeout: 60000 }
  );

  if (!createResult.success) {
    const errorOutput = createResult.stderr || createResult.stdout || '';
    let error = 'repo_create_failed';
    if (errorOutput.includes('already exists')) {
      error = 'repo_exists';
    }
    console.log(JSON.stringify({
      success: false,
      error,
      detail: errorOutput.substring(0, 500),
    }));
    return;
  }

  result.steps.push('Created private GitHub repository');

  // Get the new remote URL
  const newOrigin = tryExec('git remote get-url origin');
  result.remoteUrl = newOrigin;

  // Derive repo URL from remote
  if (newOrigin) {
    result.repoUrl = newOrigin
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/');
  }

  result.steps.push(`New origin: ${newOrigin}`);
  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// convex-deploy-key Subcommand
// ---------------------------------------------------------------------------

async function runConvexDeployKey() {
  const result = {
    success: false,
    steps: [],
  };

  // Step 1: Read auth token from ~/.convex/config.json
  const convexConfigPath = path.join(os.homedir(), '.convex', 'config.json');
  if (!fs.existsSync(convexConfigPath)) {
    console.log(JSON.stringify({
      success: false,
      error: 'not_logged_in',
      hint: 'Run: npx convex dev to log in first',
    }));
    return;
  }

  let convexConfig;
  try {
    convexConfig = JSON.parse(fs.readFileSync(convexConfigPath, 'utf-8'));
  } catch {
    console.log(JSON.stringify({
      success: false,
      error: 'config_parse_error',
      hint: 'Could not parse ~/.convex/config.json. Try running: npx convex dev',
    }));
    return;
  }

  const accessToken = convexConfig.accessToken;
  if (!accessToken) {
    console.log(JSON.stringify({
      success: false,
      error: 'not_logged_in',
      hint: 'No access token found. Run: npx convex dev to log in',
    }));
    return;
  }

  result.steps.push('Read Convex access token from config');

  // Step 2: Read dev deployment name from .env.local
  const envContent = readEnvFile(ENV_FILE);
  const devDeployment = getEnvValue(envContent, 'CONVEX_DEPLOYMENT');

  if (!devDeployment || devDeployment.includes('your_') || devDeployment === '') {
    console.log(JSON.stringify({
      success: false,
      error: 'no_dev_deployment',
      hint: 'CONVEX_DEPLOYMENT not found in .env.local. Run: npx convex dev first',
    }));
    return;
  }

  // Strip prefix (e.g., "dev:" prefix)
  const devName = devDeployment.replace(/^dev:/, '');
  result.steps.push(`Found dev deployment: ${devName}`);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Convex-Client': 'deploy-script',
    'Content-Type': 'application/json',
  };

  // Step 3: Get deployment info to find project ID
  let projectId;
  try {
    const deployResp = await fetch(`https://api.convex.dev/api/deployments/${devName}`, {
      headers,
    });

    if (!deployResp.ok) {
      if (deployResp.status === 401 || deployResp.status === 403) {
        console.log(JSON.stringify({
          success: false,
          error: 'auth_expired',
          hint: 'Convex auth token expired. Run: npx convex dev to refresh',
        }));
        return;
      }
      throw new Error(`API returned ${deployResp.status}: ${await deployResp.text()}`);
    }

    const deployInfo = await deployResp.json();
    projectId = deployInfo.projectId;
    result.steps.push(`Found project ID: ${projectId}`);
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: 'api_error',
      detail: err.message,
      hint: 'Could not get deployment info from Convex API',
    }));
    return;
  }

  // Step 4: List deployments to find the production one
  let prodDeploymentName;
  try {
    const listResp = await fetch(`https://api.convex.dev/api/projects/${projectId}/deployments`, {
      headers,
    });

    if (!listResp.ok) {
      throw new Error(`API returned ${listResp.status}: ${await listResp.text()}`);
    }

    const deployments = await listResp.json();
    const prodDeployment = (deployments || []).find(
      d => d.deploymentType === 'prod'
    );

    if (!prodDeployment) {
      console.log(JSON.stringify({
        success: false,
        error: 'no_prod_deployment',
        hint: 'No production deployment found. Create one in Convex Dashboard → Settings → Deploy Keys',
      }));
      return;
    }

    prodDeploymentName = prodDeployment.name;
    result.steps.push(`Found production deployment: ${prodDeploymentName}`);
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: 'api_error',
      detail: err.message,
      hint: 'Could not list deployments from Convex API',
    }));
    return;
  }

  // Step 5: Create deploy key for the production deployment
  try {
    const keyResp = await fetch(
      `https://api.convex.dev/api/deployments/${prodDeploymentName}/create_deploy_key`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Production - auto-generated' }),
      }
    );

    if (!keyResp.ok) {
      throw new Error(`API returned ${keyResp.status}: ${await keyResp.text()}`);
    }

    const keyData = await keyResp.json();
    const deployKey = keyData.key || keyData.deployKey;

    if (!deployKey) {
      throw new Error('No deploy key in API response');
    }

    result.success = true;
    result.deployKey = deployKey;
    result.prodDeploymentName = prodDeploymentName;
    result.steps.push('Generated production deploy key');
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: 'key_creation_failed',
      detail: err.message,
      hint: 'Could not create deploy key. Try generating one manually in Convex Dashboard → Settings → Deploy Keys',
    }));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// validate-keys Subcommand
// ---------------------------------------------------------------------------

async function runValidateKeys(args) {
  const clerkPk = args['clerk-pk'];
  const clerkSk = args['clerk-sk'];
  const deployKey = args['deploy-key'];

  if (!clerkPk || !clerkSk) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --clerk-pk and --clerk-sk',
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    frontendApiUrl: null,
    jwtTemplateCreated: false,
  };

  // Validate key prefixes (accept both dev and prod keys)
  const requireProd = args['require-prod'] === 'true';
  const validPkPrefixes = requireProd ? ['pk_live_'] : ['pk_test_', 'pk_live_'];
  const validSkPrefixes = requireProd ? ['sk_live_'] : ['sk_test_', 'sk_live_'];

  if (!validPkPrefixes.some(p => clerkPk.startsWith(p))) {
    console.log(JSON.stringify({
      success: false,
      error: 'invalid_pk',
      hint: requireProd
        ? 'Publishable key must start with pk_live_ for production'
        : 'Publishable key must start with pk_test_ or pk_live_',
    }));
    return;
  }

  if (!validSkPrefixes.some(p => clerkSk.startsWith(p))) {
    console.log(JSON.stringify({
      success: false,
      error: 'invalid_sk',
      hint: requireProd
        ? 'Secret key must start with sk_live_ for production'
        : 'Secret key must start with sk_test_ or sk_live_',
    }));
    return;
  }

  const keyType = clerkPk.startsWith('pk_live_') ? 'production' : 'development';
  result.keyType = keyType;
  result.steps.push(`Key prefixes validated (${keyType} keys)`);

  // Validate deploy key format if provided
  if (deployKey) {
    if (!deployKey.startsWith('prod:') || !deployKey.includes('|')) {
      console.log(JSON.stringify({
        success: false,
        error: 'invalid_deploy_key',
        hint: 'Deploy key must start with prod: and contain | separator',
      }));
      return;
    }
    result.steps.push('Deploy key format validated');
  }

  // Test Clerk API with production keys
  const clerk = createClerkClient({ secretKey: clerkSk });
  try {
    await clerk.users.getCount();
    result.steps.push('Clerk production API connection verified');
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: 'clerk_api_failed',
      detail: err.message,
      hint: 'Could not connect to Clerk with production keys. Verify the keys are correct.',
    }));
    return;
  }

  // Derive frontend API URL from pk_live_ (same pattern as setup.mjs)
  try {
    const pkParts = clerkPk.split('_');
    const encoded = pkParts[pkParts.length - 1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const cleanDomain = decoded.replace(/\$$/, '');
    if (cleanDomain.includes('.clerk.accounts.') || cleanDomain.includes('.clerk.')) {
      result.frontendApiUrl = `https://${cleanDomain}`;
    } else {
      result.frontendApiUrl = `https://${cleanDomain}.clerk.accounts.dev`;
    }
    result.steps.push(`Derived frontend API URL: ${result.frontendApiUrl}`);
  } catch (err) {
    result.steps.push(`Warning: Could not derive frontend API URL: ${err.message}`);
  }

  // Create JWT template "convex" on production instance (idempotent)
  try {
    const existingTemplates = await clerk.jwtTemplates.list();
    const convexTemplate = existingTemplates.data?.find(
      t => t.name?.toLowerCase() === 'convex'
    );

    if (convexTemplate) {
      result.steps.push('JWT template "convex" already exists on production');
      result.jwtTemplateCreated = false;
    } else {
      await clerk.jwtTemplates.create({
        name: 'convex',
        claims: { aud: 'convex' },
        lifetime: 60,
      });
      result.jwtTemplateCreated = true;
      result.steps.push('Created JWT template "convex" on production');
    }
  } catch (err) {
    result.steps.push(`Warning: JWT template creation failed: ${err.message}`);
    result.jwtTemplateCreated = false;
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// convex-deploy-functions Subcommand
// ---------------------------------------------------------------------------

async function runConvexDeployFunctions(args) {
  const deployKey = args['deploy-key'];

  if (!deployKey) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required argument: --deploy-key',
    }));
    process.exit(1);
  }

  const result = {
    success: false,
    steps: [],
  };

  try {
    const output = execSync('npx convex deploy', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000,
      env: {
        ...process.env,
        CONVEX_DEPLOY_KEY: deployKey,
      },
    });

    result.success = true;
    result.steps.push('Convex functions deployed to production');

    // Try to extract production URL from output or derive from deploy key
    const deploymentName = deployKey.split('|')[0].replace('prod:', '');
    result.prodUrl = `https://${deploymentName}.convex.cloud`;
    result.prodSiteUrl = `https://${deploymentName}.convex.site`;
    result.steps.push(`Production URL: ${result.prodUrl}`);
    result.steps.push(`HTTP Actions URL: ${result.prodSiteUrl}`);

    if (output) {
      const lines = output.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        result.steps.push(`CLI output: ${lines.slice(-3).join(' | ')}`);
      }
    }
  } catch (err) {
    const errOutput = ((err.stdout || '') + (err.stderr || '')).trim();
    console.log(JSON.stringify({
      success: false,
      error: 'deploy_failed',
      detail: errOutput.substring(0, 1000),
      hint: 'Convex deploy failed. Check that the deploy key is valid.',
    }));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// prod-webhook Subcommand
// ---------------------------------------------------------------------------

async function runProdWebhook(args) {
  const clerkSk = args['clerk-sk'];
  const convexSiteUrl = args['convex-site-url'];
  const adminEmail = args['admin-email'];

  if (!clerkSk || !convexSiteUrl) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --clerk-sk and --convex-site-url',
    }));
    process.exit(1);
  }

  const result = {
    success: false,
    steps: [],
    webhookSecret: null,
    endpointUrl: null,
  };

  const webhookEndpointUrl = `${convexSiteUrl}/clerk-users-webhook`;
  result.endpointUrl = webhookEndpointUrl;

  const clerk = createClerkClient({ secretKey: clerkSk });

  try {
    // Ensure Svix app exists
    try {
      await clerk.webhooks.createSvixApp();
      result.steps.push('Created Svix app for Clerk production webhooks');
    } catch {
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

    // Exchange one-time token for Svix API token
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

    // Create Svix client
    const { Svix } = await import('svix');
    const svix = new Svix(svixToken, { serverUrl: svixBaseUrl });

    // Check for existing endpoint with same URL (idempotent)
    const existing = await svix.endpoint.list(appId);
    const existingEp = existing.data?.find(ep => ep.url === webhookEndpointUrl);

    let endpointId;
    if (existingEp) {
      endpointId = existingEp.id;
      result.steps.push('Production webhook endpoint already exists, reusing');
    } else {
      const endpoint = await svix.endpoint.create(appId, {
        url: webhookEndpointUrl,
        description: 'Convex clerk-users-webhook (production)',
        filterTypes: [
          'user.created',
          'user.updated',
          'user.deleted',
          'paymentAttempt.updated',
        ],
      });
      endpointId = endpoint.id;
      result.steps.push('Created production webhook endpoint via Svix');
    }

    // Get the webhook signing secret
    const secret = await svix.endpoint.getSecret(appId, endpointId);
    result.webhookSecret = secret.key;
    result.success = true;
    result.steps.push(`Retrieved webhook signing secret: ${result.webhookSecret.substring(0, 10)}...`);
  } catch (err) {
    result.steps.push(`Webhook creation failed: ${err.message}`);
    result.manualSteps = [
      'Create webhook manually in Clerk Dashboard (Production):',
      `  1. Go to Clerk Dashboard → Configure → Webhooks → Add Endpoint`,
      `  2. Endpoint URL: ${webhookEndpointUrl}`,
      `  3. Subscribe to events: user.created, user.updated, user.deleted, paymentAttempt.updated`,
      `  4. Click Create, copy the Signing Secret (whsec_...)`,
    ];
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// convex-prod-env Subcommand
// ---------------------------------------------------------------------------

async function runConvexProdEnv(args) {
  const deployKey = args['deploy-key'];
  const webhookSecret = args['webhook-secret'];
  const frontendApiUrl = args['frontend-api-url'];
  const adminEmail = args['admin-email'];

  if (!deployKey) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required argument: --deploy-key',
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    varsSet: [],
  };

  const envVars = {};
  if (webhookSecret) envVars['CLERK_WEBHOOK_SECRET'] = webhookSecret;
  if (frontendApiUrl) envVars['NEXT_PUBLIC_CLERK_FRONTEND_API_URL'] = frontendApiUrl;
  if (adminEmail) envVars['ADMIN_EMAIL'] = adminEmail;

  for (const [key, value] of Object.entries(envVars)) {
    try {
      execSync(`npx convex env set ${key} "${value}"`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 30000,
        env: {
          ...process.env,
          CONVEX_DEPLOY_KEY: deployKey,
        },
      });
      result.varsSet.push(key);
      result.steps.push(`Set Convex production env var: ${key}`);
    } catch (err) {
      result.steps.push(`Failed to set ${key}: ${err.message}`);
      result.success = false;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// vercel-env-dev Subcommand (reads everything from .env.local, no args needed)
// ---------------------------------------------------------------------------

async function runVercelEnvDev() {
  const result = {
    success: true,
    steps: [],
    varsSet: [],
  };

  const envContent = readEnvFile(ENV_FILE);

  // Keys to read from .env.local and set on Vercel
  const keysToRead = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_FRONTEND_API_URL',
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_SITE_NAME',
    'CSRF_SECRET',
    'SESSION_SECRET',
    'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL',
    'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
  ];

  // Optional keys
  const optionalKeys = ['GEMINI_API_KEY'];

  const envVars = {};

  for (const key of keysToRead) {
    const val = getEnvValue(envContent, key);
    if (val && val.trim() && !val.includes('your_') && !val.includes('<')) {
      envVars[key] = val;
    } else {
      result.steps.push(`Warning: ${key} not found or is a placeholder in .env.local`);
    }
  }

  for (const key of optionalKeys) {
    const val = getEnvValue(envContent, key);
    if (val && val.trim()) {
      envVars[key] = val;
    }
  }

  if (Object.keys(envVars).length === 0) {
    console.log(JSON.stringify({
      success: false,
      error: 'no_env_vars',
      hint: 'No valid environment variables found in .env.local. Run /install first.',
    }));
    return;
  }

  for (const [key, value] of Object.entries(envVars)) {
    try {
      execSync(`printf '%s' "${value.replace(/"/g, '\\"')}" | npx vercel env add ${key} production --force`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 30000,
      });
      result.varsSet.push(key);
      result.steps.push(`Set Vercel env var: ${key}`);
    } catch (err) {
      const errMsg = ((err.stderr || '') + (err.stdout || '')).trim();
      result.steps.push(`Failed to set ${key}: ${errMsg.substring(0, 200)}`);
      result.success = false;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// vercel-env Subcommand
// ---------------------------------------------------------------------------

async function runVercelEnv(args) {
  const clerkPk = args['clerk-pk'];
  const clerkSk = args['clerk-sk'];
  const deployKey = args['deploy-key'];
  const frontendApiUrl = args['frontend-api-url'];
  const siteName = args['site-name'];

  const convexUrl = args['convex-url'];

  if (!clerkPk || !clerkSk || !deployKey || !frontendApiUrl || !siteName) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --clerk-pk, --clerk-sk, --deploy-key, --frontend-api-url, --site-name',
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    varsSet: [],
  };

  // Read secrets from .env.local (reuse existing ones)
  const envContent = readEnvFile(ENV_FILE);
  const csrfSecret = getEnvValue(envContent, 'CSRF_SECRET') || crypto.randomBytes(32).toString('base64url');
  const sessionSecret = getEnvValue(envContent, 'SESSION_SECRET') || crypto.randomBytes(32).toString('base64url');

  // Build the env vars map
  const envVars = {
    'CONVEX_DEPLOY_KEY': deployKey,
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': clerkPk,
    'CLERK_SECRET_KEY': clerkSk,
    'NEXT_PUBLIC_CLERK_FRONTEND_API_URL': frontendApiUrl,
    'NEXT_PUBLIC_SITE_NAME': siteName,
    'CSRF_SECRET': csrfSecret,
    'SESSION_SECRET': sessionSecret,
    'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL': '/dashboard',
    'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL': '/dashboard',
  };

  // NEXT_PUBLIC_CONVEX_URL is needed at runtime for server-side code
  // (middleware, rate limiting, CSRF validation use ConvexHttpClient)
  if (convexUrl) {
    envVars['NEXT_PUBLIC_CONVEX_URL'] = convexUrl;
  }

  // Optional: GEMINI_API_KEY if present
  const geminiKey = getEnvValue(envContent, 'GEMINI_API_KEY');
  if (geminiKey && geminiKey.trim()) {
    envVars['GEMINI_API_KEY'] = geminiKey;
  }

  // Optional: Google OAuth credentials if provided
  if (args['google-client-id']) {
    envVars['GOOGLE_CLIENT_ID'] = args['google-client-id'];
  }
  if (args['google-client-secret']) {
    envVars['GOOGLE_CLIENT_SECRET'] = args['google-client-secret'];
  }

  for (const [key, value] of Object.entries(envVars)) {
    try {
      // Use printf to avoid issues with special characters in values
      execSync(`printf '%s' "${value.replace(/"/g, '\\"')}" | npx vercel env add ${key} production --force`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 30000,
      });
      result.varsSet.push(key);
      result.steps.push(`Set Vercel env var: ${key}`);
    } catch (err) {
      const errMsg = ((err.stderr || '') + (err.stdout || '')).trim();
      result.steps.push(`Failed to set ${key}: ${errMsg.substring(0, 200)}`);
      result.success = false;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// vercel-deploy Subcommand
// ---------------------------------------------------------------------------

async function runVercelDeploy() {
  const result = {
    success: false,
    steps: [],
  };

  try {
    const output = execSync('npx vercel deploy --prod', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300000, // 5 min timeout for production build
    });

    result.success = true;
    result.steps.push('Production deployment triggered');

    // Extract deployment URL from output (usually the last non-empty line)
    const lines = output.split('\n').filter(l => l.trim());
    const urlLine = lines.find(l => l.includes('https://'));
    if (urlLine) {
      const urlMatch = urlLine.match(/(https:\/\/[^\s]+)/);
      if (urlMatch) {
        result.url = urlMatch[1];
        result.steps.push(`Deployment URL: ${result.url}`);
      }
    }

    if (!result.url && lines.length > 0) {
      result.steps.push(`CLI output: ${lines.slice(-3).join(' | ')}`);
    }
  } catch (err) {
    const errOutput = ((err.stdout || '') + (err.stderr || '')).trim();
    console.log(JSON.stringify({
      success: false,
      error: 'deploy_failed',
      detail: errOutput.substring(0, 1000),
      hint: 'Vercel deployment failed. Check the error above and try again.',
    }));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// write-summary Subcommand
// ---------------------------------------------------------------------------

async function runWriteSummary(args) {
  const vercelUrl = args['vercel-url'] || '(not yet deployed)';
  const repoUrl = args['repo-url'] || '(not configured)';
  const convexProdUrl = args['convex-prod-url'] || '(not configured)';
  const convexSiteUrl = args['convex-site-url'] || '(not configured)';
  const frontendApiUrl = args['frontend-api-url'] || '(not configured)';
  const siteName = args['site-name'] || '(not set)';
  const adminEmail = args['admin-email'] || '(not set)';
  const googleOAuth = args['google-oauth'] || 'skipped';
  const webhookUrl = args['webhook-url'] || '(not configured)';

  // Build lists from comma-separated args
  const completedSteps = (args['completed-steps'] || '').split(',').filter(Boolean);
  const skippedSteps = (args['skipped-steps'] || '').split(',').filter(Boolean);
  const vercelVars = (args['vercel-vars'] || '').split(',').filter(Boolean);
  const convexVars = (args['convex-vars'] || '').split(',').filter(Boolean);

  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const lines = [
    `# Production Deployment Summary`,
    ``,
    `**Deployed:** ${timestamp}`,
    `**Site:** ${siteName}`,
    `**Admin:** ${adminEmail}`,
    ``,
    `## Production URLs`,
    ``,
    `| Service | URL |`,
    `|---------|-----|`,
    `| App | ${vercelUrl} |`,
    `| GitHub Repo | ${repoUrl} |`,
    `| Convex Cloud | ${convexProdUrl} |`,
    `| Convex HTTP Actions | ${convexSiteUrl} |`,
    `| Clerk Frontend API | ${frontendApiUrl} |`,
    `| Convex Dashboard | https://dashboard.convex.dev |`,
    `| Clerk Dashboard | https://dashboard.clerk.com |`,
    ``,
    `## Completed Steps`,
    ``,
  ];

  for (const step of completedSteps) {
    lines.push(`- [x] ${step}`);
  }

  if (skippedSteps.length > 0) {
    lines.push(``);
    lines.push(`## Skipped / Deferred`);
    lines.push(``);
    for (const step of skippedSteps) {
      lines.push(`- [ ] ${step}`);
    }
  }

  lines.push(``);
  lines.push(`## Environment Variables Set`);
  lines.push(``);

  if (convexVars.length > 0) {
    lines.push(`**Convex Production:**`);
    for (const v of convexVars) {
      lines.push(`- \`${v}\``);
    }
    lines.push(``);
  }

  if (vercelVars.length > 0) {
    lines.push(`**Vercel Production:**`);
    for (const v of vercelVars) {
      lines.push(`- \`${v}\``);
    }
    lines.push(``);
  }

  lines.push(`## Webhook`);
  lines.push(``);
  lines.push(`- Endpoint: \`${webhookUrl}\``);
  lines.push(`- Events: user.created, user.updated, user.deleted, paymentAttempt.updated`);
  lines.push(``);

  lines.push(`## Ongoing Deployments`);
  lines.push(``);
  lines.push(`Future deployments happen automatically when you push to main:`);
  lines.push(`\`\`\`bash`);
  lines.push(`git push origin main`);
  lines.push(`\`\`\``);
  lines.push(`Vercel auto-deploys on push, including Convex function updates (via \`vercel.json\` buildCommand).`);
  lines.push(``);

  if (googleOAuth === 'deferred' || googleOAuth === 'skipped') {
    lines.push(`## Upgrade to Production Clerk`);
    lines.push(``);
    lines.push(`When you have a custom domain and are ready to remove the Clerk dev badge, run:`);
    lines.push(`\`\`\`bash`);
    lines.push(`/deploy-to-prod`);
    lines.push(`\`\`\``);
    lines.push(``);
    lines.push(`This will walk you through:`);
    lines.push(`- Creating a Clerk production instance (requires a custom domain you own)`);
    lines.push(`- Swapping to production Clerk keys (pk_live_/sk_live_)`);
    lines.push(`- Setting up Google OAuth with your own credentials`);
    lines.push(`- Configuring Stripe billing via Clerk`);
    lines.push(``);
  }

  lines.push(`## Optional Next Steps`);
  lines.push(``);
  lines.push(`1. **Custom Domain**: Vercel Dashboard → Settings → Domains → Add your domain`);

  if (googleOAuth !== 'deferred' && googleOAuth !== 'skipped') {
    lines.push(`2. **Enable Billing**: Clerk Dashboard (Production) → Billing → Connect Stripe`);
    lines.push(`3. **Create Subscription Plan**: Clerk Dashboard (Production) → Billing → Plans → Create`);
    lines.push(`4. **Go Live with Payments**: Toggle from Test Mode to Live Mode in Clerk Billing`);
  }
  lines.push(``);

  lines.push(`## Verify Your Deployment`);
  lines.push(``);
  lines.push(`1. Visit your production URL: ${vercelUrl}`);
  lines.push(`2. Create a test account`);
  lines.push(`3. Check Convex Dashboard → Production → Data → users table`);
  lines.push(`4. User should appear (confirms webhook is working)`);
  lines.push(``);

  const content = lines.join('\n');
  const docsDir = path.join(ROOT_DIR, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const summaryPath = path.join(docsDir, 'DEPLOYMENT.md');
  fs.writeFileSync(summaryPath, content, 'utf-8');

  console.log(JSON.stringify({
    success: true,
    path: 'docs/DEPLOYMENT.md',
    absolutePath: summaryPath,
  }));
}

// ---------------------------------------------------------------------------
// update-vercel-clerk-keys Subcommand
// ---------------------------------------------------------------------------

async function runUpdateVercelClerkKeys(args) {
  const clerkPk = args['clerk-pk'];
  const clerkSk = args['clerk-sk'];
  const frontendApiUrl = args['frontend-api-url'];

  if (!clerkPk || !clerkSk || !frontendApiUrl) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments: --clerk-pk, --clerk-sk, --frontend-api-url',
    }));
    process.exit(1);
  }

  const result = {
    success: true,
    steps: [],
    varsSet: [],
  };

  const envVars = {
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': clerkPk,
    'CLERK_SECRET_KEY': clerkSk,
    'NEXT_PUBLIC_CLERK_FRONTEND_API_URL': frontendApiUrl,
  };

  for (const [key, value] of Object.entries(envVars)) {
    try {
      execSync(`printf '%s' "${value.replace(/"/g, '\\"')}" | npx vercel env add ${key} production --force`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 30000,
      });
      result.varsSet.push(key);
      result.steps.push(`Updated Vercel env var: ${key}`);
    } catch (err) {
      const errMsg = ((err.stderr || '') + (err.stdout || '')).trim();
      result.steps.push(`Failed to update ${key}: ${errMsg.substring(0, 200)}`);
      result.success = false;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);
const command = args._cmd;

switch (command) {
  case 'check-tools':
    await runCheckTools();
    break;
  case 'github-setup':
    await runGithubSetup(args);
    break;
  case 'convex-deploy-key':
    await runConvexDeployKey();
    break;
  case 'validate-keys':
    await runValidateKeys(args);
    break;
  case 'convex-deploy-functions':
    await runConvexDeployFunctions(args);
    break;
  case 'prod-webhook':
    await runProdWebhook(args);
    break;
  case 'convex-prod-env':
    await runConvexProdEnv(args);
    break;
  case 'vercel-env-dev':
    await runVercelEnvDev();
    break;
  case 'vercel-env':
    await runVercelEnv(args);
    break;
  case 'vercel-deploy':
    await runVercelDeploy();
    break;
  case 'write-summary':
    await runWriteSummary(args);
    break;
  case 'update-vercel-clerk-keys':
    await runUpdateVercelClerkKeys(args);
    break;
  default:
    console.error(`Usage:
  node scripts/deploy.mjs check-tools
  node scripts/deploy.mjs github-setup --repo-name="my-project"
  node scripts/deploy.mjs convex-deploy-key
  node scripts/deploy.mjs validate-keys --clerk-pk=... --clerk-sk=... [--deploy-key=prod:...|...] [--require-prod=true]
  node scripts/deploy.mjs convex-deploy-functions --deploy-key=prod:...|...
  node scripts/deploy.mjs prod-webhook --clerk-sk=... --convex-site-url=https://xxx.convex.site [--admin-email=admin@example.com]
  node scripts/deploy.mjs convex-prod-env --deploy-key=prod:...|... --webhook-secret=whsec_... --frontend-api-url=https://... --admin-email=admin@example.com
  node scripts/deploy.mjs vercel-env-dev                          (reads all from .env.local)
  node scripts/deploy.mjs vercel-env --clerk-pk=... --clerk-sk=... --deploy-key=... --frontend-api-url=... --site-name=... [--convex-url=...]
  node scripts/deploy.mjs vercel-deploy
  node scripts/deploy.mjs write-summary --vercel-url=... --repo-url=... [--completed-steps=...] [--skipped-steps=...]
  node scripts/deploy.mjs update-vercel-clerk-keys --clerk-pk=pk_live_... --clerk-sk=sk_live_... --frontend-api-url=https://...`);
    process.exit(1);
}
