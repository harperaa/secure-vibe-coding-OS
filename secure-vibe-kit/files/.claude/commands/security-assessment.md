---
name: security-assessment
description: Run a comprehensive security assessment of the codebase by invoking the security orchestrator agent. Covers OWASP Top 10, authentication, authorization, injection risks, secrets exposure, dependency vulnerabilities, and secure coding patterns. Use before opening any PR, after adding new endpoints or authentication logic, or on a regular cadence. Triggers on "security assessment", "security review", "run security check", "assess security", "security scan".
---

# Security Assessment

Run a full security assessment using the security orchestrator agent.

## Instructions

**Step 1 — Detect prior assessment artifacts.**

Check whether this repo has been assessed before:

```bash
ls security_context/*.json .deepsec security_reports/*.md 2>/dev/null
```

Prior artifacts include files in `security_context/` (e.g. `raw_findings.json`,
`deepsec_findings.json`), a `.deepsec/` directory at the repo root, or timestamped
reports in `security_reports/`.

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
