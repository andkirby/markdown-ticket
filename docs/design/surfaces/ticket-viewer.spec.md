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
        ├── TraceGraphAction (conditional: trace store exists)
        │   └── button["Trace Graph"]
        ├── TicketDocumentTabs (conditional: subdocuments exist)
        │   └── Tabs.List × N rows
        │       └── Tabs.Trigger × M entries
        └── div.content-area
            ├── div.subdoc-error (conditional)
            ├── div.subdoc-loading (conditional overlay)
            └── div.ticket-content
                ├── RelativeTimestamp (absolute, top-right)
                └── MarkdownContent

TraceGraphShell (opened from TraceGraphAction)
├── Modal[size="full", viewport variant]
└── ModalBody[p-0]
    └── div.trace-graph-shell
        ├── button.trace-graph-shell__back["Back"]
        └── iframe[trace dashboard HTML]
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal | `src/components/ui/Modal.tsx` | `MODALS.md` | always |
| TableOfContents | `src/components/shared/TableOfContents.tsx` | — | always (extracts from content) |
| CompactTicketHeader | `src/components/TicketViewer/CompactTicketHeader.tsx` | — | when ticket exists |
| TicketDocumentTabs | `src/components/TicketViewer/TicketDocumentTabs.tsx` | — | when `subdocuments.length > 0` |
| MarkdownContent | `src/components/MarkdownContent/index.tsx` | `markdown-content.spec.md` | always (renders main or subdoc content) |
| TraceGraphAction | colocated TicketViewer action | this file | when standard trace store metadata exists |
| TraceGraphShell | `src/components/TicketViewer/TraceGraphShell.tsx` | this file | when user opens trace graph |
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
| Trace graph shell | `src/components/TicketViewer/TraceGraphShell.tsx` |
| Trace graph availability hook | `src/components/TicketViewer/useTraceStoreAvailability.ts` |
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

3. **Trace graph action** (conditional)
   - Appears only when the standard trace store exists for the ticket.
   - Uses a small secondary button, not a badge. Badges describe ticket metadata; this is an action.
   - Preferred placement: end of the badge bar after a flexible spacer on desktop. On narrow widths it wraps onto its own line below badges.
   - Label: `Trace Graph`.
   - Icon: use a Lucide graph/network-style icon if one is already available in the app bundle.
   - Hidden entirely when no trace store is present. Do not show a disabled button for the absent state.

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
- MarkdownContent uses the `ticket` typography variant from `markdown-content.spec.md`.
- Ticket prose keeps compact rhythm: moderate section gaps, readable paragraphs, styled task lists, and scrollable artifacts.
- Timestamp placement must not overlap the first rendered heading or first paragraph.
- Subdoc loading overlay: `absolute inset-0 z-10`, `bg-background/50`, pulsing "Loading…" text
- Subdoc error: inline text, `text-destructive`, `role="alert"`

### TraceGraphShell

- Opens from the `Trace Graph` action as a full-screen ticket-owned viewer.
- The shell owns app navigation: a floating semi-transparent `Back` button closes the shell and returns to the same ticket viewer state.
- The dashboard HTML does not own the back button and does not render MDT app chrome.
- The iframe source is ticket-based, for example:
  - `/spec-trace/trace-dashboard.html?project={projectCode}&ticket={ticketCode}`
- The dashboard HTML derives its data endpoint from `project` and `ticket`.
- The backing store path is standard and server-owned:
  - `{ticketsDir}/.trace/{ticketCode}/store.json`
