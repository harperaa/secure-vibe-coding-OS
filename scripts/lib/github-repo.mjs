// Which GitHub repository the scripts act on.
//
// A product created by `deploy.mjs github-setup` has two remotes: `origin`
// (the product) and `upstream` (the template). With no `gh repo set-default`,
// gh either refuses ("multiple remotes detected") or picks `upstream`, so a
// script that lets gh choose can change the TEMPLATE repository instead of the
// product. Every gh call that changes a repository names it explicitly.

import { spawnSync } from 'node:child_process';

/** "owner/repo" for a github.com remote URL, or null for anything else. */
export function parseGithubRepo(remoteUrl) {
  const m = /^(?:https:\/\/|ssh:\/\/git@|git@)github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(
    (remoteUrl || '').trim()
  );
  return m ? m[1] : null;
}

/**
 * GH_REPO if set (gh's own override, [HOST/]OWNER/REPO), otherwise the
 * `origin` remote. Null when neither names a github.com repository; callers
 * then leave the choice to gh, as before.
 */
export function resolveGithubRepo({ cwd = process.cwd(), env = process.env } = {}) {
  if (env.GH_REPO) return env.GH_REPO;
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf-8' });
  return r.status === 0 ? parseGithubRepo(r.stdout) : null;
}
