# Tasks: MDT-169

## Milestones

| Milestone | Goal | Checkpoint |
|---|---|---|
| M0 | Runner and file-path readiness | Missing architecture files have owned creation tasks; test runners are callable. |
| M1 | Neutral namespace parsing | `TEST-shared-filename-namespace` and `TEST-ticket-namespace-adapter` are GREEN. |
| M2 | Documents resolver and UI integration | Resolver and component tests are GREEN; active identity remains a physical markdown path. |
| M3 | Browser acceptance | All BDD scenarios and content-safety tests are GREEN. |

### Task 0: Create missing filename-tab module shells and verify runners

**Milestone**: M0 - Runner and file-path readiness

**Structure**: `shared/services/filenameNamespace.ts`, `src/components/DocumentsView/documentFilenameTabModel.ts`, `src/components/DocumentsView/DocumentFilenameTabs.tsx`

**Makes GREEN (Automated Tests)**:
- None. This task only creates missing module entry points and verifies runners are available.

**Scope**: Add minimal module shells for architecture paths that do not exist yet, with exports shaped for the later implementation tasks.
**Boundary**: Do not implement grouping behavior here beyond compile-safe placeholders.

**Creates**:
- `shared/services/filenameNamespace.ts`
- `src/components/DocumentsView/documentFilenameTabModel.ts`
- `src/components/DocumentsView/DocumentFilenameTabs.tsx`

**Modifies**:
- None

**Must Not Touch**:
- `server/services/DocumentService.ts`
- `src/components/TicketDetail/**`
- `shared/services/ticket/subdocuments/**`
- document tree discovery code

**Create/Move**:
- Create only the missing files listed above.

**Exclude**: No package installation, no route changes, no backend API changes, no file moves.

**Anti-duplication**: Do not copy MDT-138 `TicketDocumentTabs` or ticket virtual-folder code. Later tasks extract/adapt only neutral filename parser/sorter semantics.

**Duplication Guard**:
- Check whether each target module exists before creating it.
- If a neutral filename parser already exists under another shared path, stop and add a merge/refactor task before creating a new owner.
- Verify no second runtime owner for document tree discovery or ticket subdocument tabs was introduced.

**Verify**:

```bash
bun run --cwd shared jest tests/services/filenameNamespace.test.ts tests/services/ticket/namespace.test.ts --runInBand
bun test ./src
bun run --cwd server jest tests/api/documents.test.ts --runInBand
bunx playwright test tests/e2e/documents/filename-tabs.spec.ts --project=chromium
```

**Done when**:
- [x] Missing files exist.
- [x] Verify commands fail only for expected RED feature assertions, not "command not found" or "module not found".
- [x] No duplicated grouping owner was introduced.

### Task 1: Extract neutral filename namespace parser and adapt ticket subdocuments

**Skills**: `mdt-frontend`

**Milestone**: M1 - Neutral namespace parsing

**Structure**: `shared/services/filenameNamespace.ts`, `shared/services/ticket/subdocuments/namespace.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-shared-filename-namespace` -> `shared/tests/services/filenameNamespace.test.ts`: `Shared filename namespace parser preserves first-dot variant semantics and numeric-aware sorting`
- `TEST-ticket-namespace-adapter` -> `shared/tests/services/ticket/namespace.test.ts`: `Ticket subdocument namespace adapter stays aligned with shared filename parsing`

**Scope**: Implement a neutral first-dot parser and alphanumeric/numeric-aware sorter, then adapt ticket subdocument namespace code to import it.
**Boundary**: Reuse means neutral parser/sorter extraction only. Do not reuse ticket virtual folders, `TicketDocumentTabs`, or ticket-specific models in the Documents view.

**Creates**:
- `shared/services/filenameNamespace.ts`

**Modifies**:
- `shared/tests/services/filenameNamespace.test.ts`
- `shared/services/ticket/subdocuments/namespace.ts`
- `shared/tests/services/ticket/namespace.test.ts`

**Must Not Touch**:
- `src/components/DocumentsView/**`
- `src/components/TicketDetail/**`
- `server/services/DocumentService.ts`
- `tests/e2e/**`

**Create/Move**:
- Export parser/sorter names from the neutral shared module.
- Update the ticket namespace adapter to call the neutral helper.

**Exclude**: No Documents view grouping resolver, no UI tabs, no route/query behavior.

**Anti-duplication**: Import the neutral parser/sorter from `shared/services/filenameNamespace.ts`; do not copy first-dot split logic into ticket or Documents modules.

**Duplication Guard**:
- Check ticket subdocument namespace for existing split/sort logic before coding.
- If another shared parser exists, merge into one neutral owner before adding behavior.
- Verify no second parser remains in ticket subdocument code.

**Verify**:

```bash
bun run --cwd shared jest tests/services/filenameNamespace.test.ts tests/services/ticket/namespace.test.ts --runInBand
```

**Done when**:
- [x] Unit tests GREEN.
- [x] MDT-138 ticket subdocument namespace semantics still pass.
- [x] No duplicated parser/sorter logic remains.

### Task 2: Build Documents-view filename tab resolver model