- No header, title bar, store label, or other shell chrome is shown above the dashboard.
- The iframe receives the full viewport. The floating `Back` button overlays the top-left of the iframe with translucent background, border, text, and icon; it has no blur and becomes fully legible on hover/focus.
- The modal viewport variant has no outer padding, centered-card margin, rounded corners, or modal shadow. The iframe fills `100dvw × 100dvh`.
- The dashboard's own CSS and layout stay isolated inside the iframe.
- No ticket document tabs, ticket content, or TableOfContents are visible while the trace shell is open.
- This spec intentionally does not define the graph board internals. The dashboard HTML remains the owner of graph layout, filters, cards, edges, and graph-specific controls.

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
| trace store present | standard trace store metadata exists | `Trace Graph` action appears in header action area |
| trace store absent | metadata endpoint reports no store | no graph action is rendered |
| trace graph open | user clicks `Trace Graph` | full-screen TraceGraphShell replaces ticket content visually; ticket viewer remains the return context |
| trace graph loading | iframe is mounting or dashboard fetches store | floating Back remains visible; iframe may show dashboard-owned loading |
| trace graph unavailable after click | store disappears or fetch fails | floating Back remains visible; show compact shell-owned error in the viewport |

## Trace Graph Entry

The trace graph entry is ticket-scoped. The frontend passes only the project code and ticket code. It must not pass filesystem paths or long store URLs through the UI.

```text
Standard store path:
{ticketsDir}/.trace/{ticketCode}/store.json
```

Availability is checked before rendering the action. The user-facing model is "this ticket has a trace graph", not "choose a store file".

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

## Responsive

TraceGraphShell uses the full available viewport at all breakpoints:

| Breakpoint | Change |
|------------|--------|
| < 640px | Floating Back stays top-left; iframe remains full-width |
| 640-1024px | Same full-screen shell; dashboard iframe owns internal responsive behavior |
| > 1024px | Same full-screen shell; dashboard iframe owns internal responsive behavior |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| background | `--background` | modal body |
| border | `--border` | header separators, tab borders |
| primary | `--primary` | ticket code, active tab indicator, focus rings |
| foreground | `--foreground` | title text |
| muted-foreground | `--muted-foreground` | close button, timestamps, loading text |
| destructive | `--destructive` | subdoc error text |
| trace action | `--primary`, `--border` | secondary action focus, border, active treatment |
| trace back control | `--background`, `--border`, `--foreground` | floating translucent Back control |
| badge colors | `badge.css` data attributes | all badge variants |
| markdown prose | `--foreground`, `--muted-foreground`, `--primary`, `--border`, `--code-*` | ticket body typography, links, tables, code |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| modal | `.modal` | `MODALS.md` |
| badge | `.badge[data-status="..."]` | `badge.css` |
| markdown prose | `.prose.prose--ticket` proposed | `markdown-content.spec.md` |
| tabs | `.ticket-document-tabs` | inline Tailwind |
| tab trigger | Radix `data-[state=active]` | inline Tailwind |
| trace shell | `.trace-graph-shell` | TicketViewer colocated CSS |
| trace back control | `.trace-graph-shell__back` | floating overlay control |
| trace action | small secondary button class or inline Tailwind | `STYLING.md` inline-first rule |

## Modal / Overlay Compliance

TraceGraphShell uses the standard `Modal` Pattern B from `src/MODALS.md`, with one proposed extension: a full-viewport modal content variant for iframe-heavy tools. The existing `size="full"` width cap is not enough by itself because the graph dashboard needs the full viewport, no rounded card impression, and stable height.

Proposed viewport variant:

- modal content fills `100dvw × 100dvh`
- no outer padding or margin
- no rounded corners
- no modal card shadow
- `ModalBody` is `p-0`
- floating Back uses top-left absolute positioning, translucent background, no blur, and focus ring
- iframe area fills the viewport with no extra padding

## Extension notes

- Header badges differ from card badges: the header adds `assignee`. If badge display needs to be consistent, `CompactTicketHeader` and `TicketAttributeTags` should share a badge order config.
- Content processing: `processContentForDisplay()` removes H1 headers before rendering. `headerLevelStart={3}` shifts remaining headers down.
- The viewer fetches full ticket content on open if `ticket.content` is missing (shallow list ticket vs. full API ticket).
- Sub-document path resolution is handled by `subdocumentPath.ts` — not by the viewer directly.
- Close button position (`right-3 top-3`) must account for ToC toggle if one is added in the future.
- Trace graph store path resolution is handled by the backend from project config and ticket code. The frontend never constructs filesystem paths.
- The graph dashboard HTML remains a static, isolated graph reader. TicketViewer owns only the entry point and return shell.
