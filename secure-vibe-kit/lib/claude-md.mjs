import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { MARKER_BEGIN, MARKER_END } from './constants.mjs';

/**
 * Wrap content with secure-vibe-kit markers.
 */
function wrapContent(content) {
  return `${MARKER_BEGIN}\n${content.trim()}\n${MARKER_END}`;
}

/**
 * Check if a CLAUDE.md file already contains our marker block.
 */
function hasMarkerBlock(content) {
  return content.includes(MARKER_BEGIN) && content.includes(MARKER_END);
}

/**
 * Replace the existing marker block with new content.
 */
function replaceMarkerBlock(existingContent, newBlock) {
  const re = new RegExp(
    escapeRegExp(MARKER_BEGIN) + '[\\s\\S]*?' + escapeRegExp(MARKER_END)
  );
  return existingContent.replace(re, newBlock);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merge CLAUDE.md content in init mode:
 * - If target doesn't exist: create it with the marker block
 * - If target exists but no markers: append the marker block
 * - If target already has markers: return false (already initialized)
 */
export function initClaudeMd(sourceContent, targetPath) {
  const block = wrapContent(sourceContent);

  if (!existsSync(targetPath)) {
    writeFileSync(targetPath, block + '\n', 'utf-8');
    return { action: 'created', path: targetPath };
  }

  const existing = readFileSync(targetPath, 'utf-8');

  if (hasMarkerBlock(existing)) {
    return { action: 'skipped', reason: 'Marker block already exists. Use `update` to refresh.' };
  }

  const merged = existing.trimEnd() + '\n\n' + block + '\n';
  writeFileSync(targetPath, merged, 'utf-8');
  return { action: 'appended', path: targetPath };
}

/**
 * Merge CLAUDE.md content in update mode:
 * - If target has markers: replace the block
 * - If target exists but no markers: append the block
 * - If target doesn't exist: create it
 */
export function updateClaudeMd(sourceContent, targetPath) {
  const block = wrapContent(sourceContent);

  if (!existsSync(targetPath)) {
    writeFileSync(targetPath, block + '\n', 'utf-8');
    return { action: 'created', path: targetPath };
  }

  const existing = readFileSync(targetPath, 'utf-8');

  if (hasMarkerBlock(existing)) {
    const updated = replaceMarkerBlock(existing, block);
    writeFileSync(targetPath, updated, 'utf-8');
    return { action: 'updated', path: targetPath };
  }

  const merged = existing.trimEnd() + '\n\n' + block + '\n';
  writeFileSync(targetPath, merged, 'utf-8');
  return { action: 'appended', path: targetPath };
}
