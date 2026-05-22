# Tasks: MDT-175

> Canonical task projection: [tasks.trace.md](./tasks.trace.md)

## Task 1: Add shared page title owner

**Skills**: frontend-react-component

**Structure**: `src/hooks/usePageTitle.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-page-title-formatting` -> `src/hooks/usePageTitle.test.ts`: root view, ticket, ticket subcontext, document, empty-source, and cleanup behavior

**Scope**: Create the single frontend title formatting and write owner.
**Boundary**: No route, ticket, or document behavior changes in this task.

**Creates**:
- `src/hooks/usePageTitle.ts`
- `src/hooks/usePageTitle.test.ts`

**Modifies**:
- `index.html`

**Must Not Touch**:
- `server/`
- `mcp-server/`
- `cli/`
- `shared/`
- `domain-contracts/`

**Create/Move**:
- Add formatter for root project views, ticket main document, ticket subdocument/subtab, project document, loading, and fallback contexts.
- Normalize whitespace and omit empty title parts.
- Do not add a user-configurable title-format setting.
- Add effect that writes `document.title` and handles cleanup.

**Exclude**: no backend metadata, no persistence, no route restructuring.

**Anti-duplication**: Import the shared title formatter/hook wherever titles are needed; do not write direct `document.title` effects in multiple components.

**Duplication Guard**:
- Check the codebase for existing `document.title` writers before coding.
- If another runtime owner exists, merge into the new title owner before adding integrations.
- Verify no second runtime owner was introduced.

**Verify**:

```bash
bun test src/hooks/usePageTitle.test.ts
```

**Done when**:
- [ ] Unit tests GREEN.
- [ ] Empty or malformed source values cannot produce a blank browser title.
- [ ] Title strings normalize whitespace and omit empty parts.
- [ ] Root views format as `{PROJECT_CODE} Board`, `{PROJECT_CODE} Listing`, and `{PROJECT_CODE} Documents`.
- [ ] Ticket contexts format as `{TICKET_CODE} - {ticket H1/title}` with optional active subcontext suffix.
- [ ] Project documents format as `{PROJECT_CODE} - {document H1/title/name}`.
- [ ] No title-format Settings item is added.
- [ ] No visible UI elements or layout changes are added.
- [ ] No duplicated title writer exists.

## Task 2: Wire project route title context

**Skills**: frontend-react-component

**Milestone**: M1 - Project view title context (`BR-1.1`, `BR-1.5`, `BR-1.6`)

**Structure**: `src/App.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-project-view-title-context` -> `src/App.pageTitle.test.tsx`: board/listing/documents root, modal, and project switch title behavior

