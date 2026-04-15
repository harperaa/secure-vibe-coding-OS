import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Recursively copy a directory from src to dest.
 * Returns the number of files copied.
 */
export function copyRecursive(src, dest) {
  let count = 0;
  mkdirSync(dest, { recursive: true });

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      count += copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      // Preserve executable bit for shell scripts
      if (entry.endsWith('.sh')) {
        chmodSync(destPath, 0o755);
      }
      count++;
    }
  }
  return count;
}

/**
 * Copy a single file, creating parent directories as needed.
 */
export function copySingleFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  if (dest.endsWith('.sh')) {
    chmodSync(dest, 0o755);
  }
}

/**
 * Remove a directory recursively if it exists.
 */
export function removeDir(dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Check if a path exists.
 */
export function pathExists(p) {
  return existsSync(p);
}
