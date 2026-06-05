---
name: security-assessment
description: Run a comprehensive security assessment of the codebase by invoking the security orchestrator agent. Covers OWASP Top 10, authentication, authorization, injection risks, secrets exposure, dependency vulnerabilities, and secure coding patterns. Use before opening any PR, after adding new endpoints or authentication logic, or on a regular cadence. Triggers on "security assessment", "security review", "run security check", "assess security", "security scan".
---

# Security Assessment

Run a full security assessment using the security orchestrator agent.

## Instructions

**Step 0 — Ensure DeepSec prerequisites are ready.**

The orchestrator's vulnerability-discovery phase runs DeepSec (the agentic
supplemental scanner) alongside Semgrep and manual analysis. DeepSec requires
`pnpm` and an initialized `.deepsec/` workspace. DeepSec is technically
optional — without it the scanner falls back to Semgrep + manual — but you lose
significant coverage. Satisfy both up front.

**Step 0a — Check `pnpm` is installed.**

```bash
command -v pnpm
```

- **If found:** continue to Step 0b.
- **If missing:** use **AskUserQuestion** (Header: "Install pnpm?"):
  - "Yes, install pnpm (Recommended)" — Required for DeepSec
  - "No, skip DeepSec" — Proceed with Semgrep + manual analysis only

  **If "Yes":** install via the official pnpm installer and update this shell's
  `PATH` in the same Bash command so the new binary is usable immediately:

  ```bash
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  export PATH="$PNPM_HOME:$PATH"
  command -v pnpm && pnpm --version
  ```

  If `command -v pnpm` STILL fails after that block, STOP and tell the user:
  "pnpm was installed but isn't on this shell's `PATH` yet. Open a new terminal
  (or `source ~/.zshrc` / `source ~/.bashrc`), then re-run `/security-assessment`."

  **If "No":** mark DeepSec as skipped for this run, skip Step 0b, continue to
  Step 1. The scanner will set `deepsec_available: false` in `raw_findings.json`.

**Step 0b — Check and initialize `.deepsec/`.**

```bash
ls -d .deepsec 2>/dev/null
```

- **If found:** continue. DeepSec is already initialized; the scanner will reuse
  the existing workspace.
- **If missing:** use **AskUserQuestion** (Header: "Initialize DeepSec?"):
  - "Yes, initialize DeepSec (Recommended)" — Runs `npx deepsec init` + `pnpm install`
  - "No, skip DeepSec" — Proceed with Semgrep + manual analysis only

  **If "Yes":**

  ```bash
  npx --yes deepsec init
  ( cd .deepsec && pnpm install )
  ```

  If `.deepsec/data/<id>/SETUP.md` exists after init and describes an agent
  bootstrap step, complete it before continuing.

  **If "No":** continue to Step 1. The scanner will set
  `deepsec_available: false`.

**Step 1 — Detect prior assessment artifacts.**

Check whether this repo has been assessed before:

```bash
ls security_context/*.json security_reports/*.md security_reports/assessment_*/ 2>/dev/null
```

Prior artifacts are files under `security_context/` (e.g. `raw_findings.json`,
`deepsec_findings.json`, `traced_findings.json`) or timestamped report
directories under `security_reports/`. Do **not** treat the presence of
`.deepsec/` as a prior assessment — Step 0b may have just initialized it on a
brand-new repo. A real prior DeepSec finding shows up as
`security_context/deepsec_findings.json`, not as the workspace dir.

**Step 2 — Determine the assessment mode.**

- If NO prior artifacts exist, this is necessarily a **FRESH** assessment — do not
  ask, just proceed.
- If prior artifacts DO exist, use the **AskUserQuestion** tool to ask whether this
  run is a fresh assessment or a reassessment:
  - **Fresh** — full scan from scratch. All prior data is archived and ignored
    (orchestrator RULE 2). Choose this if the prior assessment is stale or you want
    an independent baseline.
  - **Reassessment** — the codebase was assessed before and has since changed.
    Prior DeepSec findings are preserved (not destructively archived) so DeepSec can
    `revalidate` them and `process --diff` only the changed files; Semgrep still runs
    a full scan, and threat modeling, tracing, and reporting still run fresh.

**Step 3 — Invoke the orchestrator with the chosen mode.**

Invoke the security orchestrator agent with exactly one of these instructions:

> create a new and comprehensive security assessment — MODE: FRESH

> create a new and comprehensive security assessment — MODE: REASSESSMENT

The orchestrator agent will coordinate the full suite of security assessment agents
across the codebase. Let it run to completion without interruption.

$ARGUMENTS
