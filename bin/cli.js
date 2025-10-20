#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_URL = 'https://github.com/harperaa/secure-claude-skills.git';
const INSTALL_PATH = '.claude/skills/security';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pathExists(filepath) {
  return fs.existsSync(filepath);
}

function createDirectory(dirpath) {
  if (!pathExists(dirpath)) {
    fs.mkdirSync(dirpath, { recursive: true });
    return true;
  }
  return false;
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!pathExists(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyInstall() {
  log('\n📋 Installing security skills (copy mode)...', 'cyan');

  // Create target directory
  createDirectory(INSTALL_PATH);

  // Copy skills from npm package root to target
  const packageRoot = path.join(__dirname, '..');

  // List of directories to exclude (non-skill directories)
  const excludeDirs = ['bin', 'examples', 'node_modules', '.git', '.github'];

  // Get all entries in package root
  const entries = fs.readdirSync(packageRoot);
  let skillCount = 0;

  // Copy only skill directories
  for (const entry of entries) {
    const fullPath = path.join(packageRoot, entry);
    const stats = fs.statSync(fullPath);

    // Skip if not a directory or if in exclude list
    if (!stats.isDirectory() || excludeDirs.includes(entry)) {
      continue;
    }

    // Copy skill directory
    const targetPath = path.join(INSTALL_PATH, entry);
    copyRecursive(fullPath, targetPath);
    skillCount++;
  }

  if (skillCount === 0) {
    log('❌ No skills found in package', 'red');
    process.exit(1);
  }

  log(`✅ Security skills installed to ${INSTALL_PATH}`, 'green');
  log(`   Installed ${skillCount} skills`, 'cyan');
  log('   This is a one-time copy. To get updates, re-run this command.', 'yellow');
}

function subtreeInstall() {
  log('\n🌳 Installing security skills (subtree mode)...', 'cyan');

  if (!checkGitRepo()) {
    log('❌ Not a git repository. Subtree requires git.', 'red');
    log('   Run: git init', 'yellow');
    process.exit(1);
  }

  // Check if path already exists
  if (pathExists(INSTALL_PATH)) {
    log(`⚠️  ${INSTALL_PATH} already exists`, 'yellow');
    log('   Remove it first or use --force to overwrite', 'yellow');
    process.exit(1);
  }

  // Create parent directory
  createDirectory('.claude/skills');

  try {
    log('   Adding subtree...', 'cyan');
    execSync(
      `git subtree add --prefix=${INSTALL_PATH} ${REPO_URL} main --squash`,
      { stdio: 'inherit' }
    );
    log('✅ Security skills installed with subtree', 'green');
    log('   To update: npx secure-claude-skills update', 'yellow');
  } catch (error) {
    log('❌ Subtree installation failed', 'red');
    log('   Make sure you have committed changes before running subtree add', 'yellow');
    process.exit(1);
  }
}

function submoduleInstall() {
  log('\n📦 Installing security skills (submodule mode)...', 'cyan');

  if (!checkGitRepo()) {
    log('❌ Not a git repository. Submodule requires git.', 'red');
    log('   Run: git init', 'yellow');
    process.exit(1);
  }

  // Check if path already exists
  if (pathExists(INSTALL_PATH)) {
    log(`⚠️  ${INSTALL_PATH} already exists`, 'yellow');
    log('   Remove it first or use --force to overwrite', 'yellow');
    process.exit(1);
  }

  // Create parent directory
  createDirectory('.claude/skills');

  try {
    log('   Adding submodule...', 'cyan');
    execSync(
      `git submodule add ${REPO_URL} ${INSTALL_PATH}`,
      { stdio: 'inherit' }
    );
    log('✅ Security skills installed as submodule', 'green');
    log('   To update: cd .claude/skills/security && git pull', 'yellow');
  } catch (error) {
    log('❌ Submodule installation failed', 'red');
    process.exit(1);
  }
}

function updateSkills() {
  log('\n🔄 Updating security skills...', 'cyan');

  if (!pathExists(INSTALL_PATH)) {
    log(`❌ Security skills not found at ${INSTALL_PATH}`, 'red');
    log('   Run: npx secure-claude-skills init', 'yellow');
    process.exit(1);
  }

  if (!checkGitRepo()) {
    log('⚠️  Not a git repository. Cannot determine sync method.', 'yellow');
    log('   Re-running copy install...', 'cyan');
    copyInstall();
    return;
  }

  // Check if it's a subtree
  try {
    execSync('git log --grep="git-subtree-dir: .claude/skills/security" --format=%H',
      { stdio: 'pipe' });

    log('   Detected subtree installation', 'cyan');
    log('   Pulling latest changes...', 'cyan');
    execSync(
      `git subtree pull --prefix=${INSTALL_PATH} ${REPO_URL} main --squash`,
      { stdio: 'inherit' }
    );
    log('✅ Security skills updated', 'green');
    return;
  } catch {
    // Not a subtree
  }

  // Check if it's a submodule
  if (pathExists('.gitmodules')) {
    const gitmodules = fs.readFileSync('.gitmodules', 'utf-8');
    if (gitmodules.includes(INSTALL_PATH)) {
      log('   Detected submodule installation', 'cyan');
      log('   Updating submodule...', 'cyan');
      execSync('git submodule update --remote .claude/skills/security', { stdio: 'inherit' });
      log('✅ Security skills updated', 'green');
      return;
    }
  }

  // Must be a copy installation
  log('   Detected copy installation', 'cyan');
  log('   Re-copying latest skills...', 'cyan');
  copyInstall();
}

function showHelp() {
  log('\n🔒 Secure Claude Skills - Installation Tool\n', 'bright');
  log('Defense-in-depth security skills for Claude Code projects', 'cyan');
  log('\nUsage:', 'bright');
  log('  npx secure-claude-skills init [options]     Install security skills');
  log('  npx secure-claude-skills update             Update installed skills');
  log('  npx secure-claude-skills --help             Show this help');
  log('\nOptions:', 'bright');
  log('  --sync <method>    Sync method: subtree, submodule (default: copy)');
  log('  --force            Overwrite existing installation');
  log('\nExamples:', 'bright');
  log('  npx secure-claude-skills init                      # Copy mode (no sync)');
  log('  npx secure-claude-skills init --sync subtree       # Subtree (with updates)');
  log('  npx secure-claude-skills init --sync submodule     # Submodule (versioned)');
  log('  npx secure-claude-skills update                    # Pull latest updates');
  log('\nInstallation Path:', 'bright');
  log(`  ${INSTALL_PATH}`, 'cyan');
  log('\n📖 Documentation: https://github.com/harperaa/secure-claude-skills\n');
}

function checkConflicts() {
  if (pathExists(INSTALL_PATH)) {
    log(`\n⚠️  Security skills already installed at ${INSTALL_PATH}`, 'yellow');
    log('   Options:', 'yellow');
    log('   1. Use --force to overwrite', 'yellow');
    log('   2. Run "npx secure-claude-skills update" to update', 'yellow');
    log('   3. Manually remove the directory first\n', 'yellow');
    return true;
  }

  if (pathExists('.claude/skills')) {
    log(`\n✅ Existing .claude/skills/ detected`, 'green');
    log('   Security skills will be installed to .claude/skills/security/', 'cyan');
    log('   Your existing skills will not be affected.\n', 'green');
  }

  return false;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse options
  const options = {
    sync: null,
    force: args.includes('--force'),
  };

  const syncIndex = args.indexOf('--sync');
  if (syncIndex !== -1 && args[syncIndex + 1]) {
    options.sync = args[syncIndex + 1];
  }

  // Handle commands
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (command === 'init') {
    log('\n🔒 Secure Claude Skills Installer', 'bright');

    // Check for conflicts
    if (!options.force && checkConflicts()) {
      process.exit(1);
    }

    // Force removal if needed
    if (options.force && pathExists(INSTALL_PATH)) {
      log(`   Removing existing installation...`, 'yellow');
      fs.rmSync(INSTALL_PATH, { recursive: true, force: true });
    }

    // Install based on sync method
    if (options.sync === 'subtree') {
      subtreeInstall();
    } else if (options.sync === 'submodule') {
      submoduleInstall();
    } else if (options.sync) {
      log(`❌ Unknown sync method: ${options.sync}`, 'red');
      log('   Valid options: subtree, submodule', 'yellow');
      process.exit(1);
    } else {
      copyInstall();
    }

    log('\n📚 Next Steps:', 'bright');
    log('   1. Review skills in .claude/skills/security/', 'cyan');
    log('   2. Use skills in Claude Code: /security-overview', 'cyan');
    log('   3. Read docs: https://github.com/harperaa/secure-claude-skills\n', 'cyan');

  } else if (command === 'update') {
    updateSkills();

  } else {
    log(`❌ Unknown command: ${command}`, 'red');
    log('   Run: npx secure-claude-skills --help', 'yellow');
    process.exit(1);
  }
}

// Run CLI
main();
