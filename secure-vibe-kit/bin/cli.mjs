#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY_MAPPINGS } from '../lib/constants.mjs';
import { copyRecursive, copySingleFile, removeDir, pathExists } from '../lib/fs-utils.mjs';
import { initClaudeMd, updateClaudeMd } from '../lib/claude-md.mjs';
import * as log from '../lib/logger.mjs';

const __dirname = fileURLToPath(new URL('..', import.meta.url));
const FILES_DIR = join(__dirname, 'files');
const VERSION = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8')).version;

function printUsage() {
  console.log(`
secure-vibe-kit v${VERSION}

Security-first Claude Code agents, commands, skills, and CI workflows.

Usage:
  npx secure-vibe-kit init      Install into the current project
  npx secure-vibe-kit update    Update to the latest version
  npx secure-vibe-kit status    Show what is currently installed
  npx secure-vibe-kit --help    Show this help message

Options:
  --dry-run          Show what would be written without writing
  --skip-claude-md   Skip CLAUDE.md merge
  --force            Overwrite without confirmation prompts
`);
}

function getProjectRoot() {
  return process.cwd();
}

function resolveSource(relativePath) {
  return join(FILES_DIR, relativePath);
}

function resolveDest(projectRoot, relativePath) {
  return join(projectRoot, relativePath);
}

function copyMapping(mapping, projectRoot, dryRun) {
  const src = resolveSource(mapping.src);
  const dest = resolveDest(projectRoot, mapping.dest);
  let count = 0;

  if (!pathExists(src)) {
    log.warn(`Source not found: ${mapping.src} (skipping)`);
    return 0;
  }

  if (dryRun) {
    log.info(`Would copy ${mapping.src} → ${mapping.dest} (${mapping.mode})`);
    return 0;
  }

  switch (mapping.mode) {
    case 'replace':
      removeDir(dest);
      count = copyRecursive(src, dest);
      break;
    case 'merge':
      count = copyRecursive(src, dest);
      break;
    case 'file':
      copySingleFile(src, dest);
      count = 1;
      break;
  }

  return count;
}

function handleClaudeMd(mode, projectRoot, dryRun, skip) {
  if (skip) {
    log.dim('Skipping CLAUDE.md merge (--skip-claude-md)');
    return;
  }

  const sourcePath = join(FILES_DIR, 'CLAUDE.md');
  if (!pathExists(sourcePath)) {
    log.warn('No CLAUDE.md found in package files');
    return;
  }

  const sourceContent = readFileSync(sourcePath, 'utf-8');
  const targetPath = join(projectRoot, 'CLAUDE.md');

  if (dryRun) {
    if (pathExists(targetPath)) {
      log.info(`Would ${mode} CLAUDE.md marker block in existing file`);
    } else {
      log.info('Would create CLAUDE.md with marker block');
    }
    return;
  }

  const result = mode === 'init'
    ? initClaudeMd(sourceContent, targetPath)
    : updateClaudeMd(sourceContent, targetPath);

  switch (result.action) {
    case 'created':
      log.success('Created CLAUDE.md with secure-vibe-kit content');
      break;
    case 'appended':
      log.success('Appended secure-vibe-kit block to existing CLAUDE.md');
      break;
    case 'updated':
      log.success('Updated secure-vibe-kit block in CLAUDE.md');
      break;
    case 'skipped':
      log.warn(result.reason);
      break;
  }
}

function runInit(projectRoot, flags) {
  log.header('secure-vibe-kit init');

  if (!flags.force && pathExists(join(projectRoot, '.claude', 'agents'))) {
    log.warn('.claude/agents/ already exists.');
    log.info('Use `npx secure-vibe-kit update` to refresh, or `--force` to overwrite.');
    process.exit(1);
  }

  let totalFiles = 0;

  for (const mapping of COPY_MAPPINGS) {
    const count = copyMapping(mapping, projectRoot, flags.dryRun);
    totalFiles += count;
    if (!flags.dryRun && count > 0) {
      log.success(`${mapping.dest} (${count} file${count === 1 ? '' : 's'})`);
    }
  }

  handleClaudeMd('init', projectRoot, flags.dryRun, flags.skipClaudeMd);

  console.log();
  if (flags.dryRun) {
    log.info('Dry run complete — no files were written.');
  } else {
    log.header(`Installed ${totalFiles} files`);
    log.info('Run `npx secure-vibe-kit update` anytime to pull the latest.');
    log.info('Review CLAUDE.md and adjust project-specific settings as needed.');
  }
}

function runUpdate(projectRoot, flags) {
  log.header('secure-vibe-kit update');

  let totalFiles = 0;

  for (const mapping of COPY_MAPPINGS) {
    const count = copyMapping(mapping, projectRoot, flags.dryRun);
    totalFiles += count;
    if (!flags.dryRun && count > 0) {
      log.success(`${mapping.dest} (${count} file${count === 1 ? '' : 's'})`);
    }
  }

  handleClaudeMd('update', projectRoot, flags.dryRun, flags.skipClaudeMd);

  console.log();
  if (flags.dryRun) {
    log.info('Dry run complete — no files were written.');
  } else {
    log.header(`Updated ${totalFiles} files`);
  }
}

function runStatus(projectRoot) {
  log.header('secure-vibe-kit status');

  const checks = [
    { path: '.claude/agents', label: 'Security agents' },
    { path: '.claude/commands', label: 'Slash commands' },
    { path: '.claude/skills', label: 'Skills library' },
    { path: '.github/workflows', label: 'CI workflows' },
    { path: 'scripts/timestamp-helper.sh', label: 'Timestamp helper' },
    { path: 'CLAUDE.md', label: 'CLAUDE.md' },
  ];

  for (const check of checks) {
    const exists = pathExists(join(projectRoot, check.path));
    if (exists) {
      log.success(`${check.label} (${check.path})`);
    } else {
      log.dim(`${check.label} — not installed (${check.path})`);
    }
  }

  // Check for marker block in CLAUDE.md
  const claudePath = join(projectRoot, 'CLAUDE.md');
  if (pathExists(claudePath)) {
    const content = readFileSync(claudePath, 'utf-8');
    if (content.includes('<!-- BEGIN secure-vibe-kit -->')) {
      log.success('CLAUDE.md has secure-vibe-kit marker block');
    } else {
      log.warn('CLAUDE.md exists but has no secure-vibe-kit marker block');
    }
  }

  console.log();
  log.info(`Package version: v${VERSION}`);
}

// --- Main ---

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-'));
const flags = {
  dryRun: args.includes('--dry-run'),
  skipClaudeMd: args.includes('--skip-claude-md'),
  force: args.includes('--force'),
};

if (!command || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const projectRoot = getProjectRoot();

switch (command) {
  case 'init':
    runInit(projectRoot, flags);
    break;
  case 'update':
    runUpdate(projectRoot, flags);
    break;
  case 'status':
    runStatus(projectRoot);
    break;
  default:
    log.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
