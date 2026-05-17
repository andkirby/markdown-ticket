# Architecture: MDT-169

## Overview

MDT-169 adds a logical filename-tab layer inside the Documents view while preserving the physical document tree and existing content API. The selected document remains a concrete markdown file path; grouping only changes how sibling markdown files are presented in the viewer.

## Pattern

**Bounded view-model resolver with shared filename namespace parsing.**

`DocumentsLayout` stays the owner of document navigation state. A new Documents-view resolver derives a grouped tab view model from the already-loaded physical tree and the active file path. A neutral shared filename namespace helper owns the first-dot split rule so document filename tabs and MDT-138 ticket subdocument tabs cannot drift.

## Runtime Flow

### Opening a Physical Tree File

1. `/api/documents` returns the unchanged physical tree.
2. `DocumentsLayout` stores the selected physical markdown path from the route, query string, recent shortcut, or tree click.
3. The document filename-tab resolver flattens markdown files from the physical tree, groups same-directory siblings by logical base, and returns the active group for the selected path.
4. `base.md` joins the same logical group as `base.*.md` with stable tab key and label `main`; selecting `[main]` sets `selectedFile` to `base.md`. If `base.md` is absent, no `[main]` tab is shown.
5. A lone dot-notation variant such as `some-name.one.md` still forms a grouped variant view and renders its active filename tab, even without sibling variants.
6. `DocumentFilenameTabs` renders for grouped markdown sets, including single dot-notation variants.
7. `MarkdownViewer` receives the active physical file path and fetches `/api/documents/content` exactly as it does today.

### Switching Filename Tabs

1. The user selects a tab in `DocumentFilenameTabs`.
2. `DocumentsLayout` updates `selectedFile` to that tab's physical markdown path.
3. URL/query state, recent documents, selected tree highlighting, and metadata follow that physical path.
4. `MarkdownViewer` reloads content and metadata for the selected physical file.

### Refresh and Deletion

1. Native document SSE remains the update mechanism: the backend emits the existing `document-change` event and the frontend consumes the existing `document:file:changed` event.
2. `DocumentsLayout` responds to document add, change, and unlink events by refreshing or reconciling the physical document tree first.
3. The filename-tab resolver then recomputes the grouped tab model from the updated physical tree, matching the ticket subdocument tab pattern without introducing a document-specific SSE event type.
4. If the active physical file still exists, the resolver keeps it active.
5. If the active physical file disappeared, `DocumentsLayout` selects `main` when the root file exists, otherwise selects the first sorted sibling tab, otherwise clears or marks the selection deleted using the current viewer behavior.

## Structure

```text
shared/services/filenameNamespace.ts
shared/tests/services/filenameNamespace.test.ts
shared/services/ticket/subdocuments/namespace.ts
shared/tests/services/ticket/namespace.test.ts
src/components/DocumentsView/documentFilenameTabModel.ts
src/components/DocumentsView/DocumentFilenameTabs.tsx
src/components/DocumentsView/DocumentsLayout.tsx
src/components/DocumentsView/MarkdownViewer.tsx
src/components/DocumentsView/documents-view.css
src/components/shared/RelativeTimestamp.tsx
src/components/shared/relative-timestamp.css
src/config/documentNavigation.ts
server/services/DocumentService.ts
tests/e2e/documents/filename-tabs.spec.ts
```

## Module Boundaries

- `shared/services/filenameNamespace.ts` owns parsing and sorting semantics: first dot splits logical base from variant key, later dots remain in the variant key, and labels sort alphanumerically with numeric awareness.
- `shared/services/ticket/subdocuments/namespace.ts` adapts the shared parser for MDT-138 ticket subdocument structures. It should not remain an independent implementation of the split rule.
- `src/components/DocumentsView/documentFilenameTabModel.ts` owns Documents-view grouping and active-tab resolution from physical `DocumentFile` trees, including the `main` root tab rule for `base.md` plus variants and the single-variant grouped view rule.
- `src/components/DocumentsView/DocumentsLayout.tsx` owns selection, URL/query updates, recent documents, selected tree highlighting, document SSE reconciliation, refresh fallback, and passing the active physical path to the viewer.
- `src/components/DocumentsView/DocumentFilenameTabs.tsx` owns the tab UI using existing project tab classes and interaction conventions.
- `src/components/DocumentsView/MarkdownViewer.tsx` remains a one-file renderer and should not know logical grouping rules. It reuses shared document metadata presentation rather than defining a Documents-only timestamp row.
- `src/components/shared/RelativeTimestamp.tsx` and `src/components/shared/relative-timestamp.css` own created/updated timestamp display, tooltip chrome, and the shared floating timestamp placement used by ticket and document views.
- `src/components/DocumentsView/documents-view.css` owns Documents-view layout wrappers and uses extracted BEM-style classes for filename tabs, viewer panel, and content positioning.
- `server/services/DocumentService.ts` remains the content safety boundary for active physical file reads.

## Invariants

- The document tree remains a physical file tree; grouping must not hide, rename, move, merge, or create files.
- Grouping applies only to markdown files in the same directory with the same computed logical base.
- Ungrouped markdown files and non-markdown handling stay unchanged.
- Root files and variants remain reachable from the same logical view.
- The active document identity is always a concrete physical markdown path.
- URL/query state, recent document shortcuts, and tree highlighting refer to the active physical markdown file.
- Document SSE updates must use the native `document-change` / `document:file:changed` path and recompute filename tabs from the refreshed physical tree.
- Content requests must stay constrained to resolved markdown files inside configured document paths.
- Grouping is computed from the loaded tree and must not add a blocking backend call before the tree renders.

## Build vs Use

No new package is required. The existing Radix tab pattern and project `tab__list` / `tab` classes are sufficient, and the grouping logic is small enough to own in shared/project code.

## Runtime vs Test Separation

Runtime code should stop at deriving the grouped view model and rendering tabs. Unit tests lock parser and resolver semantics. Playwright tests lock browser-level behavior for tree preservation, active-tab opening, tab switching, URL/query and recent-document stability, and ungrouped documents.

## Extension Rule

Future filename-derived document variants must extend the shared namespace helper first, then adapt the result in the consuming surface. Do not add a second dot-notation parser in Documents view or ticket subdocument code.

## Review Notes

- Architecture follows the assessment recommendation: Option 2, redesign inline.
- The backend document tree endpoint stays unchanged.
- The content endpoint remains active-file based; if implementation finds it does not enforce configured document paths, tighten that boundary without changing the frontend contract.
- Document metadata timestamps reuse the ticket-view `RelativeTimestamp` component and shared floating placement classes so created/updated presentation stays visually consistent across ticket and document content.