**Makes GREEN (Behavior)**:
- `project_view_title_reflects_context` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.1`)
- `modal_context_avoids_stale_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.5`)
- `project_switch_updates_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.6`)

**Scope**: Connect `ProjectRouteHandler` route, project, view mode, loading, and settings modal state to the shared title owner.
**Boundary**: Do not change route matching, project selection, or view-mode persistence.

**Creates**:
- `src/App.pageTitle.test.tsx`

**Modifies**:
- `src/App.tsx`
- `src/components/ProjectView.tsx`

**Must Not Touch**:
- `server/`
- `mcp-server/`
- document data services
- ticket data services

**Create/Move**:
- Derive base title input from `selectedProject`, `projectCode`, and `viewMode`.
- Format root titles as `{PROJECT_CODE} Board`, `{PROJECT_CODE} Listing`, and `{PROJECT_CODE} Documents`.
- Keep settings/modal title behavior from leaving stale content context.
- Fall back to a truthful parent or app title while project context is loading or failed.
- Preserve existing `lastBoardListMode` and route behavior.

**Exclude**: no URL redesign, no project selector redesign.

**Anti-duplication**: Use `usePageTitle` from `src/hooks/usePageTitle.ts`; do not inline formatter logic in `App.tsx`.

**Duplication Guard**:
- Check `ProjectRouteHandler` for existing route-derived labels before adding new labels.
- If project display labels already exist, reuse them instead of creating parallel formatting.
- Verify no title code bypasses the shared owner.

**Verify**:

```bash
bun test src/App.pageTitle.test.tsx
```

**Done when**:
- [ ] Project board/listing/documents root titles update.
- [ ] Settings open/close does not leave stale content title.
- [ ] Project switch updates title.
- [ ] Loading or failed project context does not retain stale content title.
- [ ] Existing navigation behavior is unchanged.

## Task 3: Wire ticket title context

**Skills**: frontend-react-component

**Milestone**: M2 - Ticket title context (`BR-1.2`, `BR-1.4`)

**Structure**: `src/components/TicketViewer/index.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-title-context` -> `src/components/TicketViewer/TicketViewer.test.tsx`: main ticket, subdocument/subtab, close, missing, unavailable, and rapid ticket title behavior

**Makes GREEN (Behavior)**:
- `ticket_title_reflects_active_ticket` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.2`)
- `ticket_subcontext_title_reflects_active_subdocument` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.7`)
- `closing_content_restores_parent_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.4`)

**Scope**: Let an open ticket provide title context while the ticket viewer is active.
**Boundary**: Do not change ticket fetching, subdocument navigation, trace graph behavior, or modal layout.

**Creates**:
- none

**Modifies**:
- `src/components/TicketViewer/index.tsx`
- `src/components/TicketViewer/TicketViewer.test.tsx`

**Must Not Touch**:
- `server/services/TicketService.ts`
- `server/routes/projects.ts`
- `mcp-server/`
- ticket markdown parsing code

**Create/Move**:
- Use current ticket code plus ticket H1/title as the main ticket title source.
- Append the active subdocument or special subtab label when it changes the active ticket context.
- Clear ticket title ownership when closed or when ticket error, loading, failed, or missing state requires fallback.
- Preserve parent view restoration from route context.

**Exclude**: no ticket data model changes, no markdown renderer changes.

**Anti-duplication**: Ticket viewer should supply title input to shared title owner, not write `document.title` directly.

**Duplication Guard**:
- Check TicketViewer effects before adding another effect.
- If route-level title ownership already handles ticket context after Task 2, extend that path instead of adding a second owner.
- Verify missing ticket errors do not keep prior ticket title.

**Verify**:

```bash
bun test src/components/TicketViewer/TicketViewer.test.tsx
```

**Done when**:
- [ ] Open ticket title contains ticket code plus ticket H1/title.
- [ ] Ticket subdocument or special subtab title appends the active label.
- [ ] Close restores parent view title.
- [ ] Missing, loading, or failed ticket state is truthful.
- [ ] Subdocument and trace graph behavior are unchanged.

## Task 4: Wire document title context

**Skills**: frontend-react-component

**Milestone**: M3 - Document title context (`BR-1.3`, `BR-1.4`)

**Structure**: `src/components/DocumentsView/DocumentsLayout.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-document-title-context` -> `src/components/DocumentsView/DocumentsLayout.test.tsx`: selected, unselected, missing, deleted, and rapid document title behavior

**Makes GREEN (Behavior)**:
- `document_title_reflects_active_document` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.3`)
- `closing_content_restores_parent_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.4`)

**Scope**: Let selected document state provide title context while Documents View is active.
**Boundary**: Do not change document URL behavior, recent documents, favs, filename tabs, or file tree selection.

**Creates**:
- `src/components/DocumentsView/DocumentsLayout.test.tsx`

**Modifies**:
- `src/components/DocumentsView/DocumentsLayout.tsx`

**Must Not Touch**:
- `server/services/DocumentService.ts`
- `server/services/TreeService.ts`
- document fav persistence files
- markdown renderer internals

**Create/Move**:
- Resolve a display title from selected document metadata, filename, or path segment and prefix it with project code.
- Fall back to documents view title when no valid file is selected.
- Clear stale title when selected document is deleted, loading, failed, or invalid.

**Exclude**: no document discovery, path configuration, favs, or Recent behavior changes.

**Anti-duplication**: Reuse existing selected-file metadata and shared title owner; do not add another document labeling utility unless it replaces duplication.

**Duplication Guard**:
- Check `RecentDocuments`, `FileTree`, and filename tab label logic for reusable display names.
- If label logic already exists, import or extract it instead of copying.
- Verify no direct `document.title` writes are added outside the shared owner.

**Verify**:

```bash
bun test src/components/DocumentsView/DocumentsLayout.test.tsx
```

**Done when**:
- [ ] Selected document title uses project code plus document H1/title/name.
- [ ] Unselected documents view restores parent title.
- [ ] Deleted, loading, failed, or unavailable document cannot keep stale title.
- [ ] Document navigation behavior is unchanged.

## Task 5: Add browser title E2E coverage

**Skills**: playwright-skill