**Skills**: `mdt-frontend`

**Milestone**: M2 - Documents resolver and UI integration

**Structure**: `src/components/DocumentsView/documentFilenameTabModel.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-filename-tabs-model` -> `src/components/DocumentsView/documentFilenameTabs.test.ts`: `Documents filename tab resolver groups markdown variants without changing physical files`

**Enables (BDD)**:
- `grouped_variants_show_as_tabs` (BR-1.1) - needs Tasks 3 and 4 to complete
- `document_tree_keeps_physical_files` (BR-1.3) - needs Task 4 to complete
- `ungrouped_document_opens_without_tabs` (BR-1.4) - needs Task 4 to complete
- `root_and_variants_remain_reachable` (BR-1.5) - needs Tasks 3 and 4 to complete
- `multi_dot_variant_key_is_preserved` (BR-1.6) - needs Tasks 3 and 4 to complete

**Scope**: Derive a Documents-view-specific grouped tab model from the loaded physical `DocumentFile` tree and active physical path.
**Boundary**: Keep the document tree physical and unchanged; grouping is a viewer model only.

**Creates**:
- `src/components/DocumentsView/documentFilenameTabModel.ts`

**Modifies**:
- `src/components/DocumentsView/documentFilenameTabs.test.ts`
- `src/components/DocumentsView/DocumentsLayout.tsx` only if needed to type-check resolver inputs without wiring UI

**Must Not Touch**:
- `src/components/TicketDetail/**`
- `shared/services/ticket/subdocuments/**`
- `server/services/DocumentService.ts`
- backend document discovery endpoints

**Create/Move**:
- Add resolver types for logical group, active tab, and tab item physical path.
- Add root `base.md` handling as tab key/label `main` when variants exist.
- Add lone dot-notation variant handling.

**Exclude**: No direct reuse of ticket SubDocument virtual folders, no `TicketDocumentTabs`, no mutation of tree nodes.

**Anti-duplication**: Import parser/sorter from `shared/services/filenameNamespace.ts`; keep only Documents-view resolution rules in `documentFilenameTabModel.ts`.

**Duplication Guard**:
- Check `DocumentsLayout` and existing document utilities for active-file grouping behavior before coding.
- If grouping already exists elsewhere, add a merge/refactor task immediately instead of adding a parallel resolver.
- Verify the resolver returns physical markdown paths and does not introduce virtual document paths.

**Verify**:

```bash
bun test src/components/DocumentsView/documentFilenameTabs.test.ts
```

**Done when**:
- [x] Unit tests GREEN.
- [x] Physical tree entries are not filtered or rewritten.
- [x] Root, lone variant, multi-dot variant, similar-prefix, and ungrouped cases are covered.

### Task 3: Integrate filename tabs with active physical document navigation

**Skills**: `mdt-frontend`

**Milestone**: M2 - Documents resolver and UI integration

**Structure**: `src/components/DocumentsView/DocumentFilenameTabs.tsx`, `src/components/DocumentsView/DocumentsLayout.tsx`, `src/components/DocumentsView/MarkdownViewer.tsx`, `src/components/DocumentsView/documents-view.css`, `src/components/shared/RelativeTimestamp.tsx`, `src/components/shared/relative-timestamp.css`, `src/config/documentNavigation.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-filename-tabs-component` -> `src/components/DocumentsView/DocumentFilenameTabs.test.tsx`: `Document filename tab component renders project tab UI and selects physical file paths`
- `TEST-document-metadata-presentation` -> `src/components/DocumentsView/MarkdownViewer.test.tsx`: `Document metadata timestamp uses shared floating presentation classes`

**Enables (BDD)**:
- `opening_tree_variant_selects_tab` (BR-1.2) - needs Task 4 to complete
- `switching_tabs_updates_active_document` (BR-1.7) - needs Task 4 to complete
- `grouped_variants_show_as_tabs` (BR-1.1) - needs Task 4 to complete

**Scope**: Render filename tabs in the Documents viewer, update `selectedFile` to the selected tab's physical markdown path, and reuse shared ticket-view timestamp presentation for document metadata.
**Boundary**: `MarkdownViewer` remains a one-file renderer; it must not know logical grouping rules.

**Creates**:
- `src/components/DocumentsView/DocumentFilenameTabs.tsx`
- `src/components/DocumentsView/DocumentFilenameTabs.test.tsx`

**Modifies**:
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `src/components/DocumentsView/MarkdownViewer.tsx`
- `src/components/DocumentsView/documents-view.css`
- `src/components/shared/RelativeTimestamp.tsx`
- `src/components/shared/relative-timestamp.css`
- `src/config/documentNavigation.ts`

**Must Not Touch**:
- `src/components/TicketDetail/**`
- `src/components/DocumentsView/DocumentTree.tsx` unless a test hook already exists and must be passed through
- `server/services/DocumentService.ts`
- `tests/e2e/documents/filename-tabs.spec.ts`

**Create/Move**:
- Add project tab UI markup using existing tab conventions/classes.
- Wire tab clicks to the active physical document path.
- Preserve URL/query, recents, metadata, and selected tree highlighting as physical file state.
- Reuse `RelativeTimestamp` and shared floating timestamp classes for created/updated metadata instead of adding a Documents-only timestamp row.

