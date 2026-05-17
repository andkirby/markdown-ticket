# Document Filename Tabs

Grouped markdown filename tabs in Documents View for dot-notation sibling files.

## Composition

```text
DocumentsLayout
├── DocumentFilenameTabModel
│   ├── Shared filename namespace parser
│   └── Active grouped tab model
├── DocumentFilenameTabs
│   └── Radix Tabs list
└── MarkdownViewer
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| DocumentsLayout | `src/components/DocumentsView/DocumentsLayout.tsx` | `documents-view-navigation.spec.md` | documents route |
| DocumentFilenameTabModel | `src/components/DocumentsView/documentFilenameTabModel.ts` | this spec | selected markdown file |
| DocumentFilenameTabs | `src/components/DocumentsView/DocumentFilenameTabs.tsx` | this spec | selected file belongs to a filename group |
| MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | `documents-view-file-updates.spec.md` | selected file exists or deleted state is shown |

## Source files

| Type | Path |
|------|------|
| Tabs component | `src/components/DocumentsView/DocumentFilenameTabs.tsx` |
| View model | `src/components/DocumentsView/documentFilenameTabModel.ts` |
| Layout integration | `src/components/DocumentsView/DocumentsLayout.tsx` |
| Shared parser | `shared/services/filenameNamespace.ts` |
| Ticket namespace adapter | `shared/services/ticket/subdocuments/namespace.ts` |
| CSS | `src/components/DocumentsView/documents-view.css` |
| Component tests | `src/components/DocumentsView/DocumentFilenameTabs.test.tsx` |
| Resolver tests | `src/components/DocumentsView/documentFilenameTabs.test.ts` |
| E2E tests | `tests/e2e/documents/filename-tabs.spec.ts` |

## Grouping Rules

- The document tree remains a physical file list. Do not hide, rename, merge, or add virtual tree nodes for grouped files.
- Group only markdown files in the same directory.
- `base.variant.md` groups under logical base `base`; the tab label is `variant`.
- `base.variant.extra.md` groups under logical base `base`; the tab label is `variant.extra`.
- `base.md` joins the grouped view as the first tab labeled `main` when at least one `base.*.md` variant exists.
- A lone dot-notation variant still renders a one-tab grouped view.
- A standalone markdown file without variants opens without filename tabs.
- Non-markdown files never render filename tabs.
- Similar prefixes do not group unless the first-dot logical base matches exactly.

## Layout

- Filename tabs sit above the markdown preview and below the Documents View shell.
- The tabs row is horizontally scrollable and hides the scrollbar, matching ticket subdocument tabs.
- `main` appears first when present; variant tabs follow the shared alphanumeric sort.
- Selecting a tab updates the active physical file path. URL/query state, recent documents, selected tree row, and preview content follow that file path.
- `MarkdownViewer` always receives the active physical file path; it does not own grouping logic.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| grouped with root | `base.md` and at least one `base.*.md` exist | tabs show `main`, then sorted variants |
| grouped without root | one or more `base.*.md` files exist | tabs show sorted variants only |
| lone variant | only one dot-notation markdown variant exists | one active tab renders |
| standalone markdown | selected file has no grouped variants | no filename tabs render |
| tab selected | user clicks a filename tab | active tab underline moves; preview, URL, recents, and tree selection update to the physical file |
| sibling added | document SSE add refreshes the physical tree | new sibling tab appears; current tab remains active |
| active tab deleted | document SSE unlink removes the selected file | fallback selects `main` if present, otherwise first sorted sibling; deleted-file state is not shown while a sibling remains |
| all siblings unavailable | selected file is deleted with no grouped fallback | viewer uses the deleted-file empty state from `documents-view-file-updates.spec.md` |

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | tabs remain a single horizontal scroll row above mobile preview content |
| 640-1024px | tabs keep the same row behavior inside the fixed viewer pane |
| > 1024px | tabs stay at the top of the right preview pane |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| tab text | `--muted-foreground` | inactive tab labels |
| active tab text | `--foreground` | selected tab label |
| active tab indicator | `--primary` | underline for active tab |
| divider | `--border` | existing tab list bottom border |
| viewer background | `--background` | viewer panel behind tabs and content |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| tab list | `.tab__list` | shared Radix tabs pattern from `src/components/SettingsModal/settings.css` |
| tab trigger | `.tab` | shared Radix tabs pattern from `src/components/SettingsModal/settings.css` |
| horizontal overflow | `.scrollbar-hide` | `src/styles/utilities.css` |
| filename tabs wrapper | `.documents-view__filename-tabs` | `src/components/DocumentsView/documents-view.css` |
| viewer panel | `.documents-view__viewer-panel` | `src/components/DocumentsView/documents-view.css` |

## Extension notes

- Extend `shared/services/filenameNamespace.ts` before adding any new filename-derived grouping behavior.
- Keep the Documents View tree physical. Logical grouping belongs only in the viewer tab layer.
- Reuse the shared Radix tabs pattern; do not create a second document-only tab visual language.
