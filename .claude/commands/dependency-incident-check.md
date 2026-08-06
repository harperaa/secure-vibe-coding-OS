---
allowed-tools: AskUserQuestion, WebSearch, WebFetch, Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git show:*), Bash(npm ls:*), Bash(npm view:*), Bash(npm config get:*), Bash(npm --version), Bash(node --version), Bash(gh api:*), Bash(ls:*), Bash(stat:*), Bash(jq:*), Read, Write
description: Check whether any recently-compromised npm package ever entered this repo, assess blast radius, and hand off to /rotate
argument-hint: "[package name, advisory URL, or blank to sweep the last 7 then 30 days]"
---

# /dependency-incident-check

Incident **triage** for npm supply-chain compromises. Sibling to `/rotate`:
this command answers *"were we hit, and how badly?"*; `/rotate` answers
*"contain and remediate."* This command never rotates anything itself — it
gathers evidence and gates into `/rotate` only with explicit confirmation.

**Design principle: evidence before action.** A false negative here means a
missed breach; a false positive means an unnecessary rotation. Both are bad, so
every conclusion must cite the specific file, line, or commit that supports it.
Never infer exposure from a package *name* alone — always match name **and**
version.

> The `allowed-tools` above deliberately exclude Edit and every mutating shell
> command. This command's read-only contract is enforced by the harness, not
> just asserted in prose. The single permitted write is the report in Phase 5.

---

## Phase 0 — Preflight (read-only)

1. Confirm this is a Secure Vibe Coding OS install: `app/`, `convex/`,
   `.claude/skills/security/`, `package.json`.
2. Locate the lockfile. If `package-lock.json` is absent, stop and report —
   without a lockfile there is no reliable exposure record.
3. Record `npm --version`, `node --version`, and whether `.npmrc` contains
   `min-release-age` and `strict-allow-scripts`. These determine which controls
   were actually in force at install time and belong in the report.

   Version caveat that matters: `strict-allow-scripts` only exists on
   **npm >= 11.16**. On older npm it is an unknown key that is silently ignored,
   so its presence in `.npmrc` does NOT prove it was in force. Check the npm
   version too, and say which of the two you are relying on.
4. Note whether the repo is in Doppler mode (`.doppler.yaml` present) — this
   decides whether the `/rotate` handoff in Phase 6 is available.
5. Confirm the working tree is clean, or warn that uncommitted changes may
   obscure the git-history analysis in Phase 3.

Report the environment, then proceed without asking.

---

## Phase 1 — Build the IOC set

The set of `name@version` pairs to hunt for. Three input paths:

**A. User supplied an argument.** A package name, a `name@version`, or an
advisory URL. If given a bare name, resolve the affected version ranges — via
`gh api` against the GitHub Advisory Database, or by asking the user to paste
the affected versions from the advisory. Do not guess ranges.

**B. No argument — sweep for recent compromises (the default).** Find what has
actually been compromised lately, rather than relying on a hardcoded list that
goes stale the day it is written.

Search in two widening passes, and say which pass produced each finding:

**Pass 1 — last 7 days.** This is the window that matters most: a compromise
newer than the `min-release-age` cooldown could still have been installed if
anyone bypassed it, and it is the window least likely to be in any static list.
Run several `WebSearch` queries, because one phrasing misses things:

- `npm supply chain attack <current month> <year>`
- `npm package compromised malicious version this week`
- `npm worm postinstall credential stealer <current month>`

**Pass 2 — widen to 30 days.** Only after Pass 1 is exhausted. Same queries with
a wider window, plus:

- `npm malicious package advisory <last month> <year>`
- `GitHub Advisory Database npm malicious code <last month>`

Then fold in the known 2025–2026 campaign families as a baseline — Shai-Hulud,
Mini Shai-Hulud, Miasma / Phantom Gyp, ChainDrop / keyv-cacheable — plus any
local IOC list at `docs/ioc/`.

