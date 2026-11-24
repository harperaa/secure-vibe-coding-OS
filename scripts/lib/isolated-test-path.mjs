/**
 * Build a PATH for fake-CLI tests that cannot resolve real developer CLIs.
 *
 * Layout: <stubDirs…> : <node-tools scratch> : /usr/bin : /bin
 * The scratch folder contains symlinks to ONLY `node` (and `npm` if present
 * next to that node binary). It never includes the Node distribution's full
 * bin directory, so global CLIs installed alongside node stay unreachable.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SYSTEM_PATH = ['/usr/bin', '/bin'].join(path.delimiter);

/**
 * @param {string[]} stubDirs directories that hold fake `gh` / `doppler` / `npx` / …
 * @param {{ after?: (fn: () => void) => void }} [lifecycle] test lifecycle (e.g. `t`)
 * @returns {string} PATH value
 */
export function isolatedTestPath(stubDirs, lifecycle) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'node-tools-'));
  if (lifecycle?.after) {
    lifecycle.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  }

  const nodeSrc = process.execPath;
  fs.symlinkSync(nodeSrc, path.join(scratch, 'node'));

  const npmSrc = path.join(path.dirname(nodeSrc), 'npm');
  if (fs.existsSync(npmSrc)) {
    fs.symlinkSync(npmSrc, path.join(scratch, 'npm'));
  }

  return [...stubDirs, scratch, SYSTEM_PATH].join(path.delimiter);
}

/** PATH segments after the stub dirs (for assertions / diagnostics). */
export const ISOLATED_SYSTEM_PATH = SYSTEM_PATH;
