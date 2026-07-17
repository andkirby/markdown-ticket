# Requirements: MDT-168

**Source**: [MDT-168](../MDT-168-configuration-editing-api.md)
**Generated**: 2026-07-16

## Overview

MDT-168 delivers a bounded configuration-management surface: a default-deny,
selector-aware API plus focused UI entry points that let owners manage allowlisted
project, global, user, and registry settings without turning the product into a
generic TOML editor. Every selector carries exposure metadata (editable, guarded,
readOnly, fileOnly) so each owning UI surface can decide what to render and how to
guard it. Mutations are full-request validated, atomic per config file, and never
convert invalid input into a default.

The assessment (Option 2 — Redesign Inline) is preserved: this is not a style
review. Six bounded refactor seams are in scope and are carried as constraints.

## Semantic Decisions

| Concept                      | Final Semantic (chosen truth)                                             | Rejected Semantic                                   | Why                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation validation strategy | Strict, default-deny; invalid input rejected with field-level error       | Tolerant `.catch()` recovery to defaults            | Reusing tolerant read schemas for writes silently converts bad input to defaults and writes outside the allowlist (assess mismatch 1)                |
| Atomicity unit               | One atomic write per target config file per request                       | Per-field writes or a single multi-file transaction | One file can change per selector scope; multi-file transactions are out of scope and unnecessary for per-scope patches                               |
| Partial request behavior     | Reject the entire request on any invalid selector or value; write nothing | Apply valid fields, skip invalid ones               | Config files must never reflect a half-applied request (Edge-1, BR-2.2)                                                                              |
| Guarded operation routing    | Explicit operation-specific workflow with confirmation + invariants       | Ordinary scalar selector patch                      | Code/ticketsPath/registry path changes affect multiple files and identity; a scalar patch would desync registry and local config (assess mismatch 6) |
| Side-effect ownership        | Explicit injected post-write effects with defined failure behavior        | Side effects buried in TOML write helpers           | A write helper must not know about cache/discovery/tree/watcher refresh (C-5)                                                                        |
| Browser-only settings        | Stay in client localStorage; never reach backend TOML                     | Promote to backend config                           | Browser/profile-specific presentation, explicitly out of scope (BR-6.1)                                                                              |
| Config read ownership        | One application boundary delegates to scope-specific storage adapters     | Each route reads files directly                     | Direct reads in system.ts, ProjectController, ProjectConfigService, ConfigRepository drift by entry point (assess mismatch 2)                        |

## Constraint Carryover

Each constraint must appear in architecture and be reachable from tasks/tests:

| Constraint ID                                     | Must Appear In                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| C-1 (default-deny allowlist)                      | architecture.md (Application boundary), tests.md (allowlist contract tests), tasks.md |
| C-2 (strict vs tolerant schemas)                  | architecture.md (domain-contracts module), tests.md (mutation rejection tests)        |
| C-3 (atomic write per file)                       | architecture.md (Persistence/atomicity), tests.md (atomic-failure tests)              |
| C-4 (canonical document defaults, maxDepth drift) | architecture.md (domain-contracts defaults), tasks.md (resolve drift), tests.md       |
| C-5 (explicit post-write effects)                 | architecture.md (Side effects), tests.md (effect tests)                               |
| C-6 (one application boundary, scope adapters)    | architecture.md (Component ownership), tests.md (per-scope adapter tests)             |
| C-7 (thin routes/controllers)                     | architecture.md (Route ownership), tasks.md                                           |
| C-8 (owner-only authz)                            | architecture.md (Authorization), tests.md (read-only denial tests), E2E               |
| C-9 (stable OpenAPI contracts)                    | architecture.md (API contracts), tasks.md (OpenAPI docs)                              |
| C-10 (no new packages)                            | architecture.md (Dependencies), tasks.md (verify package.json unchanged)              |

## Delivery Timing

All behavior requirements (BR-1.1 through BR-6.1) are `Now` — they are delivered
in this ticket. No requirement is deferred.

## Open Questions / Decision-Needed

- **maxDepth canonical value**: C-4 requires resolving the drift to _one_ value.
  The current schema default is 3; the runtime fallbacks use 5. Architecture
  must pick one and justify it (5 matches observed document-tree behavior and
  the PathSelector/TreeBuilder fallback; 3 matches the existing schema default
  and registry/fixtures). This is a design decision for architecture, not a
  requirements gap — the requirement is only that they agree.

## Notes for Review

- File-only selectors (`project.id`, `startNumber`, `counterFile`) and the
  read-only-until-confirmed `ui.autoRefresh`/`ui.refreshInterval` are explicitly
  not editable and are covered by BR-1.2/C-1, not by separate behavior rows.
- The existing selector-state JSON endpoint (`/api/config/selector`,
  `project-selector.json`) is mutable user state, not a TOML config selector.
  It remains on its current maintenance-gated path; MDT-168 does not fold it
  into the TOML application boundary.

---

Use `requirements.trace.md` for canonical requirement rows and route summaries.
_Rendered by mdt:requirements via spec-trace_
