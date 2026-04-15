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
];
