# Tasks: MDT-252

**Source**: canonical architecture/tests/bdd state and [tasks.trace.md](tasks.trace.md).

## Scope and ownership

Shared services own external identity, safe resolution, mutations and matching. Domain contracts own shapes. CLI/MCP/HTTP adapt those contracts. One reusable badge owns external UI behavior. Existing cloud projections, authentication and local-key patterns are preserved. User authorized autonomous implementation, scoped commits, Codex review/fixes and final Implemented status; selected A and configured shortening/search requirements are recorded in the owner artifacts.

## Behavioral milestones

1. M1: create/read/preserve actual refs and open/inspect their configured external links on cards/viewer, including unavailable/read-only cases.
2. M2: compose ordered CLI/MCP ref changes with exact-only idempotent removal.
3. M3: search numeric/local/external identities with provenance, exact matching and always-visible search badges; pass final acceptance and independent review.

Tasks are sequential and may overlap shared owner files; do not delegate overlapping runtime ownership. No task deletes files. Test scaffolding already written during BDD/Tests is new relative to the initial Git baseline and belongs to its declared task. Generated trace projections and ignored trackers are not source mutations. All constraints C1–C14 apply to the referenced owners and Verify paths; no feature is deferred to evade verification.

### Task 1: Persist refs and deliver configured external badges end to end

**Canonical Task**: TASK-1

**Milestone**: M1

**Skills**: mdt-frontend, frontend-react-component, good-css, zod-validation-utilities

**Makes GREEN**: `TEST-domain-reference-contracts`, `TEST-shared-reference-roundtrip`, `TEST-external-reference-journeys`, `TEST-local-key-regression`, `refs_created_and_read`, `refs_survive_unrelated_edits`, `refs_open_correct_instance`, `refs_inspected_without_navigation`, `refs_read_only_navigation`, `refs_viewer_independent_visibility`

**Scope**: Deliver real refs persistence, per-entry configuration interpretation, safe derived links and the selected A badge/details/viewer composition. Add only the YAML dependency required by the refs boundary; preserve other frontmatter and cloud semantics.

**Boundary**: retain the existing ownership and public behavior outside explicit external-reference fields and matching.

**Creates**:
- `domain-contracts/src/ticket/external-reference.ts`
- `shared/services/externalReferences.ts`
- `shared/services/ticket/referenceFrontmatter.ts`
- `shared/services/ticket/referenceMutations.ts`
- `frontend/src/components/Badge/ExternalReferenceBadges.tsx`
- `frontend/src/components/Badge/TrackerIcon.tsx`
- `tests/e2e/setup/external-references.ts`
- `tests/e2e/ticket/external-references.spec.ts`
- `tests/e2e/quick-search/external-references.spec.ts`
- `docs/design/surfaces/external-reference-badge.spec.md`
- `docs/design/surfaces/external-reference-badge.mockups.md`
- `domain-contracts/src/ticket/__tests__/external-reference.test.ts`
- `shared/tests/services/external-reference.test.ts`

**Modifies**:
- `domain-contracts/src/__tests__/contract-types.test.ts`
- `server/http/ticketSchemas.ts`
- `domain-contracts/src/ticket/entity.ts`
- `domain-contracts/src/ticket/frontmatter.ts`
- `domain-contracts/src/ticket/persisted-frontmatter.ts`
- `domain-contracts/src/ticket/input.ts`
- `domain-contracts/src/ticket/schema.ts`
- `domain-contracts/src/ticket/view.ts`
- `domain-contracts/src/ticket/search.ts`
- `domain-contracts/src/project/schema.ts`
- `domain-contracts/src/search/schema.ts`
- `shared/models/Ticket.ts`
- `shared/services/MarkdownService.ts`
- `shared/services/CRService.ts`
- `shared/services/TicketService.ts`
- `shared/package.json`
- `bun.lock`
- `frontend/src/components/Badge/badge.css`
- `frontend/src/components/TicketAttributeTags.tsx`
- `frontend/src/config/ticketCardBadges.ts`
- `frontend/src/components/TicketViewer/CompactTicketHeader.tsx`
- `frontend/src/styleguide.html`
- `tests/e2e/utils/selectors.ts`
- `docs/CONFIG_SPECIFICATION.md`
- `docs/CRs/MDT-168/configuration-exposure.md`
- `docs/design/surfaces/ticket-card.spec.md`
- `docs/design/surfaces/ticket-card.mockups.md`
- `server/services/TicketService.ts`

