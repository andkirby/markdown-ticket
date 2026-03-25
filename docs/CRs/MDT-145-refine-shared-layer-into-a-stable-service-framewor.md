---
code: MDT-145
status: In Progress
dateCreated: 2026-03-24T21:30:51.412Z
type: Architecture
priority: High
phaseEpic: Phase B (Enhancement)
relatedTickets: MDT-143
---

# Refine shared layer into a stable service framework for CLI and MCP consumers

## 1. Description
- Problem statement with background context
  The repository is increasingly treating `shared/` as the operational contract for multiple entrypoints: web server, MCP server, and the new `mdt-cli` flow in MDT-143. Today, the shared layer provides useful CRUD primitives, but it is not yet systematic enough to serve as a stable framework boundary for all consumers.
- Current state vs. desired state
  Current state: core services exist, but important behavior is still fragmented or underspecified. Project detection still lives in MCP-private code, project lookup is not consistently normalized at the shared boundary, attribute mutation semantics are overwrite-oriented instead of operation-oriented, shared mutation methods often return booleans instead of structured results, and shared services still emit direct console output in ways that complicate disciplined CLI and automation behavior.
  Desired state: `shared/` becomes the authoritative service framework for cross-entrypoint business logic, with explicit APIs, stable result contracts, normalized lookup behavior, reusable detection logic, and no terminal-specific side effects.
- Business or technical justification
  MDT-143 exposed the gap directly: the CLI can be implemented on top of the current shared layer, but only by adding adapters and policy glue that should really live in shared. If not addressed, the system will drift into multiple near-duplicate behavior layers across CLI, MCP, and server code.

## 2. Rationale
- Why this change is necessary
  A shared layer that is only partially systematic increases coupling, duplicates policy, and makes LLM-facing CLI behavior harder to keep deterministic and machine-friendly.
- What it accomplishes
  This change establishes a cleaner service-framework boundary for all consumers, reduces duplicated normalization and mutation logic, and makes future CLI/MCP/web features safer to implement.
- Alignment with project goals
  The project already prefers shared logic over duplicated entrypoint logic. Formalizing `shared/` as a stable framework layer aligns with that direction and supports MDT-143 directly.

## 3. Solution Analysis
- Evaluated alternatives with trade-offs
  1. Keep the current shared layer and let each consumer adapt it locally.
     Trade-off: fast in the short term, but duplicates behavior and increases drift.
  2. Move more behavior into CLI- or MCP-specific adapters.
     Trade-off: preserves local flexibility, but weakens the shared boundary and creates inconsistent semantics.
  3. Strengthen `shared/` as the canonical service layer with explicit result contracts and reusable utilities.
     Trade-off: requires targeted refactoring now, but reduces long-term duplication and ambiguity.
- Selected approach with justification
  Select option 3. Strengthen `shared/` into an explicit framework boundary for cross-entrypoint business logic and supporting utilities.
- Rejected options and why
  Options 1 and 2 were rejected because they normalize drift and make future LLM-facing and automation-facing behavior harder to keep consistent.

## 4. Implementation Specification
- Technical details and architecture changes
  1. Add a shared project detector utility and migrate MCP startup detection to it.
  2. Normalize project lookup semantics at the shared boundary, including case-insensitive project-code resolution where required.
  3. Introduce explicit shared mutation semantics for ticket attribute updates so relation fields can express set/add/remove operations without CLI-only interpretation.
  4. Replace boolean-only attr-mutation outcomes with structured result objects that identify the target entity, normalized inputs, changed fields, and final persisted values.
  5. Remove direct console-oriented side effects from shared services, or make logging injectable and quiet by default.
  6. Clarify which shapes belong in `domain-contracts/` versus which service contracts belong in `shared/`.
- Step-by-step implementation plan
  1. Audit current `shared/` APIs used by CLI, MCP, and server paths.
  2. Define the target shared service contracts and result objects.
  3. Extract shared project detection and migrate existing consumers.
  4. Refactor ticket attribute mutation into operation-aware shared APIs.
  5. Migrate the shared-layer consumers that currently duplicate shared logic, while leaving CLI command-module adoption to MDT-143.
  6. Add or update tests that verify cross-entrypoint consistency for the refactored shared behaviors in scope.
- Testing requirements and success criteria
  Add shared-layer unit coverage for lookup normalization, project detection, and attr mutation operations. Add consumer-facing tests that prove MCP and downstream CLI adoption use the same shared semantics for the refactored behaviors in scope.

## 5. Acceptance Criteria
- Measurable conditions for completion
  - A shared project detection utility exists and is consumed by MCP and CLI-facing code.
  - Shared project lookup supports the resolution semantics required by the CLI contract.
  - Shared ticket attribute APIs support explicit set/add/remove semantics for relation fields.
  - Shared attr-mutation APIs return structured results instead of bare booleans for the write flows covered by this refactor.
  - Shared services no longer emit uncontrolled console output in normal success/error paths.
  - Consumer layers do not need bespoke business-logic adapters for the refactored shared behaviors.
- Definition of "done"
  The shared layer exposes a coherent, reusable service framework for project and ticket operations, and the CLI/MCP/server consumers can rely on it without re-implementing the same rules in parallel.

Scope note:
- MDT-145 defines and validates the shared framework boundary.
- CLI command behavior and command-module adoption remain owned by MDT-143.

## 6. Trace Artifacts

- Requirements: [requirements.md](./MDT-145/requirements.md), [requirements.trace.md](./MDT-145/requirements.trace.md)
- BDD: [bdd.md](./MDT-145/bdd.md), [bdd.trace.md](./MDT-145/bdd.trace.md)
- Architecture: [architecture.md](./MDT-145/architecture.md), [architecture.trace.md](./MDT-145/architecture.trace.md)
