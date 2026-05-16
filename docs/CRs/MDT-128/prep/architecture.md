# Architecture: MDT-128 (Prep)

**Source**: [MDT-128](../MDT-128-e2e-smoke-tests-for-critical-ui-paths.md)
**Generated**: 2026-03-02
**Mode**: Prep — Refactoring required before E2E test implementation

## Overview

Preparatory work to add `data-testid` attributes across frontend components, enabling reliable E2E test selectors. The E2E infrastructure from MDT-092 exists but selectors defined in `tests/e2e/utils/selectors.ts` reference attributes not yet present in components.

## Pattern

**Test Hook Injection** — Systematically add `data-testid` attributes to components matching the selector contracts already defined in `tests/e2e/utils/selectors.ts`. This is a non-functional change: no behavior changes, only test accessibility.

## Canonical Runtime Flows

| Critical Behavior | Canonical Runtime Flow | Owner Module |
|-------------------|------------------------|--------------|
| Test selects element | Playwright locates `data-testid` → Component renders with attribute → Test interacts | `src/components/*` |

**Rules:**
- Each interactive element gets exactly one `data-testid`
- Selectors are defined first in `selectors.ts`, implemented in components
- No test-only logic in runtime files

## Gap Analysis

### Selectors Missing in Components

#### P1: Critical Path (enables core tests)

| Selector | Component | Location | Enables |
|----------|-----------|----------|---------|
| `ticket-{code}` | TicketCard | `src/components/TicketCard.tsx` | Ticket targeting |
| `column-{status}` | Column | `src/components/Board.tsx` or `Column/index.tsx` | Column verification |
| `nav-board`, `nav-list`, `nav-documents` | Navigation tabs | `src/components/ProjectView.tsx` | View switching tests |
| `ticket-detail` | TicketViewer modal | `src/components/TicketViewer.tsx` | Modal tests |
| `close-detail` | TicketViewer close button | `src/components/TicketViewer.tsx` | Modal close tests |
| `drag-handle` | DraggableTicketCard | `src/components/Board.tsx` | DnD tests |
| `drop-zone` | Column drop area | `src/components/Column/index.tsx` | DnD tests |
| `filter-controls` | FilterControls | `src/components/FilterControls.tsx` | Board filtering tests |
| `sort-controls` | SortControls | `src/components/SortControls.tsx` | Board/List sorting tests |
| `search-input` | Search field in FilterControls | `src/components/FilterControls.tsx` | Search tests |

#### P2: Full Coverage (completes all test paths)

| Selector | Component | Location | Enables |
|----------|-----------|----------|---------|
| `ticket-title` | TicketViewer | `src/components/TicketViewer.tsx` | Title verification |
| `ticket-status` | TicketAttributes | `src/components/TicketAttributes.tsx` | Attribute tests |
| `ticket-type` | TicketAttributes | `src/components/TicketAttributes.tsx` | Attribute tests |
| `ticket-priority` | TicketAttributes | `src/components/TicketAttributes.tsx` | Attribute tests |
| `ticket-content` | TicketViewer markdown | `src/components/TicketViewer.tsx` | Markdown rendering tests |
| `ticket-assignee` | TicketAttributes | `src/components/TicketAttributes.tsx` | Assignee tests |
| `ticket-list` | List view container | `src/components/ProjectView.tsx` | List view tests |
| `ticket-row` | List view row | `src/components/ProjectView.tsx` | List row interaction |
| `document-tree` | FileTree | `src/components/DocumentsView/FileTree.tsx` | Documents tests |
| `document-item` | FileTree file nodes | `src/components/DocumentsView/FileTree.tsx` | Documents tests |
| `folder-item` | FileTree folder nodes | `src/components/DocumentsView/FileTree.tsx` | Documents tests |
| `file-viewer` | MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | Documents tests |
| `add-project-modal` | AddProjectModal | `src/components/AddProjectModal/` | Project management tests |
| `edit-project-modal` | AddProjectModal (edit mode) | `src/components/AddProjectModal/` | Project management tests |
| `theme-toggle` | Theme toggle button | `src/components/HamburgerMenu.tsx` or similar | UI/Theme tests |
| `loading` | Loading spinner | `src/App.tsx` or Board | Loading state tests |
| `status-dropdown` | StatusToggle | `src/components/Column/StatusToggle.tsx` | Status change tests |

### Already Implemented

| Selector | Component | Location |
|----------|-----------|----------|
| `ticket-card` | TicketCard | `src/components/TicketCard.tsx:19` |
| `kanban-board` | Board | `src/components/Board.tsx:511` |
| `project-option-{code}` | ProjectSelector | `src/components/ProjectSelector.tsx:58,83` |

### SSE Test Utilities (Non-Selector)

SSE tests require helper utilities, not just selectors:

| Utility | Purpose | Location |
|---------|---------|----------|
| `waitForSSEEvent()` | Wait for specific SSE event type | `tests/e2e/utils/sse-helpers.ts` (new) |
| `captureSSEEvents()` | Capture all SSE events during test | `tests/e2e/utils/sse-helpers.ts` (new) |
| `modifyTicketFile()` | Modify ticket file on disk to trigger file monitor | `tests/e2e/utils/sse-helpers.ts` (new) |

### SSE Testing Approach

**Requirement**: SSE tests must use file system changes to trigger SSE events, not API calls.

