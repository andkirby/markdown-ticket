# Documents View Navigation

Navigation model for large configured document sets in Documents View.

## Composition

```text
DocumentsLayout
├── DocumentsSidebar
│   ├── SidebarHeader
│   │   ├── SortControls
│   │   ├── CollapseTreeButton
│   │   ├── ScrollToActiveDocumentButton
│   │   └── ConfigurePathsButton
│   ├── FilterInput
│   ├── RecentDocuments
│   └── FileTree
└── MarkdownViewer
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| DocumentsLayout | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always in documents route |
| SidebarHeader | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always |
| FilterInput | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always |
| RecentDocuments | proposed | this spec | when user has opened documents |
| FileTree | `src/components/DocumentsView/FileTree.tsx` | this spec | when documents are configured |
| MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | `specs/documents-view-file-updates.md` | when a file is selected |
| PathSelector | `src/components/DocumentsView/PathSelector.tsx` | — | when no document paths are configured |

## Source files

| Type | Path |
|------|------|
| Layout | `src/components/DocumentsView/DocumentsLayout.tsx` |
| Tree | `src/components/DocumentsView/FileTree.tsx` |
| Path configuration | `src/components/DocumentsView/PathSelector.tsx` |
| Existing update spec | `docs/design/specs/documents-view-file-updates.md` |

## Navigation Rules

- Documents View shows configured document paths only.
- Ticket paths are excluded from Documents navigation by default.
- `docs/CRs/` is always treated as ticket territory, not general documentation.
- If a configured document root overlaps `docs/CRs/`, the tree excludes the ticket area from that root.
- Custom configured paths are valid document roots only outside excluded ticket areas.
- The default tree is collapsed to root folders, except ancestors of the selected document.
- The active document remains highlighted even after filtering, sorting, or collapsing.

## Layout

- Sidebar keeps the existing two-pane layout and muted background.
- Header order: title, sort select, sort direction, collapse control, active-document target, path configuration.
- Filter input sits directly below the header controls.
- Recent documents appear above the full tree only after the user opens documents.
- Recent documents are collapsible and default to expanded.
- Recent documents appear above the full tree, capped at 5 items.
- Recent documents are outside the tree scroll area; only the file tree scrolls inside the sidebar.
- A thin `--border` divider separates Recent from the tree.
- File tree starts with configured roots collapsed by default.
- Recent file rows use the same file icon, row padding, title/filename display, truncation, and hover treatment as file rows in the tree.
- Folder rows use the same row height and indentation rules as the existing tree.
- Documents View must not create page-level viewport scrolling; sidebar and viewer content scroll inside their own panels.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | documents route opens | root folders collapsed; selected document ancestors expanded |
| active document selected | user opens a file or route includes file | file row highlighted; ancestors expanded |
| collapse all | user clicks collapse control | all folders collapse except selected document ancestors |
| recent collapsed | user collapses Recent | recent shortcut rows are hidden; divider and tree stay visible |
| expand current | user clicks target action | selected document ancestors expand and row scrolls into view |
| filter active | user types in filter input | tree shows matching folders/files; recent documents remain visible |
| filter hides selected | selected file does not match filter | target action clears filter, expands ancestors, scrolls to selected file |
| no matches | filter returns no files | tree area shows compact empty state; recent documents remain available |
| no configured paths | backend returns 404 | PathSelector modal opens |

## Filter Behavior

- The input is a tree filter, not full-text content search.
- Match against file name, title, and project-relative path.
- Multi-word queries use AND matching.
- Matching folders show their matching descendants.
- Recent documents are not removed by the filter.

## Recent Documents

- Recent documents are file shortcuts, not folders.
- Recent section header toggles the shortcut list open or closed.
- Recent document rows render the document title as primary text when available and the filename as secondary text, matching tree file rows.
- Selecting a recent document opens it and expands its tree ancestors.
- Recent list is project-scoped.
- Deleted or excluded files are removed from recents on refresh.

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | header controls wrap to two rows; recent documents remain above tree |
| 640-1024px | sidebar keeps fixed width; tree rows truncate long names |
| > 1024px | two-pane layout; sidebar sections remain visible above scroll area |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| sidebar background | `--muted` | existing sidebar tint |
| text | `--foreground` | row labels and section labels |
| secondary text | `--muted-foreground` | paths, filenames, disabled pins |
| selected row | `--primary` | active file highlight |
| border | `--border` | sidebar divider, header separator, and Recent/tree divider |
| focus ring | `--ring` | input and icon-button focus |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| layout utilities | Tailwind inline utilities | `STYLING.md` keep-inline rule |
| tree row state | `data-tree-state` proposed | semantic row state: `selected`, `muted`, `disabled` |
| sidebar section | `.documents-sidebar-section` proposed | reuse only if recent sections share styling |

## Extension notes

- Do not add content search into this sidebar filter. If content search is needed, make it a separate search mode or command surface.
- Do not duplicate ticket navigation inside Documents View. Ticket files belong to the ticket board and ticket viewer.
- Do not add an unmanaged pinned/favorites list. If folder favorites return later, rows need explicit add/remove controls.
