# Documents View Navigation

Navigation model for large configured document sets in Documents View.

## Composition

```text
DocumentsLayout
├── DocumentsSidebar
│   ├── SidebarHeader
│   │   ├── TitleActionRow
│   │   ├── CollapseTreeButton
│   │   ├── ScrollToActiveDocumentButton
│   │   ├── ConfigurePathsButton
│   │   └── SearchSortRow
│   │       ├── SearchInput
│   │       ├── SortSelect
│   │       └── SortDirectionButton
│   ├── FavDocuments
│   ├── RecentDocuments
│   └── FileTree
└── DocumentsViewerPanel
    ├── DocumentFilenameTabs
    └── MarkdownViewer
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| DocumentsLayout | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always in documents route |
| SidebarHeader | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always |
| SearchSortRow | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always |
| SearchInput | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always |
| FavDocuments | `src/components/DocumentsView/FavDocuments.tsx` | this spec | when reconciled favs exist |
| RecentDocuments | `src/components/DocumentsView/RecentDocuments.tsx` | this spec | when user has opened documents |
| FileTree | `src/components/DocumentsView/FileTree.tsx` | this spec | when documents are configured |
| DocumentFilenameTabs | `src/components/DocumentsView/DocumentFilenameTabs.tsx` | `document-filename-tabs.spec.md` | when selected markdown file belongs to a filename group |
| MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | `documents-view-file-updates.spec.md` | when a file is selected |
| PathSelector | `src/components/DocumentsView/PathSelector.tsx` | `documents-path-selector.spec.md` | when no document paths are configured |

## Source files

| Type | Path |
|------|------|
| Layout | `src/components/DocumentsView/DocumentsLayout.tsx` |
| Layout CSS | `src/components/DocumentsView/documents-view.css` |
| Favs | `src/components/DocumentsView/FavDocuments.tsx` |
| Recent | `src/components/DocumentsView/RecentDocuments.tsx` |
| Tree | `src/components/DocumentsView/FileTree.tsx` |
| Navigation preferences | `src/config/documentNavigation.ts` |
| Fav star entity | `src/styles/entities/fav-star.css` |
| Path configuration | `src/components/DocumentsView/PathSelector.tsx` |
| Existing update spec | `docs/design/surfaces/documents-view-file-updates.spec.md` |
| Filename tabs spec | `docs/design/surfaces/document-filename-tabs.spec.md` |

## Navigation Rules

- Documents View shows configured document paths only.
- Ticket paths are excluded from Documents navigation by default.
- `docs/CRs/` is always treated as ticket territory, not general documentation.
- If a configured document root overlaps `docs/CRs/`, the tree excludes the ticket area from that root.
- Custom configured paths are valid document roots only outside excluded ticket areas.
- Eligible folders and markdown documents can be marked as Favs from tree row star controls when the user has write/admin access.
- In read-only access, Favs may be shown from existing durable state, but add/remove star controls and path configuration are hidden because they write project/user state.
- Fav state is additive document navigation state; it must not change Recent or All Documents behavior.
- Selecting a document fav opens that markdown document and selects the matching tree row.
- Selecting a folder fav expands ancestors and locates the folder row without opening a document preview.
- The default tree is collapsed to root folders, except ancestors of the selected document.
- The active document remains highlighted even after filtering, sorting, or collapsing.

## Layout

- Sidebar keeps the two-pane layout and muted background, but its desktop width is resizable and collapsible.
- Sidebar default width is about one third of the Documents View; user-resized width and collapsed state persist per project.
- Collapsing navigation removes the sidebar and exposes a compact show-navigation control in the viewer pane.
- Header first row contains the `Documents` title on the left and navigation action icons on the right.
- Header second row order is always: search input flexing left, sort select, sort direction button.
- Search input uses the available row width before the fixed-width sort controls; sort controls must not squeeze title/actions into the first row.
- Search, sort select, and sort direction button share a single visual row and equal control height.
- Favs appear above Recent when reconciled favs exist.
- Favs are collapsible, default to expanded, and initially show up to 5 rows in this version.
- Favs expanded/collapsed state is browser-local UI state and persists for the current project.
- When more than 5 reconciled favs exist, the Favs header shows a compact trailing `Show all` action.
- Favs is not an independently scrollable block in MDT-171.
- Favs rows can represent configured folders or markdown documents.
- Favs rows use an active star control aligned to the trailing/right edge to remove the fav.
- Recent documents appear above the full tree only after the user opens documents and below Favs when both exist.
- Recent documents are collapsible and default to expanded.
- Recent expanded/collapsed state is browser-local UI state and persists for the current project.
- Recent documents appear above the full tree, capped at 5 items.
- Favs and Recent are outside the tree scroll area; only the file tree scrolls inside the sidebar.
- A thin `--border` divider separates Favs, Recent, and the tree.
- File tree starts with configured roots collapsed by default.
- Favs and Recent rows use the same row padding, title/filename display, truncation, and hover treatment as file rows in the tree.
- Fav rows use folder icons for folders and file icons for markdown documents.
- Tree row star controls use inactive and active star states without increasing row height.
- Folder rows use the same row height and indentation rules as the existing tree.
- Documents View must not create page-level viewport scrolling; sidebar and viewer content scroll inside their own panels.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | documents route opens | root folders collapsed; selected document ancestors expanded |
| active document selected | user opens a file or route includes file | file row highlighted; ancestors expanded |
| no favs | no reconciled favs exist | Favs section is hidden; Recent and All Documents keep their positions |
| collapse all | user clicks collapse control | all folders collapse except selected document ancestors |
| favs collapsed | user collapses Favs | fav shortcut rows are hidden; divider and lower sections stay visible |
| favs collapse restored | user reloads Documents View in same browser/project | Favs restores the last expanded/collapsed state when reconciled favs exist |
| favs default expanded | no browser section-state preference exists | Favs renders expanded when reconciled favs exist |
| fav toggled on | user clicks an inactive tree star | star becomes active and the item appears in Favs |
| fav toggled off | user clicks an active star in tree or Favs | star becomes inactive and the item is removed from Favs |
| folder fav selected | user selects a folder fav row | filter clears if needed; ancestors expand; folder row scrolls into view and receives located state |
| more than five favs | six or more reconciled favs exist | first five rows render and the Favs header shows trailing `Show all` |
| show all favs | user selects `Show all` | all reconciled fav rows render and the action changes to `Show less` |
| show less favs | user selects `Show less` | Favs returns to the first five rows and the action changes to `Show all` |
| recent collapsed | user collapses Recent | recent shortcut rows are hidden; divider and tree stay visible |
| recent collapse restored | user reloads Documents View in same browser/project | Recent restores the last expanded/collapsed state when recent documents exist |
| recent default expanded | no browser section-state preference exists | Recent renders expanded when recent documents exist |
| sidebar resized | user drags the pane handle | navigation width changes immediately; preview pane gets the remaining width |
| sidebar collapsed | user selects the hide-navigation action or drags to collapsed size | navigation panel is hidden; viewer pane expands; show-navigation control appears |
| sidebar restored | user selects show-navigation | navigation panel returns to the last non-collapsed project width |
| expand current | user clicks target action | selected document ancestors expand and row scrolls into view |
| search active | user types in search input | tree shows matching folders/files; Favs and Recent remain visible |
| filter hides selected | selected file does not match filter | target action clears filter, expands ancestors, scrolls to selected file |
| no matches | filter returns no files | tree area shows compact empty state; Favs and Recent remain available |
| no configured paths | backend returns 404 | PathSelector modal opens |
| read-only | access mode lacks write/admin | Configure paths hidden; tree and Favs star mutation controls absent; existing Favs and Recents remain selectable shortcuts |

## Filter Behavior

- The search input is a tree filter, not full-text content search.
- Match against file name, title, and project-relative path.
- Multi-word queries use AND matching.
- Matching folders show their matching descendants.
- Favs and Recent documents are not removed by the filter.

## Favs

- Favs are explicit user-selected shortcuts to eligible folders and markdown documents.
- The section label is `Favs`.
- Favs state is durable per-project user state stored in `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- The persisted shape is an object with ordered `favItems`.
- Favs expanded/collapsed state is not part of `document-favs.json`; it is browser-local UI state.
- Favs header toggle writes its expanded/collapsed value immediately to browser-local state for the active project.
- Hidden empty Favs does not clear the saved expanded/collapsed preference.
- Favs are reconciled against the eligible document tree; deleted or excluded targets are hidden from the section and tree metadata.
- The star control in tree rows adds or removes a fav without selecting the row.
- In read-only mode, star controls are not rendered in tree rows or Fav rows.
- The synthetic root grouping row `./` does not show a fav star.
- Fav row and tree row star controls preserve the project favorite star active, inactive, hover, focus, title, and accessible-label pattern.
- Fav row and tree row star controls are trailing actions, not leading icons.
- Active stars remove favs. Inactive tree stars add favs.
- Selecting a document fav opens the physical file path, expands its tree ancestors, and selects the matching filename tab when applicable.
- Selecting a folder fav expands and locates the matching folder in the tree.
- Empty Favs is hidden.
- More than five reconciled favs are persisted and remain reachable through `Show all`.
- More than five reconciled favs show a compact `Show all` action in the Favs header line.
- `Show all` reveals every reconciled fav in the section and changes to `Show less` in the same header position.
- `Show less` returns the section to the first five visible fav rows.
- Show-all state is browser-local per project and separate from the Favs expanded/collapsed state.
- The Favs section does not get its own scrollbar; `Show all` expands the section inline.