This tests the full production flow: file change → file monitor (chokidar) detects → backend broadcasts SSE → UI updates. API-based testing would skip the file monitor layer entirely.

**Required test cases:**

| Test Case | Trigger | Expected Result |
|-----------|---------|-----------------|
| Content update | Modify ticket markdown file on disk | Ticket detail view reflects new content |
| Status update | Modify status in ticket frontmatter | Ticket card moves to new column |

## Structure

```text
src/components/
├── Board.tsx                  # Add: column-{status}, drop-zone, drag-handle
├── Column/
│   └── index.tsx              # Add: ticket-{code}, drop-zone
├── TicketCard.tsx             # Add: ticket-{code} (data-ticket-key exists)
├── TicketViewer.tsx           # Add: ticket-detail, ticket-title, ticket-content, close-detail
├── TicketAttributes.tsx       # Add: ticket-status, ticket-type, ticket-priority, ticket-assignee
├── ProjectView.tsx            # Add: nav-board, nav-list, nav-documents, ticket-list, ticket-row
├── FilterControls.tsx         # Add: filter-controls, search-input
├── SortControls.tsx           # Add: sort-controls
├── AddProjectModal/
│   └── AddProjectModal.tsx    # Add: add-project-modal, edit-project-modal
├── HamburgerMenu.tsx          # Add: theme-toggle (or wherever theme toggle lives)
├── DocumentsView/
│   ├── FileTree.tsx           # Add: document-tree, document-item, folder-item
│   └── MarkdownViewer.tsx     # Add: file-viewer

tests/e2e/utils/
├── selectors.ts               # Add all new selectors (update existing)
├── helpers.ts                 # Existing helpers
└── sse-helpers.ts             # NEW: SSE event capture utilities
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `src/components/*` | Adding `data-testid` to JSX | Changing component behavior |
| `tests/e2e/utils/selectors.ts` | Selector definitions | Adding selectors without component implementation |
| `tests/e2e/utils/sse-helpers.ts` | SSE event capture/verification utilities | Test logic that belongs in spec files |

## CR Requirements Mapping

| CR Test Area | Selectors Needed | SSE Helpers |
|--------------|------------------|-------------|
| Navigation & Routing | `nav-board/list/documents`, `project-option-{code}` | No |
| Board Rendering | `column-{status}`, `ticket-{code}`, `filter-controls`, `sort-controls`, `search-input` | No |
| Board Drag-Drop | `drag-handle`, `drop-zone`, `ticket-{code}` | Yes (verify SSE after drop) |
| List View | `ticket-list`, `ticket-row`, `sort-controls` | No |
| Documents View | `document-tree`, `document-item`, `folder-item`, `file-viewer` | No |
| Ticket Detail | `ticket-detail`, `ticket-title`, `ticket-content`, `close-detail`, `ticket-status/type/priority/assignee` | Yes (modal updates) |
| SSE Updates | (uses existing selectors) | Yes (all SSE utilities) |
| Project Management | `add-project-modal`, `edit-project-modal`, `project-option-{code}` | No |
| URL Routing | (uses URL/path assertions, minimal selectors) | No |
| UI / Theme | `theme-toggle` | No |

## Architecture Invariants

- `selectors.ts is source of truth`: Implement what's defined, don't invent new selectors
- `no behavior changes`: Adding `data-testid` must not change runtime behavior
- `one testid per element`: Each interactive element has exactly one `data-testid`

## Extension Rule

To add new E2E tests: First add selector to `tests/e2e/utils/selectors.ts`, then add `data-testid` to component. Never use CSS selectors or fragile DOM queries.

## Implementation Order

**Phase 1: Critical Path (P1)** — Enables core E2E tests
1. `ticket-{code}` on TicketCard — enables ticket targeting
2. `column-{status}` on Column — enables column verification
3. `nav-board`, `nav-list`, `nav-documents` — enables navigation tests
4. `ticket-detail`, `close-detail` — enables ticket modal tests
5. `drag-handle`, `drop-zone` — enables DnD tests
6. `filter-controls`, `sort-controls`, `search-input` — enables filtering/sorting tests
7. Create `tests/e2e/utils/sse-helpers.ts` — enables SSE tests

**Phase 2: Full Coverage (P2)** — Completes all selectors
8. `ticket-title`, `ticket-content`, `ticket-assignee`
9. `ticket-status`, `ticket-type`, `ticket-priority`
10. `ticket-list`, `ticket-row`
11. `document-tree`, `document-item`, `folder-item`, `file-viewer`
12. `add-project-modal`, `edit-project-modal`
13. `theme-toggle`
14. `loading`, `status-dropdown`

## Test vs Runtime Separation

| Runtime Module | Test Scaffolding | Separation Rule |
|----------------|------------------|-----------------|
| `src/components/*` | `tests/e2e/utils/selectors.ts` | Selectors defined in test utils; components implement via `data-testid` |
| SSE endpoint (`/api/events`) | `tests/e2e/utils/sse-helpers.ts` | SSE capture utilities stay in test-only location |

## Verification

After prep implementation:

```bash
# Verify all selectors have matching data-testid in components
grep -r "data-testid=" src/components/ | wc -l  # Should increase significantly

# Run existing E2E tests to verify no regressions
npm run test:e2e
```

---
*Generated by /mdt:architecture*
