# UAT Refinement Brief

## Objective

Complete native tool coverage and make the next steps and agent usage discoverable under plugins/.

## Approved Changes

2026-10-26 user request: reopen MDT-262; expose all non-cloud MDT commands, enable spec-trace natively, document full coverage and agent guidance, link root README, run UAT/pipeline verification, make scoped commits. Cloud commands remain CLI-only. DSH live testing may be separate.

## Changed Requirement IDs

No prior canonical store existed. Add BR-1.1 (projects), BR-1.2 (tickets), BR-2.1 (trace), BR-3.1 (guidance), C1 (cloud exclusion), C2 (host/arguments), C3 (execution/output), C4 (shared ownership), C5 (evidence boundaries). This is an additive change to the original ticket; earlier acceptance is historical evidence.

## Affected Downstream Trace

Backfill requirements, scenarios, artifacts/obligations, test plans and tasks in stage order. Retain original ticket history; current canonical state reflects this UAT round. Requirements lock created from this approved UAT scope; all five stages pass strict validation.

## Execution Slices

1. TASK-1: shared tool contracts plus BB/DSH adapters and automated coverage. Direct targets: plugin JS/TS source, install-safe copies and tests. GREEN targets: project_lifecycle, ticket_lifecycle, trace_lifecycle, TEST-native-coverage, TEST-regression. Completes non-cloud capabilities through registered tools.
2. TASK-2: organized human/agent documentation and installed BB verification. Direct targets: plugin README/docs/skill and root README. GREEN targets: discover_tool_guidance, TEST-docs. Makes tool usage and verified/pending lanes visible.

## Validation

Baseline: 45 plugin tests, TypeScript check and BB build passed. New coverage captured RED before implementation (6 pass, 52 fail); failed-validation diagnostics captured a separate real-CLI RED regression. Current scoped suite: 107 pass, 0 fail; TypeScript, targeted lint and BB build exit 0. Fresh BB discovery: all 19 schemas and installed on-demand skill; five read-only native calls pass. Deterministic verification passed and independent semantic review returned PASS with no blocking issues. Final documentation evidence is rebound after DSH inventory/stdin reconciliation. User approved closure on 2026-10-26; MDT-262 is Implemented. DSH fresh-host live verification remains a separate check.

## Watchlist

Independent preparation review requires negative spec-trace validation diagnostics: preserve detailed stdout JSON plus stderr summary, under existing C3.

CLI rename is text-only; delete is cwd-only. spec-trace delete grammar must match the installed binary. Preserve unrelated dirty worktree changes and avoid registering temporary fixtures in the user's normal registry. DSH fresh-host live checks remain separate.