## Recent Documents

- Recent documents are file shortcuts, not folders.
- Recent section header toggles the shortcut list open or closed.
- Recent expanded/collapsed state persists in browser-local navigation preferences for the current project.
- Recent header toggle writes its expanded/collapsed value immediately to browser-local state for the active project.
- Hidden empty Recent does not clear the saved expanded/collapsed preference.
- Recent document rows render the document title as primary text when available and the filename as secondary text, matching tree file rows.
- Selecting a recent document opens the physical file path, expands its tree ancestors, and selects the matching filename tab when the file belongs to a grouped markdown set.
- Recent list is project-scoped.
- Deleted or excluded files are removed from recents on refresh.

## Filename Tab Boundary

- Documents navigation stays physical: all configured files remain visible in the tree.
- Dot-notation markdown grouping is a viewer concern owned by `document-filename-tabs.spec.md`.
- Tree selection, recent shortcuts, route query state, and filename tab selection all point to the same active physical file path.

## Browser-Local Section State

- Favs and Recent section open/closed state is a browser-local presentation preference.
- Scope is current browser profile and project id.
- Default is expanded when no browser preference exists.
- Reloading Documents View for the same project restores the saved section state.
- Switching projects uses that project's saved section state, or defaults to expanded.
- Favs and Recent are stored as separate section-state values so collapsing one never collapses the other.
- Favs show-all/show-less state is a separate browser-local value from Favs expanded/collapsed state.
- This preference must not be written to `CONFIG_DIR/projects/{project.id}/document-favs.json`, `.mdt-config.toml`, or backend config routes.
- The preference may live beside existing document navigation localStorage state, but it must not merge fav item persistence into Recent storage.

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Documents route uses one primary pane at a time: navigation list or document preview |
| < 640px | persistent sidebar/tree must not remain beside the markdown preview |
| < 640px | navigation mode keeps title/actions above the search/sort row; Favs and recent documents remain above tree |
| 640-1024px | sidebar width may be resized only while preview content still has readable measure; tree rows truncate long names |
| > 1024px | two-pane layout; sidebar sections remain visible above scroll area; artifacts in preview may use remaining pane width |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| sidebar background | `--muted` | existing sidebar tint |
| text | `--foreground` | row labels and section labels |
| secondary text | `--muted-foreground` | paths, filenames, disabled pins |
| selected row | `--primary` | active file highlight |
| border | `--border` | sidebar divider, header separator, and Favs/Recent/tree divider |
| focus ring | `--ring` | input and icon-button focus |
| favorite star | `--star-*` | inactive, active, hover, and active-hover document fav states |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| navigation shell | `.documents-view__layout`, `.documents-view__navigation-panel`, `.documents-view__preview-panel` | resizable Documents View split |
| navigation header | `.documents-view__navigation-header`, `.documents-view__navigation-primary-row`, `.documents-view__navigation-controls-row` | compact two-row sidebar header |
| search and sort controls | `.documents-view__search-field`, `.documents-view__sort-select`, `.documents-view__sort-direction-button` | `[search flex] [sort] [direction]` control row |
| tree row state | `data-tree-state` proposed | semantic row state: `selected`, `muted`, `disabled`, `located` |
| fav star | `.fav-star`, `.fav-star--document`, `.active` | shared star icon state for tree and Favs rows |
| document fav star button | `.document-fav-star-button` | compact focus, hover, and opacity treatment |
| sidebar section | Tailwind inline utilities | compact section spacing and dividers |

## Extension notes

- Do not add content search into this sidebar filter. If content search is needed, make it a separate search mode or command surface.
- Do not duplicate ticket navigation inside Documents View. Ticket files belong to the ticket board and ticket viewer.
- Do not add unmanaged pinned lists. Durable shortcuts must use explicit Favs add/remove controls and the document fav state owner.
- Do not add nested scrolling or a popover overflow for Favs; use the Favs header `Show all` / `Show less` action.