**Deletes**: None.

**Must Not Touch**: `cloud/`, runtime credentials, user project/configuration directories, unrelated Git changes.

**Exclude**: external tracker API clients/sync, local-key widening, inline owner-name badge modes, new card mutation forms, server restarts.

**Anti-duplication / Duplication Guard**: import domain shapes and the shared resolver/mutation/match owners. Do not duplicate parsing or URL policy in adapters or React. If live source contradicts a planned owner, update architecture/tests/tasks first.

**Re-plan Trigger**: a raw-preservation, config availability, authorization, runtime-owner or input/output contract assumption is disproved by source or executed evidence.

**Verify**:

```bash
bun run --cwd domain-contracts jest --runInBand --runTestsByPath src/ticket/__tests__/external-reference.test.ts
bun test domain-contracts/src/ticket/__tests__/patterns.test.ts
bun run --cwd shared jest --runInBand --runTestsByPath tests/services/external-reference.test.ts
bun run test:e2e -- tests/e2e/ticket/external-references.spec.ts --project=chromium --grep-invert 'CLI add/remove'
bun run build:all
```

**Observe**: the Playwright command above exercises actual isolated files/config/API and browser-visible behavior for this milestone; do not replace it with a mocked API probe.

**Done when**:

- [x] Declared feature checks demonstrate RED to GREEN; existing local-key/drag behavior remains GREEN.
- [x] Exact commands pass and the observable journey matches the owning requirements.
- [x] Actual create/modify/delete paths match intent; no competing runtime owner.
- [x] Unknown/absent configuration and stored-ref preservation remain intact.

### Task 2: Expose ordered reference mutations through CLI and MCP

**Canonical Task**: TASK-2

**Milestone**: M2

**Skills**: zod-validation-utilities

**Makes GREEN**: `TEST-mcp-reference-contracts`, `TEST-external-reference-journeys`, `refs_mutated_idempotently`

**Scope**: Keep argv and output in CLI and schema/transport metadata in MCP. Delegate all normalization, idempotency and persistence to shared; exact-only removal must preserve the expanded counterpart when raw shorthand is removed twice.

**Boundary**: retain the existing ownership and public behavior outside explicit external-reference fields and matching.

**Creates**:
- `mcp-server/src/tools/__tests__/external-reference-boundary.test.ts`

**Modifies**:
- `server/services/TicketService.ts`
- `mcp-server/src/tools/handlers/crHandlers.ts`
- `cli/src/commands/attrMeta.ts`
- `cli/src/commands/attr.ts`
- `cli/src/output/formatter.ts`
- `cli/src/output/structured.ts`
- `cli/mdt-cli/SKILL.md`
- `shared/services/TicketService.ts`
- `shared/services/ticket/referenceMutations.ts`
- `mcp-server/src/tools/config/allTools.ts`

**Deletes**: None.

**Must Not Touch**: `cloud/`, runtime credentials, user project/configuration directories, unrelated Git changes.

**Exclude**: external tracker API clients/sync, local-key widening, inline owner-name badge modes, new card mutation forms, server restarts.

**Anti-duplication / Duplication Guard**: import domain shapes and the shared resolver/mutation/match owners. Do not duplicate parsing or URL policy in adapters or React. If live source contradicts a planned owner, update architecture/tests/tasks first.

**Re-plan Trigger**: a raw-preservation, config availability, authorization, runtime-owner or input/output contract assumption is disproved by source or executed evidence.

**Verify**:

```bash
bun run --cwd mcp-server jest --runInBand --runTestsByPath src/tools/__tests__/external-reference-boundary.test.ts
bun run test:e2e -- tests/e2e/ticket/external-references.spec.ts --project=chromium --grep 'CLI add/remove'
bun run --cwd cli build
bun run --cwd mcp-server build
```

**Observe**: the Playwright command above exercises actual isolated files/config/API and browser-visible behavior for this milestone; do not replace it with a mocked API probe.

**Done when**:

- [x] Declared feature checks demonstrate RED to GREEN; existing local-key/drag behavior remains GREEN.
- [x] Exact commands pass and the observable journey matches the owning requirements.
- [x] Actual create/modify/delete paths match intent; no competing runtime owner.
- [x] Unknown/absent configuration and stored-ref preservation remain intact.

### Task 3: Find external identities across search surfaces and verify full delivery

**Canonical Task**: TASK-3

**Milestone**: M3

**Skills**: mdt-frontend, frontend-react-component, good-css

**Makes GREEN**: `TEST-external-reference-search`, `TEST-drag-regression`, `refs_board_filter`, `refs_key_search_union`, `refs_partial_search_selection`

**Scope**: One shared reference-match policy supplies board/current-project/key-shaped/project-scoped/unified searches. Preserve local normalization and scope semantics, add complete #number matching/provenance/deduplication, and render unconditional external search badges without nested interactive controls. Finish docs/style-guide verification and independent implementation review.

**Boundary**: retain the existing ownership and public behavior outside explicit external-reference fields and matching.

**Creates**:
- `shared/services/ticket/referenceSearch.ts`

**Modifies**:
- `server/tests/services/MDT-261/create-diagnostics.test.ts`
- `server/tests/unit/ProjectController.test.ts`
- `mcp-server/src/tools/handlers/__tests__/create-diagnostics.test.ts`
- `tsconfig.json`
- `docs/design/surfaces/quick-search.interactions.md`
- `docs/design/surfaces/quick-search.spec.md`
- `frontend/src/components/QuickSearch/QuickSearchInput.tsx`
- `tests/e2e/quick-search/modal.spec.ts`
- `scripts/inspect-config.ts`
- `frontend/src/components/QuickSearch/ProjectResultRow.tsx`
- `frontend/src/components/QuickSearch/DocumentResultRow.tsx`
- `server/controllers/SearchController.ts`
- `frontend/src/hooks/useCrossProjectSearch.ts`
- `frontend/src/services/dataLayer.ts`
- `frontend/src/hooks/useProjectManager.ts`
- `frontend/src/hooks/useQuickSearch.ts`
- `frontend/src/utils/ticketFilters.ts`
- `frontend/src/components/QuickSearch/QuickSearchModal.tsx`
- `frontend/src/components/QuickSearch/QuickSearchResults.tsx`
- `frontend/src/components/QuickSearch/quick-search.css`
- `server/services/TicketService.ts`
- `shared/services/TicketService.ts`
- `frontend/src/components/Badge/ExternalReferenceBadges.tsx`
- `tests/e2e/quick-search/external-references.spec.ts`

**Deletes**: None.

**Must Not Touch**: `cloud/`, runtime credentials, user project/configuration directories, unrelated Git changes.

**Exclude**: external tracker API clients/sync, local-key widening, inline owner-name badge modes, new card mutation forms, server restarts.

**Anti-duplication / Duplication Guard**: import domain shapes and the shared resolver/mutation/match owners. Do not duplicate parsing or URL policy in adapters or React. If live source contradicts a planned owner, update architecture/tests/tasks first.

**Re-plan Trigger**: a raw-preservation, config availability, authorization, runtime-owner or input/output contract assumption is disproved by source or executed evidence.

**Verify**:

```bash
bun run test:e2e -- tests/e2e/quick-search/external-references.spec.ts --project=chromium
bun run test:e2e -- tests/e2e/ticket/external-references.spec.ts tests/e2e/quick-search/external-references.spec.ts tests/e2e/board/drag-drop.spec.ts --project=chromium
bun run validate:ts
bun run build:all
bun run --cwd cli build
```

