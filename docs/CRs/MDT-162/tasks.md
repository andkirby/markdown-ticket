# Tasks: MDT-162

**Source**: [MDT-162](../MDT-162-document-tree-navigation.md)
**Generated**: 2026-05-11

## Milestones

| Milestone | Goal | Scenarios |
|-----------|------|-----------|
| M1 | Navigation preference model | recent-document support |
| M2 | Ticket-area boundary | `ticket_area_exclusion_disclosed` |
| M3 | Tree orientation | `default_tree_collapsed`, `collapse_preserves_active_path` |
| M4 | Sidebar navigation | `no_unmanaged_shortcuts`, `recent_documents_resume`, `recent_documents_collapse_expand`, `recent_documents_match_tree_rows`, `recent_fixed_tree_scrolls`, `filter_matches_path_title`, `target_clears_hidden_selection_filter` |
| M5 | Contract verification | all MDT-162 scenarios and test plans |

## Task 1: Implement project-scoped document navigation preferences

**Skills**: frontend-react-component

**Milestone**: M1 — Navigation preference model (BR-3.1, BR-4.1, C1, Edge-1)

**Structure**: `src/config/documentNavigation.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-navigation-config` → `src/config/documentNavigation.test.ts`: recent cap and shortcut sanitization

**Scope**: Add local browser persistence for recent documents.
**Boundary**: Preference logic only; no Documents View rendering.

**Creates**:
- `src/config/documentNavigation.ts`

**Modifies**:
- `src/config/documentNavigation.test.ts`

**Must Not Touch**:
- `server/services/TreeService.ts`
- `src/components/DocumentsView/DocumentsLayout.tsx`

**Create/Move**:
- Add `DocumentNavigationPreferences` type.
- Add get/set helpers keyed by project id.
- Add `addRecentDocument()` with newest-first dedupe and max 5.
- Add sanitization that removes `docs/CRs` and shortcuts not present in the eligible tree.

**Exclude**: No project config writes; no backend calls.

**Anti-duplication**: Follow `src/config/documentSorting.ts` storage style; do not copy unrelated view-mode persistence logic.

**Duplication Guard**:
- Check `src/config/documentSorting.ts` before coding.
- If a document preference helper already exists, extend it instead of adding a parallel owner.
- Verify no second recent-document storage key is introduced.

**Verify**:

```bash
bun test ./src/config/documentNavigation.test.ts
```

**Done when**:
- [x] Unit tests GREEN.
- [x] `docs/CRs` cannot be persisted as a recent shortcut.
- [x] Invalid stored shortcuts are removed or nulled.

## Task 2: Exclude ticket territory from document discovery and path configuration

**Milestone**: M2 — Ticket-area boundary (BR-6.1, BR-6.2, C1)

**Structure**: `server/services/TreeService.ts`, `server/services/DocumentService.ts`, `src/components/DocumentsView/PathSelector.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-area-exclusion` → `tests/e2e/documents/navigation.spec.ts`: ticket area excluded

**Makes GREEN (Behavior)**:
- `ticket_area_exclusion_disclosed` → `tests/e2e/documents/navigation.spec.ts` (BR-6.1, BR-6.2)

**Scope**: Enforce `docs/CRs/` exclusion in document tree results and disclose it in path configuration.
**Boundary**: Do not change ticket discovery or ticket viewer behavior.

**Creates**:
- None

**Modifies**:
- `server/services/TreeService.ts`
- `server/services/DocumentService.ts`
- `src/components/DocumentsView/PathSelector.tsx`

**Must Not Touch**:
- `shared/services/TicketService.ts`
- `src/components/TicketViewer/`
- `docs/CRs/**` ticket content

**Create/Move**:
- Filter configured document tree output so ticket paths are removed under broad roots.
- Keep relative path semantics in backend responses.
- Add PathSelector notice for automatic ticket-area exclusion.

**Exclude**: No new ticket route, no ticket parsing changes, no content search.

**Anti-duplication**: Use existing `ticketsPath` and document config values; do not hard-code only one project layout if config provides a ticket path.

**Duplication Guard**:
- Check `TreeService.getDocumentTree()` before adding filtering elsewhere.
- If a path exclusion helper already exists, reuse it.
- Verify no second document discovery pipeline is introduced.

**Verify**:

```bash
bunx playwright test tests/e2e/documents/navigation.spec.ts --project=chromium --grep "ticket|exclusion|Path configuration"
```

**Done when**:
- [x] E2E ticket exclusion scenario GREEN.
- [x] `docs/CRs` does not appear in Documents View for `docs` root.
- [x] PathSelector communicates the exclusion.

## Task 3: Update FileTree collapsed state and selected ancestor behavior

**Skills**: frontend-react-component

**Milestone**: M3 — Tree orientation (BR-1.1, BR-1.2, BR-2.1)

**Structure**: `src/components/DocumentsView/FileTree.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-file-tree-state` → `src/components/DocumentsView/FileTree.test.tsx`: collapsed default and selected ancestor expansion

**Makes GREEN (Behavior)**:
- `default_tree_collapsed` → `tests/e2e/documents/navigation.spec.ts` (BR-1.1, BR-1.2)
- `collapse_preserves_active_path` → `tests/e2e/documents/navigation.spec.ts` (BR-2.1)

**Scope**: Change tree expansion model and expose collapse-all through the existing tree handle.
**Boundary**: FileTree should not know recent documents or backend exclusions.

**Creates**:
- None

**Modifies**:
- `src/components/DocumentsView/FileTree.tsx`
- `src/components/DocumentsView/FileTree.test.tsx`

**Must Not Touch**:
- `server/services/TreeService.ts`
- `src/config/documentNavigation.ts`

