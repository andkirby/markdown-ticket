---
code: MDT-179
status: Implemented
dateCreated: 2026-06-05T14:56:43.971Z
type: Feature Enhancement
priority: Medium
---

# Add scoped global search

## 1. Description

### Requirements Scope
`full` — complete outcome requirements for search scope behavior.

### Problem
- Users need to find projects by natural partial names such as `task ma` or `task manager` without visually browsing the project list.
- Current quick search behavior is ticket-oriented, so project and future document results could become confusing if mixed into one undifferentiated list.
- Search is expected to expand beyond ticket key/title matching into project lookup, document lookup, and ticket content search.

### Affected Areas
- Frontend: command palette search experience, project navigation, document navigation.
- Search behavior: ticket title/key search, future ticket content search, project search, document search.
- UX documentation: search scopes, keyboard behavior, result grouping, and prefix behavior.

### Scope
- In scope:
  - A visible scoped search model for quick search.
  - Separate result groups for projects, tickets, and documents when global search is active.
  - Project search by project code, title/name, and meaningful partial word prefixes.
  - Explicit user controls for switching search scope.
  - Optional semantic prefixes for power users.
  - Rules that prevent project, ticket, and document results from appearing as one ambiguous result type.
- Out of scope:
  - Choosing a specific indexing or backend search implementation.
  - Replacing the existing project browser surface.
  - Full implementation of document content search if architecture decides it belongs in a later CR.
  - Search history, saved searches, and personalized ranking.

## 2. Desired Outcome

### Success Conditions
- Users can press the existing quick-search shortcut and search across supported entity types from one entry point.
- Users can type a natural partial project query and see matching projects as project results, not ticket results.
- Users can distinguish project results from ticket and document results before selecting anything.
- Users can narrow search scope to projects, tickets, or documents without learning hidden shortcut sequences.
- Existing project-scoped ticket search using project code syntax remains understandable and does not conflict with project lookup.
- Future document search can fit into the same scoped-search model without redesigning the command palette again.

### Constraints
- Must preserve the existing quick-search shortcut as the primary keyboard entry point.
- Must keep result types visually and semantically separate.
- Must preserve existing ticket key and project-scoped ticket search behavior unless explicitly migrated through the design workflow.
- Must provide a visible mode/scope indicator when scope changes.
- Must keep keyboard navigation predictable for grouped results.
- Must respect existing project visibility and access boundaries.

### Non-Goals
- Not adding a second primary global hotkey for project search.
- Not relying on repeated shortcut presses as the only way to change search mode.
- Not making project search depend on exact project code knowledge.
- Not exposing hidden or private project names through global search.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| UX | Should the default mode be global grouped search or ticket-first search with project suggestions? | Must not bury strong project matches behind ticket results. |
| UX | Which visible scope controls should be offered? | Must be discoverable without relying on hidden shortcuts. |
| Syntax | Which semantic prefixes should be supported for projects, tickets, and documents? | Prefixes must not conflict with existing project-scoped ticket search. |
| Ranking | When should project matches appear above tickets? | Natural partial name matches must make project switching efficient. |
| Documents | Should document search include title/path only first, or content from the start? | Future content search must fit the same grouped result model. |
| Tickets | Should ticket content search be merged into ticket results or presented as a separate match subtype? | Users must understand whether a match is from title/key or content. |
| Access | How should read-only and token-scoped sessions constrain global search results? | Search must reflect only projects and documents visible to the current session. |

### Known Constraints
- Quick search is the existing keyboard entry point for ticket discovery.
- Project browser already provides a visual project list with project-only filtering.
- Project-scoped ticket search already uses project code syntax.
- Access-controlled sessions must not reveal unavailable project names, documents, or tickets.

### Decisions Deferred
- Implementation approach is determined by `mdt:architecture`.
- Data loading and indexing strategy is determined by `mdt:architecture`.
- Exact result row components and keyboard handler changes are determined by `mdt:architecture` and `mdt:tasks`.
- Test structure and fixture strategy are determined by `mdt:tests`.

