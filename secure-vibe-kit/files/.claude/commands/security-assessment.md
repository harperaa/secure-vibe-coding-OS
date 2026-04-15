---
name: security-assessment
description: Run a comprehensive security assessment of the codebase by invoking the security orchestrator agent. Covers OWASP Top 10, authentication, authorization, injection risks, secrets exposure, dependency vulnerabilities, and secure coding patterns. Use before opening any PR, after adding new endpoints or authentication logic, or on a regular cadence. Triggers on "security assessment", "security review", "run security check", "assess security", "security scan".
---

# Security Assessment

Run a full security assessment using the security orchestrator agent.

## Instructions

Invoke the security orchestrator agent with the following instruction:

> create a new and comprehensive security assessment

The orchestrator agent will coordinate the full suite of security assessment agents across the codebase. Let it run to completion without interruption.

$ARGUMENTS
