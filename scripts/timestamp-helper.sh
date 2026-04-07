#!/usr/bin/env bash
# timestamp-helper.sh — Consistent timestamp generation for security assessment agents
#
# Usage:
#   ./scripts/timestamp-helper.sh iso       → 2026-04-07T14:30:15+00:00
#   ./scripts/timestamp-helper.sh filename  → 20260407_143015
#   ./scripts/timestamp-helper.sh both      → Prints both (iso on line 1, filename on line 2)

set -euo pipefail

MODE="${1:-iso}"

ISO_TS=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)
FILENAME_TS=$(date +%Y%m%d_%H%M%S)

case "$MODE" in
  iso)
    echo "$ISO_TS"
    ;;
  filename)
    echo "$FILENAME_TS"
    ;;
  both)
    echo "$ISO_TS"
    echo "$FILENAME_TS"
    ;;
  *)
    echo "Usage: $0 {iso|filename|both}" >&2
    exit 1
    ;;
esac
