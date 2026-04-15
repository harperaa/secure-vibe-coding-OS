#!/usr/bin/env bash
# Sync latest files from the parent secure-vibe-coding-OS repo into files/
# Run from anywhere — the script resolves paths relative to itself.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$(cd "$KIT_ROOT/.." && pwd)"
DEST="$KIT_ROOT/files"

echo "Syncing from: $SOURCE"
echo "         to: $DEST"
echo

rsync -av --delete "$SOURCE/.claude/agents/"   "$DEST/.claude/agents/"
rsync -av --delete "$SOURCE/.claude/commands/"  "$DEST/.claude/commands/"
rsync -av --delete "$SOURCE/.claude/skills/"    "$DEST/.claude/skills/"
rsync -av --delete "$SOURCE/.github/workflows/" "$DEST/.github/workflows/"
cp "$SOURCE/scripts/timestamp-helper.sh"        "$DEST/scripts/timestamp-helper.sh"
cp "$SOURCE/.claude/statusline.sh"              "$DEST/.claude/statusline.sh"
chmod +x "$DEST/.claude/statusline.sh"
cp "$SOURCE/.claude/settings.json"              "$DEST/.claude/settings.json"

echo
echo "Done. Remember to update files/CLAUDE.md manually if the source CLAUDE.md changed."
echo "Do NOT copy project-specific lines (Convex, Cursor rules, etc.)."
