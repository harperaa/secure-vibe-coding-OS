#!/usr/bin/env node

/**
 * Content Module Manager for Secure Vibe Coding OS
 *
 * Optional page/content modules live in templates/modules/<name>/ and are
 * copied into the repo on demand. Backend and security infrastructure
 * (convex/, lib/, middleware.ts, app/api/) is always installed and is never
 * touched by this script.
 *
 * Module layout:
 *   templates/modules/<name>/module.json  - manifest (marker, overwrites, edits)
 *   templates/modules/<name>/INSTALL.md   - post-copy steps for customized repos
 *   templates/modules/<name>/files/       - mirrors repo root, copied verbatim
 *
 * Subcommands:
 *   list                    - All modules with installed status
 *   status                  - { installed: [...], available: [...] }
 *   install <name...>       - Copy one or more modules into the repo
 *     --apply-edits         - Also apply the manifest's anchor-based edits
 *                             (nav links, homepage sections). Safe on a fresh
 *                             template; on customized repos missing anchors are
 *                             reported and the module's INSTALL.md applies.
 *     --force               - Overwrite conflicting files (default: skip + report)
 *     --json                - Machine-readable JSON output (for driver scripts)
 *
 * All input comes from CLI arguments (no interactive prompts), so the full
 * install is scriptable, e.g.:
 *   node scripts/modules.mjs install homepage-content blog pricing --apply-edits
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT_DIR, 'templates', 'modules');

// Canonical install order — modules later in the list may edit files that
// earlier modules install (e.g. pricing inserts a section into the
// homepage-content page).
const CANONICAL_ORDER = ['homepage-content', 'blog', 'dashboard-sample', 'pricing'];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

function loadManifests() {
  if (!fs.existsSync(MODULES_DIR)) {
    return [];
  }
  const manifests = [];
  for (const entry of fs.readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(MODULES_DIR, entry.name, 'module.json');
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest._dir = path.join(MODULES_DIR, entry.name);
    manifests.push(manifest);
  }
  // Sort into canonical order; unknown modules go last alphabetically.
  manifests.sort((a, b) => {
    const ia = CANONICAL_ORDER.indexOf(a.name);
    const ib = CANONICAL_ORDER.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return manifests;
}

function isInstalled(manifest) {
  return fs.existsSync(path.join(ROOT_DIR, manifest.marker));
}

function findManifest(manifests, name) {
  return manifests.find((m) => m.name === name);
}

// ---------------------------------------------------------------------------
// File copying
// ---------------------------------------------------------------------------

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function copyModuleFiles(manifest, { force = false } = {}) {
  const filesDir = path.join(manifest._dir, 'files');
  const result = { copied: [], overwritten: [], conflicts: [] };
  if (!fs.existsSync(filesDir)) {
    return result;
  }
  const overwrites = new Set(manifest.overwrites || []);
  for (const src of listFilesRecursive(filesDir)) {
    const rel = path.relative(filesDir, src);
    const dest = path.join(ROOT_DIR, rel);
    const exists = fs.existsSync(dest);
    if (exists && !overwrites.has(rel) && !force) {
      // Identical content is not a conflict — the module is simply already there.
      const same = fs.readFileSync(src).equals(fs.readFileSync(dest));
      if (!same) {
        result.conflicts.push(rel);
      }
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    (exists ? result.overwritten : result.copied).push(rel);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Anchor-based edits
// ---------------------------------------------------------------------------

function applyEdits(manifest, manifests) {
  const applied = [];
  const skipped = [];
  for (const edit of manifest.edits || []) {
    const target = path.join(ROOT_DIR, edit.file);
    const describe = `${edit.file} @ ${edit.anchor}`;

    if (edit.ifInstalled) {
      const dep = findManifest(manifests, edit.ifInstalled);
      if (!dep || !isInstalled(dep)) {
        skipped.push({ edit: describe, reason: `module "${edit.ifInstalled}" not installed` });
        continue;
      }
    }
    if (!fs.existsSync(target)) {
      skipped.push({ edit: describe, reason: 'target file missing' });
      continue;
    }
    const content = fs.readFileSync(target, 'utf8');
    if (edit.skipIfContains && content.includes(edit.skipIfContains)) {
      skipped.push({ edit: describe, reason: 'already applied' });
      continue;
    }
    const lines = content.split('\n');
    const anchorIndex = lines.findIndex((line) => line.includes(edit.anchor));
    if (anchorIndex === -1) {
      skipped.push({
        edit: describe,
        reason: `anchor not found — apply manually per ${path.relative(ROOT_DIR, manifest._dir)}/INSTALL.md`,
      });
      continue;
    }
    const insertLines = edit.insert.replace(/\n$/, '').split('\n');
    const at = edit.position === 'after' ? anchorIndex + 1 : anchorIndex;
    lines.splice(at, 0, ...insertLines);
    fs.writeFileSync(target, lines.join('\n'));
    applied.push(describe);
  }
  return { applied, skipped };
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function runList(flags) {
  const manifests = loadManifests();
  const rows = manifests.map((m) => ({
    name: m.name,
    title: m.title,
    description: m.description,
    installed: isInstalled(m),
  }));
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  for (const row of rows) {
    console.log(`${row.installed ? '[installed]' : '[available]'} ${row.name} — ${row.description}`);
  }
}

function runStatus(flags) {
  const manifests = loadManifests();
  const status = {
    installed: manifests.filter(isInstalled).map((m) => m.name),
    available: manifests.filter((m) => !isInstalled(m)).map((m) => m.name),
  };
  if (flags.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  console.log(`Installed: ${status.installed.join(', ') || '(none)'}`);
  console.log(`Available: ${status.available.join(', ') || '(none)'}`);
}

function runInstall(names, flags) {
  const manifests = loadManifests();

  const unknown = names.filter((n) => !findManifest(manifests, n));
  if (unknown.length > 0) {
    const known = manifests.map((m) => m.name).join(', ');
    console.error(`Unknown module(s): ${unknown.join(', ')}. Known modules: ${known}`);
    process.exit(1);
  }

  // Install in canonical order regardless of the order given on the CLI.
  const selected = manifests.filter((m) => names.includes(m.name));

  const results = [];
  for (const manifest of selected) {
    const copyResult = copyModuleFiles(manifest, { force: !!flags.force });
    const result = {
      module: manifest.name,
      ...copyResult,
      editsApplied: [],
      editsSkipped: [],
      postInstall: path.relative(ROOT_DIR, path.join(manifest._dir, 'INSTALL.md')),
    };
    if (flags['apply-edits']) {
      const editResult = applyEdits(manifest, manifests);
      result.editsApplied = editResult.applied;
      result.editsSkipped = editResult.skipped;
    }
    results.push(result);
  }

  const anyConflicts = results.some((r) => r.conflicts.length > 0);
  const anchorFailures = results.flatMap((r) =>
    r.editsSkipped.filter((s) => s.reason.startsWith('anchor not found'))
  );

  if (flags.json) {
    console.log(JSON.stringify({ success: !anyConflicts, results }, null, 2));
  } else {
    for (const r of results) {
      console.log(`\n=== ${r.module} ===`);
      console.log(`Copied: ${r.copied.length} file(s)`);
      if (r.overwritten.length > 0) console.log(`Overwritten: ${r.overwritten.join(', ')}`);
      if (r.conflicts.length > 0) {
        console.log(`CONFLICTS (existing files left untouched — re-run with --force to overwrite):`);
        for (const c of r.conflicts) console.log(`  - ${c}`);
      }
      for (const e of r.editsApplied) console.log(`Edit applied: ${e}`);
      for (const s of r.editsSkipped) console.log(`Edit skipped: ${s.edit} (${s.reason})`);
      if (!flags['apply-edits']) {
        console.log(`Post-install steps: see ${r.postInstall}`);
      }
    }
    console.log('');
  }

  if (anchorFailures.length > 0 && !flags.json) {
    console.log('Some edits could not be applied automatically (customized files?).');
    console.log('Run /add-module in Claude Code or follow the INSTALL.md steps above.');
  }

  process.exit(anyConflicts ? 2 : 0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { flags, positional } = parseArgs(process.argv);
const command = positional[0];

switch (command) {
  case 'list':
    runList(flags);
    break;
  case 'status':
    runStatus(flags);
    break;
  case 'install': {
    const names = positional.slice(1);
    if (names.length === 0) {
      console.error('Usage: node scripts/modules.mjs install <name...> [--apply-edits] [--force] [--json]');
      process.exit(1);
    }
    runInstall(names, flags);
    break;
  }
  default:
    console.error('Usage: node scripts/modules.mjs <list|status|install> [args]');
    process.exit(1);
}