**Create/Move**:
- Initialize expanded folders to selected ancestors only.
- Expand selected ancestors on selected file changes.
- Add `collapseAll()` to collapse unrelated folders while preserving selected ancestors.

**Exclude**: No sorting or filtering changes in FileTree.

**Anti-duplication**: Reuse existing ancestor path traversal helpers; do not create a second folder-state owner.

**Duplication Guard**:
- Check existing `getAncestorFolderPaths()` before adding helpers.
- Keep expansion state in FileTree only.
- Verify DocumentsLayout does not directly mutate folder expansion sets.

**Verify**:

```bash
bun test ./src/components/DocumentsView/FileTree.test.tsx
```

**Done when**:
- [x] Unit tests GREEN.
- [x] Selected document remains visible after collapse-all.
- [x] Root folders are collapsed on first load without selected file.

## Task 4: Add sidebar recents, filter, and target recovery

**Skills**: frontend-react-component

**Milestone**: M4 — Sidebar navigation (BR-3.1, BR-4.1, BR-5.1, BR-5.2, C2, C3)

**Structure**: `src/components/DocumentsView/DocumentsLayout.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-document-navigation-e2e` → `tests/e2e/documents/navigation.spec.ts`: sidebar navigation behavior

**Makes GREEN (Behavior)**:
- `no_unmanaged_shortcuts` → `tests/e2e/documents/navigation.spec.ts` (BR-3.1)
- `recent_documents_resume` → `tests/e2e/documents/navigation.spec.ts` (BR-4.1)
- `filter_matches_path_title` → `tests/e2e/documents/navigation.spec.ts` (BR-5.1)
- `target_clears_hidden_selection_filter` → `tests/e2e/documents/navigation.spec.ts` (BR-5.2)

**Scope**: Compose recent document shortcuts, path-aware filter, and active document recovery into the sidebar.
**Boundary**: Do not change MarkdownViewer rendering or backend document content loading.

**Creates**:
- `src/components/DocumentsView/RecentDocuments.tsx`

**Modifies**:
- `src/components/DocumentsView/DocumentsLayout.tsx`
- `tests/e2e/utils/selectors.ts`
- `tests/e2e/documents/navigation.spec.ts`

**Must Not Touch**:
- `src/components/DocumentsView/MarkdownViewer.tsx`
- `server/services/DocumentService.ts`

**Create/Move**:
- Render Recent and document tree sections.
- Make Recent collapsible while defaulting to expanded.
- Render Recent rows with the same title/filename treatment as tree file rows.
- Keep Recent fixed above the tree; only the tree block scrolls inside the sidebar.
- Do not render unmanaged pinned/scoped shortcut lists.
- Add collapse-all button to header control cluster.
- Extend filter to include project-relative path.
- Update active-target action to clear filter only when selected file is hidden.

**Exclude**: No full-text search, no cards-inside-cards, no new global state library.

**Anti-duplication**: Import navigation preference helpers from `src/config/documentNavigation.ts`; do not duplicate localStorage logic in components.

**Duplication Guard**:
- Check `DocumentsLayout.tsx` for existing filter and selected-file logic before editing.
- Keep only one source of selected file state.
- Verify no duplicate recent-document list is added outside DocumentsSidebar.

**Verify**:

```bash
bunx playwright test tests/e2e/documents/navigation.spec.ts --project=chromium --grep "shortcut|recent|filter|target"
```

**Done when**:
- [x] E2E sidebar scenarios GREEN.
- [x] Icon controls have labels/tooltips.
- [x] Mobile header controls wrap coherently.

## Task 5: Verify design docs and end-to-end navigation contract

**Skills**: playwright-skill

**Milestone**: M5 — Contract verification (all MDT-162 scenarios)

**Structure**: `tests/e2e/documents/navigation.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-document-navigation-e2e` → `tests/e2e/documents/navigation.spec.ts`: full navigation suite
- `TEST-ticket-area-exclusion` → `tests/e2e/documents/navigation.spec.ts`: ticket-area boundary

**Scope**: Final verification pass against UX docs, trace projections, and executable tests.
**Boundary**: Only fix small selector/test mismatches; do not implement new runtime behavior here.

**Creates**:
- None

**Modifies**:
- `tests/e2e/documents/navigation.spec.ts`
- `docs/design/specs/documents-view-navigation.md`
- `docs/design/mockups/documents-view-navigation.md`

**Must Not Touch**:
- Runtime modules unless a previous task missed a documented selector contract.

**Create/Move**:
- Verify test names match scenario intent.
- Verify docs still match implemented behavior.
- Run full MDT-162 E2E file.

**Exclude**: No scope expansion beyond MDT-162.

**Anti-duplication**: Use existing `documentSelectors`; do not inline selector strings in tests.

**Duplication Guard**:
- Check `tests/e2e/utils/selectors.ts` before adding selectors.
- Verify no duplicate navigation spec exists under `docs/design/specs/`.
- Verify tests exercise the app through the real route.

**Verify**:

```bash
bun test ./src/components/DocumentsView/FileTree.test.tsx ./src/config/documentNavigation.test.ts
bunx playwright test tests/e2e/documents/navigation.spec.ts --project=chromium
```

**Done when**:
- [x] Unit tests GREEN.
- [x] BDD scenarios GREEN.
- [x] Design docs match shipped behavior.
- [x] No duplicated document navigation ownership.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|------------|----------|-----|--------|
| src/components/DocumentsView | 5 | 5 | 0 | Pass |
| src/config | 1 | 1 | 0 | Pass |
| server/services | 2 | 2 | 0 | Pass |
| tests/e2e | 2 | 2 | 0 | Pass |
| src unit tests | 2 | 2 | 0 | Pass |
| docs/design | 2 | 2 | 0 | Pass |

## Trace

- Canonical tasks: [tasks.trace.md](./tasks.trace.md)
