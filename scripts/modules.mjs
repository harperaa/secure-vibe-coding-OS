#!/usr/bin/env node

/**
 * Content Module Manager for Secure Vibe Coding OS
 *
 * Optional page/content modules live in templates/modules/<name>/ and are
 * copied into the repo on demand. Backend and security infrastructure
 * (convex/, lib/, proxy.ts, app/api/) is always installed and is never
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
 *     --all                 - Install every available module (in place of <name...>)
 *                             (see also `set`, below, which can remove modules too)
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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT_DIR, 'templates', 'modules');
// Minimal-site versions of the files that modules overwrite or edit. `set`
// rebuilds any module selection from these, so the result never depends on
// which modules the repo happens to have installed.
const BASE_DIR = path.join(ROOT_DIR, 'templates', 'base', 'files');

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

function isInstalled(manifest, root = ROOT_DIR) {
  return fs.existsSync(path.join(root, manifest.marker));
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

function copyModuleFiles(manifest, { force = false, root = ROOT_DIR } = {}) {
  const filesDir = path.join(manifest._dir, 'files');
  const result = { copied: [], overwritten: [], conflicts: [] };
  if (!fs.existsSync(filesDir)) {
    return result;
  }
  const overwrites = new Set(manifest.overwrites || []);
  for (const src of listFilesRecursive(filesDir)) {
    const rel = path.relative(filesDir, src);
    const dest = path.join(root, rel);
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

function applyEdits(manifest, manifests, root = ROOT_DIR) {
  const applied = [];
  const skipped = [];
  for (const edit of manifest.edits || []) {
    const target = path.join(root, edit.file);
    const describe = `${edit.file} @ ${edit.anchor}`;

    if (edit.ifInstalled) {
      const dep = findManifest(manifests, edit.ifInstalled);
      if (!dep || !isInstalled(dep, root)) {
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
    installed: manifests.filter((m) => isInstalled(m)).map((m) => m.name),
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
    // Installing is idempotent: a module whose marker already exists is left
    // alone. Without this, re-running install over an already-installed module
    // reports false conflicts and exits 2 — because --apply-edits mutates files
    // AFTER copying them (e.g. blog's layout.tsx gains a FooterSection import),
    // so the on-disk file no longer matches the pristine module source.
    //
    // That is exactly what breaks a cloner's first Vercel deploy: /install
    // copies the modules, /deploy-to-dev commits them, and then vercel.json's
    // buildCommand re-runs `install --all` against a tree that already has
    // them. Use --force to deliberately re-copy and repair a module.
    if (isInstalled(manifest) && !flags.force) {
      results.push({
        module: manifest.name,
        alreadyInstalled: true,
        copied: [],
        overwritten: [],
        conflicts: [],
        editsApplied: [],
        editsSkipped: [],
        postInstall: path.relative(ROOT_DIR, path.join(manifest._dir, 'INSTALL.md')),
      });
      continue;
    }
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
      if (r.alreadyInstalled) {
        console.log('Already installed — skipped (use --force to re-copy).');
        continue;
      }
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
// set: make the installed modules exactly the given selection
// ---------------------------------------------------------------------------
//
// `install` only adds. `set` builds the site for a selection from scratch
// (minimal base files + the selected modules, in canonical order) and makes
// the working tree match it: modules outside the selection are removed, files
// they edited go back to their base version. That is how /install offers
// "Minimal shell" even though the repository ships with every module installed.
//
// Files the user has changed are never overwritten or deleted without --force.
// "Changed" means: different from what a clean build of the CURRENTLY installed
// selection produces.

/** Every path a module or the base can own, relative to the repo root. */
function managedPaths(manifests) {
  const out = new Set();
  if (fs.existsSync(BASE_DIR)) {
    for (const f of listFilesRecursive(BASE_DIR)) out.add(path.relative(BASE_DIR, f));
  }
  for (const m of manifests) {
    const filesDir = path.join(m._dir, 'files');
    if (!fs.existsSync(filesDir)) continue;
    for (const f of listFilesRecursive(filesDir)) out.add(path.relative(filesDir, f));
  }
  return [...out].sort();
}

/** Build base + selected modules (with their edits) into an empty directory. */
function buildSelection(root, names, manifests) {
  if (fs.existsSync(BASE_DIR)) {
    for (const f of listFilesRecursive(BASE_DIR)) {
      const dest = path.join(root, path.relative(BASE_DIR, f));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(f, dest);
    }
  }
  const selected = manifests.filter((m) => names.includes(m.name));
  for (const m of selected) copyModuleFiles(m, { force: true, root });
  // Edits run after every selected module is in place, so "ifInstalled" edits
  // see the whole selection whatever the order (each is skipIfContains-guarded).
  for (const m of selected) applyEdits(m, manifests, root);
  for (const m of selected) applyEdits(m, manifests, root);
}

