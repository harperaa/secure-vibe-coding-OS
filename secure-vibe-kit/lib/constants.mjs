export const MARKER_BEGIN = '<!-- BEGIN secure-vibe-kit -->';
export const MARKER_END = '<!-- END secure-vibe-kit -->';

// Mapping of source paths (relative to files/) to destination paths (relative to project root)
// mode: 'replace' = delete target dir then copy fresh
// mode: 'merge'   = copy files into existing dir without deleting others
// mode: 'file'    = single file copy
export const COPY_MAPPINGS = [
  { src: '.claude/agents',   dest: '.claude/agents',   mode: 'replace' },
  { src: '.claude/commands',  dest: '.claude/commands',  mode: 'replace' },
  { src: '.claude/skills',    dest: '.claude/skills',    mode: 'replace' },
  { src: '.github/workflows', dest: '.github/workflows', mode: 'merge' },
  { src: 'scripts/timestamp-helper.sh', dest: 'scripts/timestamp-helper.sh', mode: 'file' },
  // CI gates referenced by .github/workflows/ci.yml
  { src: 'scripts/check-convex-auth.mjs', dest: 'scripts/check-convex-auth.mjs', mode: 'file' },
  { src: 'scripts/audit-gate.mjs', dest: 'scripts/audit-gate.mjs', mode: 'file' },
  { src: 'scripts/audit-allowlist.json', dest: 'scripts/audit-allowlist.json', mode: 'file' },
  { src: '.claude/statusline.sh', dest: '.claude/statusline.sh', mode: 'file' },
  { src: '.claude/settings.json', dest: '.claude/settings.json', mode: 'merge-json' },
];