**Exclude**: No new route shape, no backend group endpoint, no virtual tree nodes, no document editing changes.

**Anti-duplication**: Import the Documents-view resolver from `src/components/DocumentsView/documentFilenameTabModel.ts`; do not reimplement grouping inside React components.

**Duplication Guard**:
- Check `DocumentsLayout` for existing selected-file ownership before adding state.
- If another component starts owning active physical file identity, merge that responsibility back into `DocumentsLayout`.
- Verify no tab component contains parser or tree-flattening logic.

**Verify**:

```bash
bun test src/components/DocumentsView/DocumentFilenameTabs.test.tsx src/components/DocumentsView/MarkdownViewer.test.tsx src/components/shared/RelativeTimestamp.test.tsx
```

**Done when**:
- [x] Component tests GREEN.
- [x] Tab labels and active state follow existing project tab UI conventions.
- [x] Selecting a tab selects a physical markdown file path.
- [x] `MarkdownViewer` still fetches one active physical file.
- [x] Document metadata timestamp shares the ticket-view `RelativeTimestamp` presentation and floating placement classes.

### Task 4: Lock content safety and browser acceptance for filename tabs

**Skills**: `mdt-frontend`, `playwright-cli`

**Milestone**: M3 - Browser acceptance

**Structure**: `server/services/DocumentService.ts`, `tests/e2e/documents/filename-tabs.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-content-path-safety` -> `server/tests/api/documents.test.ts`: `Document content endpoint rejects markdown files outside configured document paths`
- `TEST-documents-filename-tabs-e2e` -> `tests/e2e/documents/filename-tabs.spec.ts`: `Documents view filename tabs preserve tree files, native document SSE tab refresh, and active physical document navigation`

**Makes GREEN (Behavior)**:
- `grouped_variants_show_as_tabs` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.1)
- `opening_tree_variant_selects_tab` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.2)
- `document_tree_keeps_physical_files` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.3)
- `ungrouped_document_opens_without_tabs` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.4)
- `root_and_variants_remain_reachable` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.5)
- `multi_dot_variant_key_is_preserved` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.6)
- `switching_tabs_updates_active_document` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.7)
- `document_sse_updates_filename_tabs` -> `tests/e2e/documents/filename-tabs.spec.ts` (BR-1.8)

**Scope**: Tighten content path safety if needed and complete browser-level coverage for grouped tabs, physical tree preservation, native document SSE add/change/unlink tab refresh, active path URLs/recents/highlighting, deletion fallback, ungrouped behavior, and the C7 non-blocking render flow where the document tree and filename tabs render while active content fetch is still pending.
**Boundary**: Do not change `/api/documents` tree discovery output or ordering.

**Creates**:
- None

**Modifies**:
- `server/services/DocumentService.ts`
- `server/tests/api/documents.test.ts`
- `tests/e2e/documents/filename-tabs.spec.ts`
- `src/components/DocumentsView/DocumentsLayout.tsx` only for native document SSE reconciliation or deletion fallback defects found by E2E
- `src/config/documentNavigation.ts` only for active physical path URL/query defects found by E2E
- `src/components/DocumentsView/MarkdownViewer.tsx` only for metadata/content defects found by E2E

**Must Not Touch**:
- `src/components/TicketDetail/**`
- `shared/services/ticket/subdocuments/**`
- document tree discovery ordering logic
- files on disk outside isolated test fixtures

**Create/Move**:
- Add/finish E2E cases for grouped variants, tree selection, ungrouped docs, root plus variants, multi-dot labels, switching tabs, native document SSE add/change/unlink tab refresh, recents/query/highlighting, and removed active file fallback.
- Add/finish the C7 E2E case proving the document tree and filename tabs render while active content fetch is pending.
- Add/finish server safety assertions for configured document paths.

**Exclude**: No virtual folders, no tree hiding, no file renames/moves/merges, no non-markdown behavior changes.

**Anti-duplication**: Use the integrated Documents resolver and physical selected path from previous tasks; do not add a second browser-only grouping mechanism.

**Duplication Guard**:
- Check whether E2E helpers already create document fixtures before adding new helpers.
- If a second active-file URL/recents owner appears, merge back into the existing navigation path.
- Verify no backend grouping endpoint or duplicate resolver was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/documents.test.ts --runInBand
bunx playwright test tests/e2e/documents/filename-tabs.spec.ts --project=chromium
spec-trace validate MDT-169 --stage tasks
```

**Done when**:
- [x] Server safety tests GREEN.
- [x] BDD scenarios GREEN, including native document SSE refreshing filename tabs from the physical tree.
- [x] Document tree remains physical and unchanged.
- [x] Active URL/query, recents, metadata, and tree highlighting refer to the active physical markdown file.
- [x] Grouping derives from the loaded tree and does not add an extra blocking backend/content request before tree render.
- [x] The C7 E2E case proves document tree and filename tabs render while active content fetch is pending.
- [x] No duplicated logic.
- [x] Smoke test passes with real browser execution.
