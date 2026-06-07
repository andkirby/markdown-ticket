# Assessment: MDT-179

## Verdict

**Recommendation**: Option 2 — Redesign Inline

The scoped global search feature requires bounded architecture adjustment inside the same CR. The existing QuickSearch system is well-structured with clean query-mode parsing, but it is currently ticket-only. Adding project and document result types, visible scope controls, and grouped results requires redesigning the search pipeline (query classification, result rendering, keyboard navigation) while preserving the existing ticket search behavior.

## Feature Pressure

### Target Feature Needs
- A unified search entry point (Cmd+K) that can return results across three entity types: projects, tickets, and documents.
- A visible scope model allowing users to narrow search to one entity type or search globally across all.
- Separate, labeled result groups in the UI for each entity type.
- Project search by code, title/name, and partial word prefixes (e.g., "task ma" → "Task Manager").
- Visible scope indicator and discoverable controls for switching scope (not hidden shortcuts only).
- Keyboard navigation across grouped result sections.
- Future extensibility for document content search within the same interaction model.

### Current System Assumptions
- QuickSearch (QuickSearchModal) is ticket-only: it filters a pre-loaded `Ticket[]` array from the current project.
- Cross-project search (`useCrossProjectSearch`) exists but is limited to ticket_key and project_scope modes via backend `POST /api/projects/search`.
- Query mode parsing (`parseQueryMode`) classifies input into three modes: `current_project`, `ticket_key`, `project_scope` — all ticket-oriented.
- `SearchMode` in domain-contracts has only `TICKET_KEY` and `PROJECT_SCOPE`.
- `SearchResponse` returns only `{ ticket, project }` result items.
- The `QuickSearchResults` component renders ticket results with cross-project results but has no concept of entity-type grouping or project/document result rows.
- `QuickSearchInput` has a mode indicator but no scope selector UI.
- `ProjectBrowserPanel` provides a separate, independent project browsing surface with its own search input — no integration with quick search.
- `useGlobalKeyboard` only triggers quick search open on Cmd+K.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | QuickSearch components are ticket-only in structure. Adding project and document results requires new result-type components and a unified result model, but the owning module (QuickSearch/) is clearly bounded. |
| Extension Fit | Healthy | The query-mode parsing, SearchRequest/SearchResponse schemas, and useCrossProjectSearch hook provide clean insertion points. The discriminated-union pattern for SearchRequest can be extended with new modes. |
| Dependency Fit | Healthy | No new packages, runtime changes, or tooling required. Project data is already loaded on the frontend (projects list). Document data is accessible via existing DocumentService. |
| Verification Fit | Concerning | Existing tests cover useQuickSearch, useCrossProjectSearch, and QuickSearchResults. New entity types and scope behavior will need new test fixtures. No preservation tests exist for grouped keyboard navigation. |
| Redesign Scope | Concerning | Redesign is bounded to the QuickSearch module and domain-contracts search types. The search pipeline (parse → classify → fetch → render) needs restructuring but stays within the same bounded area. |

## Mismatch Points

### Query Mode Classification
- Current system assumes: all queries are ticket-oriented (current_project, ticket_key, project_scope).
- Feature needs: query classification that can distinguish project search, document search, and global search from ticket search.
- Mismatch: `parseQueryMode` and `QueryMode` type are ticket-only. Adding project/document/global modes changes the classification contract.
- Adjustment required: Extend `QueryMode` union to include `global`, `projects`, `documents` modes. Update `parseQueryMode` to detect scope prefixes or default to global. Update `SearchMode` in domain-contracts.
- Scope: bounded — changes to `useQuickSearch.ts`, `domain-contracts/src/ticket/search.ts`, and `QuickSearchModal.tsx`.

### SearchResponse Schema
- Current system assumes: results contain only `{ ticket, project }` pairs (ticket results with their owning project).
- Feature needs: results that can represent projects (with code, name, description), documents (with title, path, project), and tickets, in a single response model.
- Mismatch: `SearchResponseSchema` is hardcoded to ticket results.
- Adjustment required: Generalize `SearchResponse` to support discriminated result types, or create a new unified search endpoint that returns typed result groups. The existing `POST /api/projects/search` can remain for backward compatibility.
- Scope: bounded — new/extended schema in domain-contracts, new server endpoint or extended controller method.

### Result Rendering
- Current system assumes: flat list of ticket results with an optional cross-project section.
- Feature needs: labeled, grouped result sections (Projects, Tickets, Documents) with distinct visual treatment per type.
- Mismatch: `QuickSearchResults` renders ticket rows and cross-project ticket rows. No project-row or document-row components exist.
- Adjustment required: Create result row components for each entity type. Add group headers. Modify selection/index logic to handle multi-section grouped results.
- Scope: bounded — changes to `QuickSearchResults.tsx` and new sub-components.

