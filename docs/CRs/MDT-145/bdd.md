# BDD: MDT-145

**Source**: [MDT-145](../MDT-145-refine-shared-layer-into-a-stable-service-framewor.md)
**Generated**: 2026-03-24

## Overview

BDD for this ticket locks the shared framework contract from the perspective of external consumers. The scenarios are intentionally spec-only: they describe what CLI, MCP, and server consumers must be able to rely on from `shared/`, without assuming a browser flow or inventing a dedicated shared-layer E2E harness.

## Acceptance Strategy

| Journey | Scenarios | Covered Requirements |
|---------|-----------|----------------------|
| Project context | `detect_project_context_from_nested_directory`, `resolve_project_case_insensitively_via_shared_lookup` | BR-1, BR-2 |
| Ticket mutation contract | `apply_relation_attr_operations_atomically`, `return_structured_results_for_shared_attr_writes` | BR-3, BR-4 |

## E2E Framework

- **Framework detected**: none for shared-layer external-contract scenarios
- **Directory**: n/a
- **Command**: n/a
- **Current stance**: spec-only for this stage

The repository has browser E2E and package-level test runners, but MDT-145 is about the shared service framework itself. That makes this stage a contract-specification layer rather than an executable E2E layer. `/mdt:architecture` and `/mdt:tests` should translate these scenarios into shared tests plus consumer-facing integration coverage.

## Test-Facing Contract Notes

- The external contract is consumer-facing, not user-interface-facing. A CLI command, MCP tool handler, or server service may act as the consumer, but they must all observe the same shared outcomes.
- Project detection is acceptance-visible as a deterministic context-resolution result, not as a private MCP bootstrap trick.
- Project lookup must preserve exact identifier semantics while normalizing project-code lookup case-insensitively.
- Attr mutation must cover replace plus relation-field add/remove semantics in one shared operation contract, with no partial persistence on validation failure.
- Structured attr-mutation results are part of the external contract for this ticket; a bare boolean is no longer sufficient closure for the refactored shared write flow.

## Execution Notes

- Current scenario coverage is canonical in `spec-trace`; no executable suite was added in this stage.
- `/mdt:tests` should add shared-layer tests around detector search, project lookup normalization, attr mutation operations, and structured attr-mutation results.
- Consumer suites for CLI and MCP should verify adoption later, but those consumer-facing test changes are downstream to MDT-145 rather than owned by this ticket.

---
*Canonical scenario projection: [bdd.trace.md](./bdd.trace.md)*
*Rendered by /mdt:bdd via spec-trace*