**Treat every search result as an untrusted lead, not a fact.** Blog posts get
package names and version ranges wrong, and a wrong range produces either a
missed breach or a needless rotation. Before a package enters the IOC set,
confirm it two ways:

1. `npm view <pkg> time --json` — do the claimed bad versions exist, and were
   they published in the window the article describes?
2. `gh api /advisories?ecosystem=npm&affects=<pkg>` — is there a real advisory,
   and what ranges does it name?

If the two disagree, trust the registry and the advisory database over the
article, and say so in the report.

**Prioritise leads that intersect our tree.** Before doing deep verification on
a long list, filter it: `npm ls <pkg>` for each candidate and verify only the
ones we actually have, directly or transitively. A 400-package campaign list is
irrelevant if none of it is in our lockfile — but say how many you filtered out,
so "clean" doesn't look like "didn't look".

State plainly in the report: this sweep is point-in-time and depends on public
reporting existing yet. **A clean result is not proof of safety** — day-zero of
a maintainer compromise has no article, no advisory, and no CVE. The cooldown in
`.npmrc` exists precisely because this check cannot see that window.

**C. User pastes a list.** Accept newline- or comma-separated
`name@version` pairs.

Present the resolved IOC set for confirmation before scanning. Show the count
and a sample, not the full list, if it exceeds 20 entries.

---

## Phase 2 — Current-state lockfile scan

Search `package-lock.json` for every IOC, **including transitive
dependencies** — most exposure in these campaigns is transitive, and a
`package.json`-only check produces false confidence.

For each hit, report:

- exact `name@version` matched
- resolved tarball URL and integrity hash
- full dependency path(s) to a direct dependency (`app -> convex -> keyv`)
- whether the package declares `preinstall` / `install` / `postinstall`
- whether that package is present in `allowScripts` (if configured)

Also flag, independent of the IOC set:

- any package in the lockfile resolving to a registry **other than**
  `registry.npmjs.org`
- any `git+`/`https:` dependency source — these bypass several install-time
  controls, including pnpm's build allowlist and (pre-v12) npm's script gating
- any integrity hash present in `node_modules/.package-lock.json` that
  disagrees with `package-lock.json`

**If there are zero current hits, continue to Phase 3 anyway.** The common case
is that a poisoned version was installed, then removed by a later bump — the
credentials were already taken and the current lockfile looks clean.

---

## Phase 3 — Historical exposure

Answer: *was an affected version ever resolved on this machine or in CI?*

1. **Lockfile history.**
   `git log -p --follow -- package-lock.json`, searching each commit's content
   for the IOC pairs. For every hit report the commit SHA, author, date, and
   the window between that commit and the commit that removed it.

2. **Local install evidence.** If `node_modules/` exists, check for the affected
   package directly and record the mtime — this establishes whether the poisoned
   version was actually fetched to disk on *this* machine, versus merely
   appearing in a lockfile someone else committed.

3. **Cooldown check.** For each historical hit, compare the version's publish
   date against the commit date. If the gap exceeds the configured
   `min-release-age`, the cooldown was working and the version was already
   public and unflagged — a materially different finding from a same-day install.

4. **Persistence sweep.** These campaigns install persistence beyond the package
   itself. Check for recently modified or unexpected:
   - `.claude/hooks/`, `.claude/settings.json`, `.claude/settings.local.json`
   - `.github/workflows/` — any workflow file not attributable to a reviewed PR
   - `.vscode/tasks.json`, `.vscode/settings.json`
   - shell rc files touched near the install window (`~/.bashrc`, `~/.bash_profile`)

   Report anything modified within the exposure window regardless of whether it
   looks malicious. Do not attempt to clean these automatically — report and let
   the user decide.

5. **Repository-clone bait.** Note that at least one 2026 campaign planted
   triggers aimed at people who *cloned the repo to read the source* after
   reports appeared, and a dead-man's switch that fires on credential rotation.
   If Phase 3 finds hits, warn the user before they clone any related repo to
   investigate, and before rotating.