### Keyboard Navigation
- Current system assumes: linear index across at most two sections (cross-project tickets, current-project tickets).
- Feature needs: predictable keyboard navigation across 3+ grouped sections with different entity types, plus scope-switching controls.
- Mismatch: `handleKeyDown` in `QuickSearchModal` uses section-boundary arrays for Tab-jumping, but only handles two sections. Scope switching via keyboard needs new key bindings.
- Adjustment required: Generalize keyboard navigation for N sections. Add scope-switch key handlers (e.g., arrow keys in scope bar, or Tab cycling through scope tabs).
- Scope: bounded — changes to `QuickSearchModal.tsx` keyboard handler.

### Scope Controls UI
- Current system assumes: no explicit scope control in the search modal. Mode is auto-detected from query syntax.
- Feature needs: visible scope indicator and controls (tabs, buttons, or dropdown) for switching between Global, Tickets, Projects, Documents.
- Mismatch: `QuickSearchInput` shows a passive mode label but has no interactive scope selector.
- Adjustment required: Add a scope control bar (tab strip or button group) to `QuickSearchInput` or as a separate component above/below the input. Scope selection affects query classification and result filtering.
- Scope: bounded — new UI component, integration with `QuickSearchModal`.

### Project Data Availability
- Current system assumes: project list is loaded separately for ProjectBrowserPanel.
- Feature needs: project list available in QuickSearch for client-side project filtering/scoring.
- Mismatch: `QuickSearchModal` already receives a `projects` prop (used for project-code validation). Project data is available but not used for project search.
- Adjustment required: Use the existing `projects` prop for client-side project search (partial name matching). Optionally add a backend project-search endpoint for larger project sets.
- Scope: local — use existing data, add matching logic.

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none
- Testing/E2E impact: new test fixtures for project and document result types. Existing test files (`useQuickSearch.test.ts`, `useCrossProjectSearch.test.ts`, `QuickSearchResults` tests) need extension. No test harness changes.
- Main risk introduced: SearchResponse schema change could break existing cross-project search consumers (MCP tools, CLI). The schema must be extended in a backward-compatible way or a new endpoint/schema must be created alongside the existing one.

## Verification Gaps

- Preservation tests needed: existing ticket search behavior (current_project mode, ticket_key mode, project_scope mode) must be locked with automated tests before the search pipeline is restructured. The existing `useQuickSearch.test.ts` and `useCrossProjectSearch.test.ts` provide partial coverage but do not cover the full modal interaction flow.
- E2E/contract drift risks: the `POST /api/projects/search` contract is used by the frontend and potentially by MCP tools. Changing `SearchResponse` schema may break MCP consumers. A separate unified search endpoint avoids this.
- Safe-to-refactor now?: yes, with caveats. Existing unit tests provide a safety net for the query parsing and filtering logic. The modal-level integration is only tested manually. Adding a few integration tests for the modal's scope-switching and grouped rendering before starting implementation would reduce risk.

## Recommendation

### Option 1: Integrate As-Is
Use when: the existing architecture can absorb the feature with only local implementation work.
Assessment: Not appropriate. The search pipeline (query modes, response schema, result rendering) needs structural changes across multiple files in the QuickSearch module and domain-contracts.

### Option 2: Redesign Inline
Use when: current structure is a poor fit in one bounded area and redesign is localized to the current CR.
Architecture must redesign:
1. **Query classification**: Extend `QueryMode` from 3 ticket modes to 5+ modes (global, projects, documents, tickets, plus existing ticket_key and project_scope for backward compat).
2. **Search response model**: Create a new `UnifiedSearchResponse` schema supporting typed result groups, keeping existing `SearchResponse` intact for backward compatibility.
3. **Result rendering**: Restructure `QuickSearchResults` to render grouped sections with per-type row components.
4. **Scope controls**: Add visible scope selector UI (tab bar or button group) to the search modal.
5. **Keyboard navigation**: Arrow keys traverse all results across N sections. Tab cycles scope tabs (All→Tickets→Projects→Documents).
6. **Project search logic**: Add client-side project matching (code, name, partial word prefixes) using the already-available `projects` prop.

Expected scope added: medium — bounded to QuickSearch module (4-5 files), domain-contracts (1-2 new schemas), and server (1 new endpoint or controller method). No changes to routing, state management, or other modules.

### Option 3: Redesign First
Use when: the feature does not fit without distorting multiple boundaries.
Assessment: Not needed. The mismatch is real but contained within the QuickSearch bounded context. No systemic redesign of the application architecture is required. The project data layer, document service, and routing remain unchanged.