function sameFile(a, b) {
  const ea = fs.existsSync(a);
  const eb = fs.existsSync(b);
  if (!ea || !eb) return ea === eb;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

function pruneEmptyDirs(dir) {
  while (dir !== ROOT_DIR && dir.startsWith(ROOT_DIR) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function runSet(names, flags) {
  const manifests = loadManifests();
  const unknown = names.filter((n) => !findManifest(manifests, n));
  if (unknown.length > 0) {
    console.error(`Unknown module(s): ${unknown.join(', ')}. Known modules: ${manifests.map((m) => m.name).join(', ')}`);
    process.exit(1);
  }
  if (!fs.existsSync(BASE_DIR)) {
    console.error('templates/base/files is missing; cannot rebuild the site for a module selection.');
    process.exit(1);
  }

  const current = manifests.filter((m) => isInstalled(m)).map((m) => m.name);
  const target = manifests.filter((m) => names.includes(m.name)).map((m) => m.name);
  const paths = managedPaths(manifests);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-set-'));
  const expectedNow = path.join(tmp, 'current');
  const wanted = path.join(tmp, 'target');
  fs.mkdirSync(expectedNow);
  fs.mkdirSync(wanted);
  let result;
  try {
    buildSelection(expectedNow, current, manifests);
    buildSelection(wanted, target, manifests);

    const changes = paths.filter((rel) => !sameFile(path.join(ROOT_DIR, rel), path.join(wanted, rel)));
    // A file `set` would touch that no longer matches a clean build of what is
    // installed now has been edited by hand.
    const customized = changes.filter((rel) => !sameFile(path.join(ROOT_DIR, rel), path.join(expectedNow, rel)));

    result = {
      success: true,
      current,
      target,
      toAdd: target.filter((n) => !current.includes(n)),
      toRemove: current.filter((n) => !target.includes(n)),
      changes,
      customized,
      applied: false,
    };

    if (customized.length > 0 && !flags.force) {
      result.success = false;
      result.error = 'customized_files';
    } else if (!flags['dry-run']) {
      for (const rel of changes) {
        const src = path.join(wanted, rel);
        const dest = path.join(ROOT_DIR, rel);
        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        } else if (fs.existsSync(dest)) {
          fs.rmSync(dest);
          pruneEmptyDirs(path.dirname(dest));
        }
      }
      result.applied = true;
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Installed now: ${result.current.join(', ') || '(none — minimal)'}`);
    console.log(`Selection:     ${result.target.join(', ') || '(none — minimal)'}`);
    if (result.changes.length === 0) {
      console.log('Already matches the selection — nothing to do.');
    } else if (result.error) {
      console.log(`\nNot changed: ${result.customized.length} file(s) were edited by hand and would be overwritten or removed:`);
      for (const f of result.customized) console.log(`  - ${f}`);
      console.log('Re-run with --force to replace them anyway, or keep the current modules.');
    } else {
      console.log(`${flags['dry-run'] ? 'Would change' : 'Changed'} ${result.changes.length} file(s).` +
        (result.toAdd.length ? ` Added: ${result.toAdd.join(', ')}.` : '') +
        (result.toRemove.length ? ` Removed: ${result.toRemove.join(', ')}.` : ''));
    }
  }
  process.exit(result.success ? 0 : 2);
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
    const names = flags.all
      ? loadManifests().map((m) => m.name)
      : positional.slice(1);
    if (names.length === 0) {
      console.error('Usage: node scripts/modules.mjs install <name...>|--all [--apply-edits] [--force] [--json]');
      process.exit(1);
    }
    runInstall(names, flags);
    break;
  }
  case 'set': {
    // `set --all`, `set <name...>`, or `set --minimal` (no modules).
    const names = flags.all ? loadManifests().map((m) => m.name) : positional.slice(1);
    if (names.length === 0 && !flags.minimal) {
      console.error('Usage: node scripts/modules.mjs set <name...>|--all|--minimal [--dry-run] [--force] [--json]');
      process.exit(1);
    }
    runSet(names, flags);
    break;
  }
  default:
    console.error('Usage: node scripts/modules.mjs <list|status|install|set> [args]');
    process.exit(1);
}
