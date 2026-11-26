import { spawnSync } from 'node:child_process';

/**
 * Runs `npx convex env list` so that it prints values. Newer CLIs list names only when they
 * detect an AI agent (AI_AGENT, CLAUDECODE) unless --include-values is passed; older CLIs do not
 * know that flag and always print values. So: try with the flag, and only when the CLI rejects
 * it as an unknown option, run again without. stdout is returned to the caller, never printed.
 */
export function convexEnvListWithValues(options) {
  const result = spawnSync('npx', ['convex', 'env', 'list', '--include-values'], options);
  if (result.status !== 0 && /unknown option '--include-values'/.test(result.stderr || '')) {
    return spawnSync('npx', ['convex', 'env', 'list'], options);
  }
  return result;
}
