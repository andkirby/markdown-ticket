---
code: MDT-162
status: Implemented
dateCreated: 2026-05-11T20:44:43.122Z
type: Feature Enhancement
priority: Medium
---

# Improve document tree navigation

## 1. Description

### Requirements Scope
`full` — Documents View navigation behavior with concrete UI and data boundaries.

### Problem
- `src/components/DocumentsView/FileTree.tsx` expands all folders by default, which makes large configured document trees overwhelming.
- `src/components/DocumentsView/DocumentsLayout.tsx` has search, sort, configure paths, and active-document targeting, but no global collapse control or focused entry points.
- `docs/CRs/` is ticket territory and must not appear as general document navigation when broad document roots include `docs/`.

### Affected Artifacts
- `src/components/DocumentsView/DocumentsLayout.tsx` — sidebar controls, filter behavior, recent section.
- `src/components/DocumentsView/FileTree.tsx` — default expansion and collapse behavior.
- `src/components/DocumentsView/PathSelector.tsx` — communicate automatic ticket-area exclusion.
- `server/services/DocumentService.ts` — enforce document path exclusions for `docs/CRs/`.
- `docs/design/specs/documents-view-navigation.md` — canonical UX contract.
- `docs/design/mockups/documents-view-navigation.md` — wireframe contract.

### Scope
- **Changes**:
  - Add collapsed-by-default tree behavior.
  - Add collapse-all control while preserving selected document ancestors.
  - Add recent document shortcuts.
  - Extend tree filter to match file name, title, and project-relative path.
  - Exclude `docs/CRs/` from Documents View by default.
- **Unchanged**:
  - Ticket Board and Ticket Viewer remain responsible for ticket files.
  - Markdown rendering behavior stays unchanged.
  - Active-document target behavior from MDT-161 remains available.
  - Sidebar filter remains tree filtering, not full-text content search.

## 2. Decision

### Chosen Approach
Implement focused document navigation with collapsed roots, recent files, filtering, and ticket-area exclusion.

### Rationale
- Collapsed root folders reduce initial visible rows in `FileTree.tsx` without changing document discovery.
- Recent documents support resume workflows without adding another search surface.
- `docs/CRs/` exclusion keeps ticket navigation in ticket-specific surfaces.
- Tree filter remains lightweight and does not create backend content-search scope.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Collapse roots, add recent shortcuts, filter tree, exclude ticket area | **ACCEPTED** - Reduces tree overload while preserving current Documents View model |
| Add only more filters | Adds filter controls without changing visible tree structure | Does not solve overload before the user knows what to filter |
| Add full-text document search | Searches file contents from sidebar | Larger backend scope and mixes navigation with search |
| Hide the tree behind a modal | Moves navigation out of the sidebar | Slower for repeated document switching |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/DocumentsView/RecentDocuments.tsx` | Component | Render project-scoped recently opened document shortcuts |
| `src/config/documentNavigation.ts` | Config utility | Persist recent documents per project |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/DocumentsView/DocumentsLayout.tsx` | Layout update | Add collapse control, recent section, path-aware filtering |
| `src/components/DocumentsView/FileTree.tsx` | Behavior update | Default to collapsed roots, expose collapse-all method, preserve selected ancestors |
| `src/components/DocumentsView/PathSelector.tsx` | UX copy update | Show automatic exclusion for `docs/CRs/` when configured roots overlap ticket area |
| `server/services/DocumentService.ts` | Filtering update | Exclude `docs/CRs/` from broad document roots by default |
| `tests/e2e/documents/*.spec.ts` | Test update | Cover collapsed tree, recents, filtering, and ticket exclusion |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| DocumentsLayout | FileTree | selected file, filtered files, collapse/scroll handle |
| DocumentsLayout | documentNavigation config | project id, recents |
| DocumentService | project document config | configured roots plus automatic ticket-area exclusion |
| PathSelector | project document config | display included roots and automatic exclusions |

### Key Patterns

- Existing icon-button control cluster: apply to collapse, active target, and configure paths in `DocumentsLayout.tsx`.
- Local project-scoped preferences: follow `src/config/documentSorting.ts` pattern for document navigation preferences.
- Data-state styling: use `data-tree-state` from `docs/design/specs/documents-view-navigation.md` when row states become semantic.

## 5. Acceptance Criteria

### Functional
- [x] `FileTree.tsx` renders root folders collapsed by default.
- [x] Selected document ancestors expand automatically on route load and file selection.
- [x] Sidebar header includes a collapse-all control near existing sort and target controls.
- [x] Collapse-all leaves selected document ancestors expanded.
- [x] Documents sidebar avoids unmanaged pinned/scoped shortcut lists.
- [x] Recent documents list shows up to 5 project-scoped file shortcuts.
- [x] Recent documents section can collapse and expand.
- [x] Recent document rows match tree file rows, including title and filename.
- [x] Recent stays fixed above the tree; only the tree block scrolls.
- [x] Documents View does not create page-level viewport scrolling.
- [x] Tree filter matches file name, title, and project-relative path.
- [x] Active-document target clears filter only when the selected file is hidden by filtering.
- [x] `docs/CRs/` does not appear in Documents View when `docs/` is configured as a document root.
- [x] Path configuration communicates automatic exclusion of `docs/CRs/`.

### Non-Functional
- [x] Sidebar header controls do not wrap incoherently at mobile width.
- [x] Long folder and file names truncate without changing row height.
- [x] Icon-only controls have accessible labels or tooltips.
- [x] Existing MarkdownViewer content loading behavior remains unchanged.

### Testing
- Unit: `FileTree.tsx` collapsed default, selected ancestor expansion, and collapse-all behavior.
- Unit: document navigation config utility stores recents per project.
- Integration: `DocumentsLayout.tsx` filter hides selected document, target action clears filter and scrolls selected row.
- Integration: `DocumentService.ts` excludes `docs/CRs/` under broad `docs/` document root.
- E2E: Documents View with large tree shows collapsed roots, recent files, filtering, and no ticket area.
- Manual: Configure `docs` as document root, verify `docs/CRs` is absent and documents outside ticket area remain visible.

### Workflow Artifacts
- Requirements trace projection: [requirements.trace.md](./MDT-162/requirements.trace.md)
- Requirements notes: [requirements.md](./MDT-162/requirements.md)
- BDD trace projection: [bdd.trace.md](./MDT-162/bdd.trace.md)
- BDD notes: [bdd.md](./MDT-162/bdd.md)
- Architecture trace projection: [architecture.trace.md](./MDT-162/architecture.trace.md)
- Architecture notes: [architecture.md](./MDT-162/architecture.md)
- Tests trace projection: [tests.trace.md](./MDT-162/tests.trace.md)
- Tests notes: [tests.md](./MDT-162/tests.md)
- Tasks trace projection: [tasks.trace.md](./MDT-162/tasks.trace.md)
- Tasks notes: [tasks.md](./MDT-162/tasks.md)

## 6. Verification

### By CR Type
- **Feature**: Documents navigation artifacts exist and tests pass for collapsed tree, recent documents, filtering, and ticket exclusion.

### Metrics
- Verifiable artifacts only; no baseline navigation metrics exist.

## 7. Deployment

### Simple Changes
- Deploy frontend and backend together.
- No database migration required.
- Existing document path configuration remains valid.
- Rollback by reverting frontend navigation changes and backend document exclusion change.
