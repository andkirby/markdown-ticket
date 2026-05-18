# Documents View File Updates

Real-time update behavior for configured documents in Documents View, including cache invalidation, current-file refresh, and date metadata.

Navigation, filtering, recent documents, and ticket-area exclusions are owned by `docs/design/surfaces/documents-view-navigation.spec.md`.
Filename tab grouping and active-tab selection are owned by `docs/design/surfaces/document-filename-tabs.spec.md`.

## Composition

```text
DocumentsLayout
├── DocumentUpdateSubscription
│   ├── listens to document:file:changed
│   ├── refreshes tree metadata when visible
│   └── forwards selected-file changes to MarkdownViewer
├── DocumentsSidebar
│   ├── SortControls
│   ├── ScrollToActiveDocumentButton
│   ├── SearchInput
│   └── FileTree
└── MarkdownViewer
    ├── FrontmatterDisclosure
    ├── FloatingRelativeTimestamp
    ├── UpdateIndicator
    ├── MarkdownContent
    └── TableOfContents
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| DocumentsLayout | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | always in documents route |
| ScrollToActiveDocumentButton | `src/components/DocumentsView/DocumentsLayout.tsx` | this spec | disabled until a file is selected |
| FileTree | `src/components/DocumentsView/FileTree.tsx` | — | when documents are configured |
| DocumentFilenameTabs | `src/components/DocumentsView/DocumentFilenameTabs.tsx` | `document-filename-tabs.spec.md` | when selected markdown file belongs to a filename group |
| MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | this spec | when a file is selected |
| MarkdownContent | `src/components/MarkdownContent/index.tsx` | `markdown-content.spec.md` | when markdown body renders |
| PathSelector | `src/components/DocumentsView/PathSelector.tsx` | — | when no document paths are configured |

## Source files

| Type | Path |
|------|------|
| Layout | `src/components/DocumentsView/DocumentsLayout.tsx` |
| Viewer | `src/components/DocumentsView/MarkdownViewer.tsx` |
| Event bus | `src/services/eventBus.ts` |
| SSE client | `src/services/sseClient.ts` |
| Backend watcher | `server/services/fileWatcher/PathWatcherService.ts` |
| Backend SSE | `server/services/fileWatcher/index.ts` |
| Document service | `server/services/DocumentService.ts` |
| Document metadata | `server/commands/ExtractMetadataCommand.ts` |
| Document content cache | `server/commands/ReadFileCommand.ts` |
| Filename tabs | `src/components/DocumentsView/DocumentFilenameTabs.tsx` |
| Filename tab resolver | `src/components/DocumentsView/documentFilenameTabModel.ts` |
| Frontmatter reference | mdopen `frontmatter-block.spec.md` |

## Frontmatter Display

Documents View should match the mdopen frontmatter model for rendered document preview:

- Detect only valid leading frontmatter: file starts with standalone `---` and has a later standalone closing `---`.
- Remove valid leading frontmatter from the markdown body before normal markdown rendering.
- Render the extracted metadata above the document body as one collapsed disclosure labeled `Frontmatter`.
- Show raw escaped metadata text when expanded, preserving line breaks and indentation.
- Do not parse YAML/TOML into fields, badges, chips, or a table.
- Do not render a disclosure when no valid leading frontmatter exists.
- Treat invalid, non-leading, or unterminated markers as normal markdown content.
- Empty extracted frontmatter does not render a disclosure.
- Frontmatter display is preview-only. Document tree title/date metadata keeps using the existing document metadata contract.

The disclosure is part of `MarkdownViewer`, above `MarkdownContent`, and below the floating timestamp/update status area.

## Current Findings

| Area | Current Behavior | Problem |
|------|------------------|---------|
| Ticket watcher | Watches ticket path from `ticketsPath`, recursively after normalization | Good for tickets and ticket subdocuments, intentionally narrow |
| Ticket SSE | Emits `ticket:created`, `ticket:updated`, `ticket:deleted`, or `ticket:subdocument:changed` | Existing UI has event routes for tickets |
| Document loading | `MarkdownViewer` fetches `/api/documents/content` on selected file change | No event listener for external file edits |
| Document content cache | `ReadFileCommand` caches file contents with default 1 hour TTL | Refresh can return stale content unless cache is cleared |
| Document metadata | `DocumentNavigationStrategy` reads filesystem metadata during document tree requests | Metadata updates only after the tree is refetched |
| Document watcher scope | Server initializes watchers only for configured ticket directories | Configured document paths are not watched, so no document SSE event is emitted |

## Update Contract

Documents must not scan or watch every markdown file in a project. The backend watches only:

- `ticketsPath` for ticket files and ticket subdocuments.
- `project.document.paths` for configured document roots/files.
- Any explicit active worktree ticket watcher already created by worktree logic.

Documents View responds only while mounted. It does not need to refresh document content while the user is on Board/List, but the backend may still broadcast document events to all connected SSE clients unless a later subscription API is added.

## Event Model

| File Type | Watch Scope | SSE Type | EventBus Type | Payload Key |
|-----------|-------------|----------|---------------|-------------|
| Main ticket | `ticketsPath` root or ticket folder | `file-change` | `ticket:created`, `ticket:updated`, `ticket:deleted` | `ticketCode` |
| Ticket subdocument | nested under ticket folder | `file-change` | `ticket:subdocument:changed` | `subdocument.filePath` |
| Configured document | path inside `project.document.paths` | `document-change` | `document:file:changed` | `filePath` |

`document:file:changed` payload:

```ts
{
  projectId: string
  eventType: 'add' | 'change' | 'unlink'
  filePath: string
  timestamp: number
  metadata?: {
    title: string | null
    dateCreated: string | null
    lastModified: string | null
  }
}
```

## UX Behavior

| State | Trigger | Visual Change |
|-------|---------|---------------|
| selected file changed externally | `document:file:changed` for current `selectedFile` | Show compact `Updated just now` timestamp plus sync status, refetch content |
| selected file has valid frontmatter | file content starts with valid leading frontmatter | Show collapsed `Frontmatter` disclosure above rendered markdown body |
| frontmatter expanded | user opens disclosure | Raw escaped metadata appears in a code-style block; markdown body stays below it |
| no valid frontmatter | no valid leading frontmatter markers | No disclosure; markdown body starts normally |
| non-selected visible file changed | `document:file:changed` for file in current tree | Refresh tree metadata, keep viewer stable |
| file added under configured path | `document:file:changed` with `add` | Refresh tree, preserve current selection |
| grouped sibling added | `document:file:changed` with `add` for same logical markdown base | Refresh tree and filename tabs, preserve current active tab |
| current selected file deleted with grouped fallback | `document:file:changed` with `unlink` for `selectedFile`; root or sibling variant still exists | Select `main` when present, otherwise first sorted sibling tab; update preview to that physical file |
| current selected file deleted without fallback | `document:file:changed` with `unlink` for `selectedFile`; no sibling remains | Keep path selected, replace preview with deleted-file empty state and action to choose another file |
| document route not mounted | event arrives while Board/List is active | No visible UI change; next Documents View mount fetches fresh tree/content |
| SSE reconnects | `sse:reconnected` | Refetch documents tree; if a file is selected, refetch its content |
| refresh button or cache clear used | manual user action | Refetch tree and selected content; no route change |

## Date Rules

| Surface | Date Source | Display Rule |
|---------|-------------|--------------|
| Tickets | Frontmatter `dateCreated` / `lastModified`, with filesystem stat fallback in `MarkdownService` | Preserve existing ticket behavior; do not derive ticket UX from document metadata |
| Ticket subdocuments | Filesystem `birthtime` / `mtime` from `SubdocumentService` | Refresh only the affected open subdocument |
| Documents | Filesystem `birthtime` / `mtime` from `ExtractMetadataCommand` | `Updated` changes after the document tree is refetched |

Documents should not write date frontmatter automatically. For configured documents, filesystem metadata is the current contract.

## Backend Requirements

- Add document-path watchers from `project.document.paths`; normalize configured files and directories to markdown-only watch patterns.
- Do not watch outside configured document paths.
- Exclude `ticketsPath` from document watchers to avoid duplicate ticket events.
- Invalidate document content cache for the changed absolute file path.
- Refetch the document tree after document events so metadata is recalculated from filesystem stats.
- Broadcast only normalized project-relative document paths.
- Debounce rapid writes by file path, matching the existing 100ms SSE debounce pattern.

## Frontend Requirements

- Add `document:file:changed` to `EventType` and `EventPayloadMap`.
- Map document SSE messages in `sseClient.ts`; keep ticket event mapping unchanged.
- In `DocumentsLayout`, subscribe to document events only while the route is mounted.
- If the event matches `selectedFile`, trigger `MarkdownViewer` content refetch.
- If the event is inside the current document tree but not selected, refresh tree metadata without changing scroll or selection.
- If an unlink removes the selected file from a filename-tab group, resolve the grouped fallback before showing the deleted-file empty state.
- On `sse:reconnected`, refetch tree and current file to close missed-event gaps.

## Layout

- Documents View remains a two-pane layout.
- The target/crosshair button sits in the sidebar header control cluster, between sort direction and path configuration.
- The target/crosshair button scrolls the tree to the active document and expands collapsed ancestor folders.
- Timestamp/status appears in the existing floating timestamp area at the top-right of the viewer.
- Markdown body uses the `document` typography variant from `markdown-content.spec.md`.
- The document prose column should keep a readable measure around `72ch`; wide artifacts scroll inside the viewer.
- Deleted-file state uses the viewer empty-state area, not a modal.
- No toast is required for selected-file refresh; the viewer itself shows the state.
- Non-selected file updates should not interrupt reading.

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Preview mode is single-pane; persistent sidebar/tree is hidden or replaced by a navigation control |
| < 640px | Floating timestamp remains top-right inside the preview padding; content keeps enough top spacing to avoid collision |
| < 640px | ToC opens from a compact control and must not cover the active reading position by default |
| 640-1024px | Sidebar remains fixed-width only if the prose column keeps at least 48ch; otherwise use single-pane preview |
| > 1024px | Two-pane layout; floating timestamp and sync status stay top-right in the viewer |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| page background | `--background` | Viewer surface |
| sidebar background | `--muted` | Existing sidebar tint |
| timestamp text | `--muted-foreground` | Relative timestamp control |
| divider | `--border` | Sidebar and document separators |
| scroll target icon | `--muted-foreground` / `--primary` | Sidebar header action |
| update indicator | `--primary` | Active refresh/updated state |
| frontmatter background | `--muted` | Subtle metadata disclosure surface |
| frontmatter border | `--border` | Single border around disclosure |
| frontmatter text | `--foreground`, `--muted-foreground` | Raw metadata and disclosure summary |
| deleted state | `--destructive` | Deleted-file message |
| markdown prose | `--foreground`, `--muted-foreground`, `--primary`, `--border`, `--code-*` | document body typography, links, tables, code |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| layout utilities | Tailwind inline utilities | `STYLING.md` keep-inline rule |
| floating timestamp | `.relative-timestamp__floating` | Shared timestamp placement used by ticket and document viewers |
| timestamp control | `.relative-timestamp` | Shared created/updated relative timestamp control |
| timestamp sync state | `.relative-timestamp__sync-state` | Shared inline sync status next to timestamp |
| semantic update state | `.document-update-indicator` proposed | Use when indicator styling is reused |
| frontmatter disclosure | `.document-frontmatter` proposed | Native details/summary wrapper for raw metadata |
| frontmatter code | `.document-frontmatter__code` proposed | Transparent inner code area; no nested panel |
| markdown prose | `.prose.prose--document` proposed | `markdown-content.spec.md` reading variant |
| semantic file state | `data-file-state` proposed | Mirrors `data-*` semantic variant guidance |

## Extension Notes

- SSE is one-way. The server cannot know the active route from the existing global `EventSource` connection.
- If event volume becomes a problem, add a client-to-server subscription endpoint or connect Documents View to `/api/events?topics=documents:{projectId}` only while mounted.
- The first implementation should prefer always watching configured document paths for active projects and filtering updates on the frontend; it is simpler and keeps the UX reliable.
- Keep frontmatter rendering dependency-free unless semantic document metadata becomes a product requirement.