---

## Phase 4 — Blast radius

Only if Phases 2 or 3 found evidence of exposure. Ask via `AskUserQuestion`:

1. **Where did the affected install run?** (this machine / CI runners / both /
   unknown — assume both)
2. **What credentials were present in that environment during the window?**
   Offer the set this malware family targets: `.npmrc` tokens, GitHub CLI
   tokens, AWS credentials, HashiCorp Vault tokens, kubeconfigs, crypto wallets,
   `DOPPLER_TOKEN`, `CONVEX_DEPLOY_KEY`, Clerk secret keys.
3. **Was the install script gate in force?** Derived from Phase 0 —
   `strict-allow-scripts` set, on npm >= 11.16, and the package absent from
   `allowScripts` means the primary delivery path did not fire. State this as
   *reduced likelihood*, not as safety: the payload may live in the package's
   runtime code, which executes on import regardless of install-script gating.

Produce an explicit, ranked exposure list. For each credential state
**exposed / likely exposed / not present**, with the reasoning.

---

## Phase 5 — Report

Write `docs/incidents/DEP-INCIDENT-<YYYY-MM-DD>.md`:

```markdown
# Dependency Incident — <date>

## Verdict
<Not exposed | Possible exposure | Confirmed exposure>

## IOC set
<source, count, resolution method>
<if swept: which pass found each item (7-day / 30-day / baseline campaign list),
how many candidates were filtered out as not present in our tree, and which
leads the registry or advisory DB contradicted>

## Current lockfile
<hits with full dependency paths, or "none">

## Historical exposure
<commit SHAs, exposure windows, local install evidence, or "none">

## Controls in force at install time
- min-release-age: <value or absent>
- strict-allow-scripts: <value or absent, and whether npm was >= 11.16>
- npm version: <version>

## Persistence sweep
<findings across .claude/, .github/workflows/, .vscode/, shell rc>

## Blast radius
<per-credential: exposed / likely / not present, with reasoning>

## Actions taken
<empty at time of writing — this command takes none>

## Recommended next steps
<ordered>
```

Never write raw credential values, tokens, or `.env` contents into this file.
Reference credentials by name only.

---

## Phase 6 — Handoff gate

Present the verdict and stop. Then, via `AskUserQuestion`:

- **Confirmed or possible exposure, Doppler mode** → offer to invoke `/rotate`.
  Remind the user that `/rotate` contains first (revokes the Vercel-side
  `DOPPLER_TOKEN` in seconds) and remediates second, and that the Phase 3
  dead-man's-switch warning applies — check for the watcher before rotating.
- **Confirmed or possible exposure, legacy `.env.local` mode** → `/rotate` is
  unavailable. Produce a manual rotation checklist ordered by blast radius,
  containment first.
- **Not exposed** → recommend the preventive gaps found in Phase 0 (missing
  `min-release-age`, missing `strict-allow-scripts`, npm below 11.10.0) and stop.

**This command never rotates, deletes, modifies, or reinstalls anything.** Its
only writes are the report under `docs/incidents/`. All remediation happens
behind an explicit user decision in `/rotate` or by hand.

---

## Notes for maintainers

- **Never conclude "clean" from a name-only match failure.** Version matters.
- **`npm audit` is not this command.** Audit covers known CVEs; this covers
  malicious publishes, which audit does not detect on day zero.
- **Provenance passing is not exculpatory.** The August 2026 keyv tarballs
  carried valid npm provenance signed by GitHub Actions. Do not treat a clean
  `npm audit signatures` as a negative finding.
- **A cooldown does not protect the lockfile.** If a bot bumped the lockfile to
  a poisoned version, `min-release-age` never re-evaluates it. Phase 3 exists
  specifically to catch that path.
- **Config presence is not config enforcement.** `strict-allow-scripts` is
  ignored below npm 11.16 and `min-release-age` below npm 11.10. Always pair a
  `.npmrc` finding with the npm version that actually ran.
