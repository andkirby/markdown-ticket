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
  Current state: core services exist, but important behavior is still fragmented or underspecified. Project detection still lives in MCP-private code, project lookup is not consistently normalized at the shared boundary, ticket list, ticket attribute updates, ticket document updates, and ticket subdocument access are not modeled as clearly separate service capabilities, project list and project updates are not expressed through one systematic project service contract, shared mutation methods often return booleans instead of structured results, and shared services still emit direct console output in ways that complicate disciplined CLI and automation behavior.
  Desired state: `shared/` becomes the authoritative service framework for cross-entrypoint business logic, with explicit service capability boundaries, a lean shared read/write contract model, normalized lookup behavior, reusable detection logic, and no terminal-specific side effects.
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
  3. Strengthen `shared/` as the canonical service layer with explicit but lean result contracts and reusable utilities.
     Trade-off: requires targeted refactoring now, but reduces long-term duplication and ambiguity.
- Selected approach with justification
  Select option 3. Strengthen `shared/` into an explicit framework boundary for cross-entrypoint business logic and supporting utilities.
- Rejected options and why
  Options 1 and 2 were rejected because they normalize drift and make future LLM-facing and automation-facing behavior harder to keep consistent.

## 4. Implementation Specification
- Technical details and architecture changes
  1. Add a shared project detector utility and migrate MCP startup detection to it.
  2. Normalize project lookup semantics at the shared boundary, including case-insensitive project-code resolution where required.
  3. Define the shared ticket surface as separate capabilities: ticket list, ticket attribute updates, ticket document updates, and ticket subdocument listing.
  4. Keep ticket title as part of the ticket entity while preserving the MDT-064 rule that the markdown H1 is the authoritative title source and therefore belongs to document-update flow, not attribute-update flow.
  5. Define the shared project surface as separate capabilities: project list and project attribute updates.
  6. Replace boolean-only write outcomes with a shared structured write-result family that identifies the target entity, normalized inputs, changed fields, and final persisted values.
  7. Remove direct console-oriented side effects from shared services, or make logging injectable and quiet by default.
  8. Clarify which shapes belong in `domain-contracts/` versus which service contracts belong in `shared/`, including a more explicit `project/entity` and `project/input` split while keeping service interfaces out of `domain-contracts`.
- Step-by-step implementation plan
  1. Audit current `shared/` APIs used by CLI, MCP, and server paths.
  2. Define the target shared service contracts plus shared read/write result families.
  3. Extract shared project detection and migrate existing consumers.
  4. Define the public project and ticket service capability surfaces before binding implementation classes to them.
  5. Refactor ticket attribute, document, list, and subdocument behavior into separate shared service responsibilities while keeping entity-facing service wording simple.
  6. Migrate the shared-layer consumers that currently duplicate shared logic, while leaving CLI command-module adoption to MDT-143.
  7. Add or update tests that verify cross-entrypoint consistency for the refactored shared behaviors in scope.
- Testing requirements and success criteria
  Add shared-layer unit coverage for project detection, project list/update contracts, ticket list filtering, ticket attribute updates, ticket document updates, and ticket subdocument listing. Add consumer-facing tests that prove MCP and downstream CLI adoption use the same shared semantics for the refactored behaviors in scope.

## 5. Acceptance Criteria
- Measurable conditions for completion
  - A shared project detection utility exists and is consumed by MCP and CLI-facing code.
  - Shared project services expose distinct list and attribute-update capabilities, and project lookup supports the resolution semantics required by the CLI contract.
  - Shared ticket services expose distinct list, attribute-update, document-update, and subdocument-list capabilities.
  - Shared ticket attribute APIs support explicit set/add/remove semantics for relation fields, while title and document content remain outside attribute-update flow.
  - Shared write APIs return structured results instead of bare booleans for the update flows covered by this refactor.
  - `domain-contracts/project` is organized around clearer canonical roles such as entity and input, while service interfaces remain outside `domain-contracts`.
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
- Tests: [tests.md](./MDT-145/tests.md), [tests.trace.md](./MDT-145/tests.trace.md)
- Tasks: [tasks.md](./MDT-145/tasks.md), [tasks.trace.md](./MDT-145/tasks.trace.md)
