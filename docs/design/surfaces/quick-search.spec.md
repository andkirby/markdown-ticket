# Quick Search

Cmd+K modal for finding and opening tickets by key, title, or cross-project query. Supports current-project search, cross-project ticket key lookup, and scoped project search. MDT-136 + cross-project extension.

## Composition

```text
QuickSearchModal
├── Backdrop (bg-black/50, backdrop-blur-sm)
└── Modal Container (max-w-[900px], pt-[15vh])
    ├── SearchInput
    │   ├── SearchIcon (absolute left-3)
    │   └── InputField (pl-10, text-lg, border-0)
    ├── ModeIndicator (below input, left-aligned)
    └── QuickSearchResults
        ├── LoadingState
        │   ├── Spinner (centered, 24px)
        │   └── SkeletonCards[] (3 cards, pulse animation)
        ├── SectionLabels ("Current Project" | "Cross-Project")
        ├── ResultList (max-h-[50vh], overflow-y-auto, divide-y)
        │   ├── TicketResultItem[] (px-4, py-3, hover:bg-gray-50)
        │   └── ProjectContextLabel (for cross-project tickets)
        └── NoResults (p-8, text-center)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| SearchInput | `QuickSearchInput.tsx` | — | always |
| QuickSearchResults | `QuickSearchResults.tsx` | — | always |

## Source files

| Type | Path |
|------|------|
| Modal | `src/components/QuickSearch/QuickSearchModal.tsx` |
| Input | `src/components/QuickSearch/QuickSearchInput.tsx` |
| Results | `src/components/QuickSearch/QuickSearchResults.tsx` |
| Hook | `src/hooks/useQuickSearch.ts` |
| Exports | `src/components/QuickSearch/index.ts` |

## Layout

- Fixed full-viewport overlay, `z-50`
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Modal container: `pointer-events-none` wrapper, `items-start justify-center pt-[15vh]`
- Content card: `pointer-events-auto`, `max-w-[900px]`, `mx-4`, `bg-white dark:bg-slate-900`, `rounded-xl`, `shadow-2xl`, `overflow-hidden`
- Search input section: `border-b border-gray-200 dark:border-gray-700`
- Input: `w-full pl-10 pr-4 py-3 text-lg`, no border/ring, transparent bg
- Search icon: `absolute left-3 top-1/2 -translate-y-1/2`, `h-5 w-5 text-gray-400`
- Results area: `max-h-[50vh] overflow-y-auto`, `divide-y divide-gray-100 dark:divide-gray-800`
- Result item: `w-full px-4 py-3 text-left`, flex row with `gap-3`
- Ticket key: `font-mono text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0`
- Ticket title: `text-gray-900 dark:text-gray-100 truncate`

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| closed | Escape / click outside / Backspace on empty | `display: none` |
| open | Cmd+K / Ctrl+K | Backdrop visible, input auto-focused, query reset to `""`, selectedIndex reset to `0` |
| idle | Open, no query | All tickets shown (up to `MAX_RESULTS` = 10) |
| filtering | User types (current project mode) | Client-side filter fires immediately (no debounce); results update in real-time |
| debouncing | User types (cross-project mode) | Show previous results while waiting for 300ms pause |
| loading | Cross-project fetch initiated | Spinner + 3 skeleton cards in results area |
| loaded | Cross-project results received | Results replace skeletons |
| error | Fetch failed | Error message with retry option |
| navigating | ↑ / ↓ arrow keys | `selectedIndex` moves; selected item gets `bg-blue-50 dark:bg-blue-900/20` |
| selecting | Enter on result | `onSelectTicket` fires, modal closes |
| no results | Query matches zero tickets | Empty state with contextual hint |
| body scroll lock | Modal open | `document.body.style.overflow = 'hidden'` |

## Keyboard

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Toggle modal open/close |
| `Escape` | Close modal |
| `↑` / `↓` | Navigate result selection |
| `Enter` | Select highlighted result, close modal |
| `Tab` | Cycle between sections (current → cross-project) |
| `Shift+Tab` | Reverse cycle sections |
| `Backspace` (empty input) | Close modal |

## Search Modes

The modal operates in different modes based on query syntax:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Current Project** | Default (no special syntax) | Filter current project tickets client-side |
| **Specific Project** | `@{CODE} {query}` prefix | Load and search tickets from specified project |
| **Cross-Project Ticket Key** | `{CODE}-{number}` pattern | Search for specific ticket across all projects |

### Query Syntax

#### Mode 1: Current Project (Default)

```text
badge fix
```

-> Search current project tickets by title/keyword

#### Mode 2: Specific Project

```text
@MDT badge
@ABC login redirect
```

-> Load tickets from project `MDT` or `ABC`, filter by text. Requires `@CODE` followed by a space and search text.

#### Mode 3: Cross-Project Ticket Key

```text
ABC-42
MDT-136
```

-> Search for ticket across all projects. Pattern: `{PROJECT_CODE}-{NUMBER}` where code is 2-5 uppercase letters and number is 1-5 digits. Regex: `/^[A-Z]{2,5}-\d{1,5}$/i`

#### Invalid/Incomplete Project Scope

```text
@mdt
@abc
```

-> Do not trigger backend search until the user enters `@CODE {query}`. Project discovery/filtering belongs to ProjectBrowserPanel.

## Search Logic

### Current Project Mode
- **Scope**: Current project tickets only (preloaded in memory)
- **Matching**: AND logic — all whitespace-separated terms must match
- **Fields searched** (per term): key number (`"136"` → matches `MDT-136`), full code (`"mdt-136"`), title substring (case-insensitive)
- **Max results**: `MAX_RESULTS = 10`
- **No debounce needed**: client-side filtering is instant

### Cross-Project Modes
- **Debounce**: 300ms before triggering fetch
- **Max results**: 5 per project, max 15 total
- **Cache**: Recent project tickets cached locally with 5 min TTL
- **Current project exclusion**: If current project is `MDT` and user types `MDT-136`, show it in "Current Project" or cross-project results as an explicit ticket match. If user types `@MDT badge` while in project `MDT`, search MDT without exclusion because the user explicitly scoped the query.

## Async Loading

Cross-project ticket search requires backend fetch:

```text
User Types -> Debounce (300ms) -> Loading State -> Results
```

### Skeleton Design

- Count: 3 skeleton cards
- Height: Match ticket result item (~48px)
- Animation: Subtle pulse (opacity 0.3 → 0.5 → 0.3)
- Color: `bg-gray-200 dark:bg-gray-800`

### Spinner
- Position: Centered in results area
- Size: 24px
- Color: `text-gray-400`
- Animation: Rotate

## Mode Indicator

Visual pill below input, above results, left-aligned:

| Mode | Text | Style |
|------|------|-------|
| Current Project | `In: {CODE}` | `bg-gray-100 text-gray-700` |
| Specific Project | `In: {CODE}` | `bg-blue-100 text-blue-700` |
| Cross-Project Key | `Searching: {CODE}-{num}` | `bg-purple-100 text-purple-700` |

### Results Section Labels

When showing cross-project results alongside current project results:

- **"Current Project"** — tickets from the active project
- **"Cross-Project"** — tickets from other projects

Labels: `text-xs uppercase tracking-wide text-gray-500`

## Empty States

| Context | Message | Hint |
|---------|---------|------|
| No current project results | `No tickets found in {CODE}` | "Try searching across projects with: `ABC-42` (ticket key) or `@ABC search terms` (specific project)" |
| No cross-project results (query text) | `No tickets found matching "{query}"` | "Check your search terms and try again." |
| No cross-project results (ticket key) | `Ticket {CODE}-{NUMBER} not found` | "Check the ticket key and try again." |
| Invalid project code in @syntax | `Project {CODE} not found` | "Check the project code and try again." |

## API Endpoints

### Cross-Project Ticket Search

```text
POST /api/projects/search
```

**Modes**: `ticket_key` (specific ticket lookup), `project_scope` (specific project search)

**Request**:

```json
{
  "mode": "project_scope",
  "query": "login redirect",
  "projectCode": "ABC",
  "limitPerProject": 5,
  "limitTotal": 15
}
```

**Response**:

```json
{
  "results": [
    {
      "ticket": {
        "code": "ABC-42",
        "title": "Auth service refactor",
        "status": "in-progress"
      },
      "project": { "code": "ABC", "name": "Another Project" }
    }
  ],
  "total": 5
}
```


## Accessibility

- `role="combobox"` on input with `aria-expanded`
- `aria-activedescendant` pointing to selected result
- `role="listbox"` on results container
- `role="option"` on each result item
- `aria-label` on mode indicator
- Screen reader: "Searching in project {CODE}" on mode change, "Found N tickets" on results load, "No results found" on empty

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px (mobile) | Full-width modal (`mx-4` keeps 16px gutter), `max-w-[900px]` still applies, 50vh result cap |
| ≥ 640px | Same — modal width is content-driven up to 900px |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| Modal background | `--card` | `bg-white dark:bg-slate-900` |
| Primary text | `--foreground` | Ticket title |
| Muted text | `--muted-foreground` | Placeholder, no-results |
| Border | `--border` | Divider between input and results |
| Primary | `--primary` | Ticket key text color (blue-600/blue-400) |
| Backdrop | — | `bg-black/50` (per MODALS.md convention) |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Modal overlay | Fixed overlay pattern | `MODALS.md` |
| Search icon | Inline SVG | `STYLING.md` (one-off) |
| Result items | Inline Tailwind | `STYLING.md` (local layout) |

## Modal conventions (MODALS.md compliance)

- ✅ `bg-black/50 backdrop-blur-sm` backdrop
- ✅ Escape to close
- ✅ Click outside to close (`mousedown` listener on `document`)
- ✅ `pointer-events-none` on outer container
- ✅ `pointer-events-auto` on content card
- ✅ Body scroll prevention (set on open, restored on close)
- ⚠️ Focus trapping: not currently implemented (acceptable for search-only modal)
- ⚠️ `role="dialog"` / `aria-modal`: not currently applied (acceptable — input gets focus)

## Implementation Phases

### Phase 1: ProjectBrowserPanel Search
- Add search input to panel
- Client-side filtering
- Current project exclusion

### Phase 2: Cross-Project Ticket Key Search
- Detect ticket key pattern (regex)
- Backend endpoint `POST /api/projects/search`
- Loading states (spinner + skeleton)
- Mode indicator
- Results section labels

### Phase 3: Project-Scoped Search
- Detect `@CODE {query}` syntax
- Reuse `POST /api/projects/search` with `mode: "project_scope"`
- Search-result caching (5 min TTL)

### Phase 4: Polish
- Keyboard section navigation (Tab)
- Screen reader announcements
- Error states
- Performance optimization

## Extension notes

- Result items currently show key + title only. Status/priority badges and match highlighting are potential additions but out of scope for the base spec.
- The modal is rendered via `createPortal` to `document.body`.