## 4. Acceptance Criteria

### Functional
- [ ] Quick search exposes visible search scopes for global, tickets, projects, and documents.
- [ ] Users can switch scope using visible UI controls.
- [ ] Keyboard users can switch scope without using a pointer.
- [ ] Repeated quick-search shortcut activation may cycle scopes only if the active scope is visibly shown.
- [ ] Global search presents projects, tickets, and documents in separate labeled groups.
- [ ] Project results are visually distinct from ticket and document results.
- [ ] Selecting a project result switches to that project.
- [ ] Typing a partial project name such as `task ma` can match a project named `Task Manager`.
- [ ] Exact ticket-key queries continue to prioritize ticket lookup.
- [ ] Project-scoped ticket search remains unambiguous when a user searches tickets within a selected project scope.
- [ ] Document results can be added without changing the scoped-search interaction model.
- [ ] Empty states clarify the active scope and do not imply that other scopes were searched when they were not.

### Non-Functional
- [ ] Search mode changes do not cause layout jumps in the command palette.
- [ ] Result grouping remains readable on mobile and desktop viewports.
- [ ] Keyboard focus remains inside the command palette while it is open.
- [ ] Search does not reveal entities unavailable to the current access mode.

### Edge Cases
- [ ] Queries that match both a project name and ticket title show separate project and ticket results.
- [ ] Queries that match only hidden or inaccessible projects do not expose those project names.
- [ ] Invalid project-code syntax does not block project name lookup in the project scope.
- [ ] No-results states distinguish between no project matches, no ticket matches, and no document matches.
- [ ] Switching scope preserves or clears the query according to a visible, predictable rule.

## 5. Verification

### How to Verify Success
- Manual: Search for a partial project name and verify a project result appears as a project result.
- Manual: Search for a term that matches both a project and a ticket and verify grouped results are not ambiguous.
- Manual: Switch between search scopes using keyboard controls.
- Manual: Verify exact ticket-key search still opens the expected ticket result.
- Manual: Verify project-scoped ticket search remains understandable after project search is added.
- Automated: Test query classification for ticket, project, document, and global modes.
- Automated: Test grouped result rendering and keyboard selection behavior.
- Automated: Test access-limited sessions do not receive inaccessible project, ticket, or document results.

## 6. Technical Debt

| ID | Description | Impact | Priority |
|----|-------------|--------|----------|
| TD-1 | **Documents scope tab hidden** — `SearchScope.DOCUMENTS` exists in the type system and `DocumentResultRow` component is built, but no backend document search endpoint or document matching logic is implemented. The Documents tab is hidden via `VISIBLE_SCOPES` filter in `SearchScopeBar.tsx` and `cycleableScopes` in `QuickSearchModal.tsx`. To complete: add `/api/search` document query support, implement `useDocumentSearch` hook, and unhide the tab. | Users cannot search documents from quick search. All other scopes work. | Medium |
| TD-2 | **useQuickSearch internal clamp removed** — The `useMemo` that clamped `selectedIndex` to `filteredTickets.length - 1` was removed because the modal now manages multi-section navigation. If `useQuickSearch` is ever used outside `QuickSearchModal`, selection index may exceed ticket count. | Low risk — only used in QuickSearchModal. | Low |

> Requirements trace projection: [requirements.trace.md](./MDT-179/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-179/requirements.md)
>
> Assessment: [assess.md](./MDT-179/assess.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-179/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-179/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-179/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-179/architecture.md)
>
> Tests trace: [tests.trace.md](./MDT-179/tests.trace.md)
>
> Tests notes: [tests.md](./MDT-179/tests.md)
>
> Tasks trace: [tasks.trace.md](./MDT-179/tasks.trace.md)
>
> Tasks: [tasks.md](./MDT-179/tasks.md)