**Milestone**: M4 - Browser history title proof (`BR-1.1` through `BR-1.6`)

**Structure**: `tests/e2e/navigation/page-title.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-page-title-e2e` -> `tests/e2e/navigation/page-title.spec.ts`: browser-level title flow coverage

**Makes GREEN (Behavior)**:
- `project_view_title_reflects_context` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.1`)
- `ticket_title_reflects_active_ticket` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.2`)
- `document_title_reflects_active_document` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.3`)
- `closing_content_restores_parent_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.4`)
- `modal_context_avoids_stale_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.5`)
- `project_switch_updates_title` -> `tests/e2e/navigation/page-title.spec.ts` (`BR-1.6`)

**Scope**: Add Playwright assertions for observable `page.title()` changes across primary flows.
**Boundary**: Do not make E2E depend on exact punctuation if unit tests cover formatting.

**Creates**:
- `tests/e2e/navigation/page-title.spec.ts`

**Modifies**:
- none

**Must Not Touch**:
- app runtime code outside tasks 1-4
- server test setup
- project factory internals unless a stable helper already exists

**Create/Move**:
- Build an isolated scenario with tickets and documents.
- Assert titles for board, listing, documents root, ticket, ticket subdocument/subtab, document, settings open/close, and project switch.
- Assert fallback titles for loading, missing, or failed active context where practical.
- Assert URL and main visible surfaces still work.

**Exclude**: no screenshot-only assertions, no brittle exact separator checks unless formatter contract requires it.

**Anti-duplication**: Reuse existing E2E helpers from `tests/e2e/utils/helpers.ts` and selectors from `tests/e2e/utils/selectors.ts`.

**Duplication Guard**:
- Check existing navigation and ticket E2E specs before adding new helpers.
- If helper exists, import it instead of copying setup code.
- Verify spec does not duplicate full ticket/detail coverage beyond title assertions.

**Verify**:

```bash
bunx playwright test tests/e2e/navigation/page-title.spec.ts --project=chromium
```

**Done when**:
- [ ] E2E title assertions pass.
- [ ] Project root, ticket, ticket subcontext, document, close, modal, and project switch flows are covered.
- [ ] Loading/fallback title flows are covered where practical.
- [ ] No visible UI clutter or layout change is introduced.
- [ ] No existing navigation behavior regresses.

## Task 6: Run validation and guard navigation preservation

**Skills**: frontend-react-component, playwright-skill

**Structure**: test and trace artifacts

**Makes GREEN (Automated Tests)**:
- `TEST-page-title-formatting` -> `src/hooks/usePageTitle.test.ts`
- `TEST-project-view-title-context` -> `src/App.pageTitle.test.tsx`
- `TEST-ticket-title-context` -> `src/components/TicketViewer/TicketViewer.test.tsx`
- `TEST-document-title-context` -> `src/components/DocumentsView/DocumentsLayout.test.tsx`
- `TEST-page-title-e2e` -> `tests/e2e/navigation/page-title.spec.ts`

**Scope**: Run focused checks and update task status only after verification.
**Boundary**: Do not expand scope into unrelated navigation or metadata cleanup.

**Creates**:
- none

**Modifies**:
- `docs/CRs/MDT-175/.tasks-status.yaml`

**Must Not Touch**:
- unrelated CR artifacts
- production backend files
- MCP/CLI packages

**Create/Move**:
- Run focused unit and E2E checks.
- Run TypeScript validation for changed files.
- Run `spec-trace validate MDT-175 --stage all`.

**Exclude**: no unrelated lint cleanup.

**Anti-duplication**: Use existing validation commands from project docs and this CR; do not invent new runners.

**Duplication Guard**:
- Confirm no second title writer exists with `rg \"document\\.title\" src`.
- Confirm no duplicate page-title E2E helper was added.
- Confirm title fallback remains centralized.

**Verify**:

```bash
bun run validate:ts
bun test src/hooks/usePageTitle.test.ts src/App.pageTitle.test.tsx src/components/TicketViewer/TicketViewer.test.tsx src/components/DocumentsView/DocumentsLayout.test.tsx
bunx playwright test tests/e2e/navigation/page-title.spec.ts --project=chromium
spec-trace validate MDT-175 --stage all
```

**Done when**:
- [ ] Focused unit tests GREEN.
- [ ] Focused E2E GREEN.
- [ ] TypeScript validation GREEN.
- [ ] Trace validation GREEN.
- [ ] No duplicated title writer exists.
