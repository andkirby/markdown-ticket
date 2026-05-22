# BDD: MDT-156

**Source**: [MDT-156](../MDT-156-security-hardening.md)
**Generated**: 2026-05-18
**Mode**: normal

## Overview

BDD coverage is limited to the four behavior requirements explicitly routed to `bdd`: allowed-origin stream access for SSE/devtools, outside-root directory denial, and inside-root directory browsing. Lower-level security controls such as disallowed-origin denial, symlink handling, dependency versions, headers, MCP internals, and secret scanning remain routed to `/mdt:tests` and `/mdt:architecture`.

## Acceptance Strategy

| Journey | Scenario IDs | Covered Requirements |
|---------|--------------|----------------------|
| Browser stream access with configured origins | `sse_stream_allows_configured_origin`, `devtools_stream_allows_configured_origin` | BR-1.1, BR-1.3 |
| Project directory browsing boundary | `directory_browse_denies_outside_root`, `directory_browse_allows_inside_root` | BR-2.1, BR-2.3 |

Scenario budget: 4 total, within the normal-mode maximum of 12 and within the per-journey maximum of 3.

## E2E Detection

| Field | Value |
|-------|-------|
| Framework | Playwright |
| Directory | `tests/e2e` |
| Command | `bun run test:e2e` |
| Filter | n/a for this stage |
| Executable files generated | none |

Executable E2E files were not generated in this stage because the requested edit scope only allowed `docs/CRs/MDT-156/bdd.md` and `docs/CRs/MDT-156/bdd.trace.md`. `/mdt:tests` should create or refine executable Playwright/API coverage and connect it to the canonical test plan.

## Test-Facing Contract Notes

- Scenarios intentionally use external API/browser-observable outcomes only.
- SSE route is concrete: `GET /api/events`.
- Devtools route is marked architecture-owned, currently expected as `GET /api/devtools/logs/stream`; architecture must confirm whether additional devtools stream routes are in scope.
- Directory denial carries the ticket acceptance example: `GET /api/directories?path=/etc` returns HTTP 403 with no directory entries.
- Inside-root browsing uses representative path `/allowed/project`; tests should replace it with a real configured allowed root fixture.
- BDD does not decide the filesystem allowlist policy; architecture must resolve C3 before implementation.
- BDD does not cover disallowed-origin denial directly because BR-1.2 and BR-1.4 are routed to tests, not BDD.
- BDD does not cover MCP, dependency, header, secret-scan, devtools-production, or config-maintenance requirements because those are tests or clarification routed.

## Validation Summary

- Canonical scenario records were written with `spec-trace scenario upsert`.
- Validation command: `spec-trace validate MDT-156 --stage bdd --format json`.
- Validation result: passed with no issues.
- Trace projection: `docs/CRs/MDT-156/bdd.trace.md`.

---
Use `bdd.trace.md` for canonical scenario rows and coverage summaries.