**Observe**: the Playwright command above exercises actual isolated files/config/API and browser-visible behavior for this milestone; do not replace it with a mocked API probe.

**Done when**:

- [x] Declared feature checks demonstrate RED to GREEN; existing local-key/drag behavior remains GREEN.
- [x] Exact commands pass and the observable journey matches the owning requirements.
- [x] Actual create/modify/delete paths match intent; no competing runtime owner.
- [x] Unknown/absent configuration and stored-ref preservation remain intact.

## Final verification and review

Run deterministic mdt-verify completion with the sealed task plans, then the independent verify-complete contract through the Codex teammate. Fix in-scope findings, revalidate affected evidence and obtain PASS. Reconcile delivered docs and style guide, commit exact task paths, then use the already-authorized Implemented transition. No completion language or status change before required acceptance and independent review pass.


## Scope correction during Task 1

Live REST create input uses an explicit pick in server/http/ticketSchemas.ts; refs must be included there before reaching the already-planned server adapter. Added this concrete boundary artifact to Architecture and TASK-1, revalidated all trace stages and amended the verification plan. Existing immutable pre-feature RED observations use unchanged commands/tests and baseline commit; no product semantics changed.

The domain build exposed independent exact type snapshots for create/config output. TASK-1 updates only their expected optional refs/trackers fields while preserving all equality assertions. The new fields are already required by the approved contracts; this is not an assertion relaxation.

Task 2 inventory correction: structured CLI get/list uses an explicit projection in cli/src/output/structured.ts. It must include refs without normalizing them; the shared parser remains the owner. Canonical artifact/obligation/task ownership now includes this adapter.

Existing Quick Search regression assertions follow the intentional ordinary-list/ranked-results structure: selection uses data-selected/native buttons, both ticket result variants remain discoverable, and own-project identities appear exactly once in server order. Numeric local substrings remain supported. Assertions for navigation, limits, deduplication and scope behavior remain.

Required type gate repairs are limited to completing existing server fixture shapes and excluding documented local scratch from tracked root tooling; no assertions are removed or loosened. See architecture reconciliation.

The same required-check repair includes mcp-server/src/tools/handlers/__tests__/create-diagnostics.test.ts: provide the already-required type on its existing create operand, preserving every diagnostic assertion. The server project fixture supplies all existing ProjectRuntimeFields, not a cast.

Keyboard audit correction: preserve input-only Tab scope cycling, add scoped F6 to the selected primary result, native Tab traversal among result controls, and Shift+F6 to the input without resetting query/scope. Visible and input-described hints document this path; physical-keyboard E2E replaces programmatic action entry.

Final boundary review corrections: affected-ticket metadata SSE must be followed by canonical dataLayer.fetchTicket so absent/add/replace/clear updates raw refs and derived URLs without reload. useProjectManager owns this refetch and project-switch guard; the watcher gains no URL policy. MCP attributes/metadata JSON must serialize structured refs unchanged even when MCP_SECURITY_SANITIZATION=true, retaining existing per-field sanitization. Handler-level enabled/disabled JSON round-trips and a browser live-write journey prove these boundaries.

The same live-update correction invalidates the existing five-minute cross-project response cache on local ticket create/update/delete events and refreshes an active query. Request versions/cache epochs prevent pre-invalidation responses from repopulating stale URLs. New input cancels its prior debounce; cancel clears the active request. Existing TTL, scope and retry behavior remain; no polling or external tracker calls are added.

Delayed-response guards extend to both boundaries: dataLayer.searchProjects accepts a local caller generation in its dedupe key (not the HTTP payload). The hook supplies a useId namespace plus cache epoch, so invalidated requests cannot reuse old in-flight HTTP promises, while equivalent same-generation requests still dedupe. useProjectManager compares a selection-generation ref, incremented on committed project identity transitions, alongside per-ticket versions to reject A→B→A stale completions. Browser tests hold actual HTTP response bodies to verify both races.
