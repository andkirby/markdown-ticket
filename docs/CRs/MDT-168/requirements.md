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

## Same-Browser Consumer Refresh (UAT 2026-07-26)

A Settings save of `ui.projectSelector.visibleCount` /
`ui.projectSelector.compactInactive` persists to `user.toml` correctly, but the
project selector rail (MDT-129 `useSelectorData`) only reads those backend
preferences **once on mount** and is not refreshed after the successful write.
The rail and Settings drift within the same browser session until a full page
reload.

This refines how `BR-3.2` is interpreted for `ui.projectSelector.*`:

- `BR-3.2` keeps the same ID. Its "fire the required runtime side effect" clause
  is narrowed to make explicit that **no server/global side effect** is required
  for user-scope selector preferences (no discovery cache, no watcher, no
  registry reload) — that part of the existing architecture wording stands.
- The **same-browser consumer refresh** is a distinct, narrower, observable
  behavior and is promoted to its own requirement `BR-7.1` so it can carry its
  own scenario, architecture obligation, and tests. This is `refine_in_place`
  for BR-3.2 and `additive_change` for the consumer-refresh contract.

| Concept                              | Final Semantic (chosen truth)                                                                                                                            | Rejected Semantic                                                                                       | Why                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-scope selector write effects    | No server/global effect; the required effect is a same-browser consumer refresh signal so live selector consumers re-fetch backend prefs                 | Treat user prefs as globally effect-less (current wording) and rely on full page reload to converge     | The originating UAT bug: persisted value is correct but the rail shows stale prefs until reload. "No global effect" ≠ "no consumer-refresh effect" |
| Consumer-refresh transport           | Narrow named window event already used by `useSelectorData` (`mdt:selector-prefs-updated`); after a successful `ui.projectSelector.*` save only           | A generic app-wide event bus; broadcasting on every config write                                         | The rail already listens for `SELECTOR_PREFS_SYNC_EVENT`; reusing it keeps the contract narrow and avoids a bus (architecture guidance)            |
| Backend prefs vs browser-only prefs  | Backend prefs (`visibleCount`, `compactInactive`) are re-fetched from `/api/config/selector` on the refresh signal; browser-only prefs stay in localStorage | Re-fetch and overwrite localStorage accent/autocolor/style from the backend                             | MDT-129 ownership split: backend owns visibleCount/compactInactive; browser owns accent/autocolor/accentStyle (BR-6.1)                             |
| `useSelectorData` merge on refresh   | Re-fetch backend prefs, then layer localStorage overrides on top (same merge order as initial load)                                                      | Replace all prefs with backend response; or skip backend and only re-read localStorage                  | Initial-load merge order (`{...validatedPreferences, ...localOverrides}`) must be preserved on refresh to keep browser-only prefs authoritative    |

## Delivery Timing

All behavior requirements (BR-1.1 through BR-7.1) are `Now` — they are delivered
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
