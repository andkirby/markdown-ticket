# Ticket Viewer

Modal overlay for viewing a ticket's full content, attributes, and sub-documents. Opens when a ticket card is clicked or a ticket URL is navigated to.

## Composition

```text
Modal[size="xl"]
├── TableOfContents (collapsible sidebar)
├── button[close ×] (absolute, top-right)
└── ModalBody[p-0]
    ├── Ticket Not Found (error state)
    │   ├── AlertTriangle icon
    │   ├── h3["Ticket Not Found"]
    │   └── p[error message]
    └── div.viewer-content
        ├── CompactTicketHeader
        │   ├── div.title-bar (border-b)
        │   │   ├── TicketCode
        │   │   ├── span[• separator]
        │   │   └── span[title]
        │   └── div.badge-bar (border-b)
        │       ├── StatusBadge
        │       ├── PriorityBadge
        │       ├── TypeBadge
        │       ├── ContextBadge[phase] (conditional)
        │       ├── ContextBadge[assignee] (conditional)
        │       ├── ContextBadge[worktree] (conditional)
        │       ├── RelationshipBadge[related] (conditional)
        │       ├── RelationshipBadge[depends] (conditional)
        │       └── RelationshipBadge[blocks] (conditional)
        ├── TicketDocumentTabs (conditional: subdocuments exist)
        │   └── Tabs.List × N rows
        │       └── Tabs.Trigger × M entries
        └── div.content-area
            ├── div.subdoc-error (conditional)
            ├── div.subdoc-loading (conditional overlay)
            └── div.ticket-content
                ├── RelativeTimestamp (absolute, top-right)
                └── MarkdownContent
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal | `src/components/ui/Modal.tsx` | `MODALS.md` | always |
| TableOfContents | `src/components/shared/TableOfContents.tsx` | — | always (extracts from content) |
| CompactTicketHeader | `src/components/TicketViewer/CompactTicketHeader.tsx` | — | when ticket exists |
| TicketDocumentTabs | `src/components/TicketViewer/TicketDocumentTabs.tsx` | — | when `subdocuments.length > 0` |
| MarkdownContent | `src/components/MarkdownContent.tsx` | — | always (renders main or subdoc content) |
| RelativeTimestamp | `src/components/shared/RelativeTimestamp.tsx` | — | in content area |
| StatusBadge | `src/components/Badge/StatusBadge.tsx` | — | always in header |
| PriorityBadge | `src/components/Badge/PriorityBadge.tsx` | — | always in header |
| TypeBadge | `src/components/Badge/TypeBadge.tsx` | — | always in header |

## Source files

| Type | Path |
|------|------|
| Viewer | `src/components/TicketViewer/index.tsx` |
| Header | `src/components/TicketViewer/CompactTicketHeader.tsx` |
| Doc tabs | `src/components/TicketViewer/TicketDocumentTabs.tsx` |
| Navigation hook | `src/components/TicketViewer/useTicketDocumentNavigation.ts` |
| Content hook | `src/components/TicketViewer/useTicketDocumentContent.ts` |
| Realtime hook | `src/components/TicketViewer/useTicketDocumentRealtime.ts` |
| Subdoc path | `src/components/TicketViewer/subdocumentPath.ts` |

## Layout

### Modal

- Size: `xl` (wider than default)
- Backdrop: `bg-black/50 backdrop-blur-sm` per `MODALS.md`
- z-index: `z-50`
- Close button: `absolute right-3 top-3 z-20`, 8×8 rounded button, × icon 5×5

### CompactTicketHeader

Two horizontal bars, both with bottom border:

1. **Title bar** (`px-4 py-3 pr-14` to clear close button)
   - `h1 text-base font-semibold leading-6`
   - TicketCode in primary color, bullet separator, title text
   - `min-w-0` for truncation, `break-words` for long titles

2. **Badge bar** (`px-4 py-2.5`)
   - `flex flex-wrap items-center gap-2`
   - Same badge order as TicketCard, plus:
     - **ContextBadge[assignee]** — when `ticket.assignee` is set
   - Badges wrap to next line if they overflow

### TicketDocumentTabs

- Sticky: `sticky top-0 z-10`
- Background: `bg-background/50 backdrop-blur-sm`
- Hidden when no sub-documents exist
- Tab rows: one row per folder depth level
- Tab trigger: `px-2 py-1.5 text-sm font-medium`, whitespace-nowrap
- Active tab: `border-b-2 border-primary`
- Folder entries: append ` ▶` indicator
- Overflow: `overflow-x-auto scrollbar-hide`

### Content area

- Padding: `px-4 py-4 sm:px-5`
- RelativeTimestamp: `absolute right-4 top-4 z-[1] sm:right-5`
- MarkdownContent: receives `headerLevelStart={3}` (renders H1 as H3)
- Subdoc loading overlay: `absolute inset-0 z-10`, `bg-background/50`, pulsing "Loading…" text
- Subdoc error: inline text, `text-destructive`, `role="alert"`

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | ticket opened | modal with header, content, optional tabs |
| loading content | ticket has no content yet | fetch triggered, content loads asynchronously |
| loading subdoc | switching sub-document tab | overlay with "Loading…" pulse, content at `opacity-50 pointer-events-none` |
| subdoc error | subdoc fetch fails | inline error text in content area |
| ticket not found | URL points to missing ticket | centered: AlertTriangle icon, "Ticket Not Found" title, error message |
| real-time update | SSE ticket:updated event | refetches full ticket, merges into current state |
| subdoc added | SSE subdocument add event | refetches ticket to refresh tabs |
| subdoc removed | SSE subdocument unlink event | if viewing removed doc → switch to main, refetch ticket |

## Badge Display Order (Header)

The header badge bar shows more badges than the card:

1. **StatusBadge** — always
2. **PriorityBadge** — always
3. **TypeBadge** — always
4. **ContextBadge[phase]** — when `ticket.phaseEpic` is set
5. **ContextBadge[assignee]** — when `ticket.assignee` is set (card does NOT show this)
6. **ContextBadge[worktree]** — when `ticket.inWorktree === true`
7. **RelationshipBadge[related]** — when `ticket.relatedTickets` has items
8. **RelationshipBadge[depends]** — when `ticket.dependsOn` has items
9. **RelationshipBadge[blocks]** — when `ticket.blocks` has items

## Sub-Document Navigation

Managed by `useTicketDocumentNavigation`:

- **Main document**: `selectedPath = 'main'`
- **Sub-documents**: `selectedPath` matches file path
- **Folders**: clicking a folder pushes to `folderStack`, revealing children in a new tab row
- **Tab rows**: one Radix `Tabs.Root` per active folder level
- **Pending path**: when switching subdocs, a pending path is set. Content hook loads it, then calls `confirmPathSwitch`

## Table of Contents

Extracted from the currently displayed content (main or subdoc):

- Source: `extractTableOfContents(content, maxLevel=3)` — captures H2 and H3
- Rendered by `TableOfContents` component with `view="ticket"`
- Collapsed/expanded state persisted per view via `config/tocConfig.ts`

## Real-Time Updates

Three SSE event types handled:

| Event | Action |
|-------|--------|
| `ticket:updated` | Refetch full ticket, merge into current state |
| `ticket:subdocument:changed` | Invalidate cache and refetch the viewed subdoc |
| `ticket:subdocument:added` | Refetch ticket to refresh tabs list |
| `ticket:subdocument:unlinked` | If viewing the removed doc, switch to main. Refetch ticket. |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| background | `--background` | modal body |
| border | `--border` | header separators, tab borders |
| primary | `--primary` | ticket code, active tab indicator, focus rings |
| foreground | `--foreground` | title text |
| muted-foreground | `--muted-foreground` | close button, timestamps, loading text |
| destructive | `--destructive` | subdoc error text |
| badge colors | `badge.css` data attributes | all badge variants |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| modal | `.modal` | `MODALS.md` |
| badge | `.badge[data-status="..."]` | `badge.css` |
| tabs | `.ticket-document-tabs` | inline Tailwind |
| tab trigger | Radix `data-[state=active]` | inline Tailwind |

## Extension notes

- Header badges differ from card badges: the header adds `assignee`. If badge display needs to be consistent, `CompactTicketHeader` and `TicketAttributeTags` should share a badge order config.
- Content processing: `processContentForDisplay()` removes H1 headers before rendering. `headerLevelStart={3}` shifts remaining headers down.
- The viewer fetches full ticket content on open if `ticket.content` is missing (shallow list ticket vs. full API ticket).
- Sub-document path resolution is handled by `subdocumentPath.ts` — not by the viewer directly.
- Close button position (`right-3 top-3`) must account for ToC toggle if one is added in the future.
