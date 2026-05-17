# Project Browser

Full-screen overlay panel for browsing, filtering, and switching between all registered projects. MDT-129 plus MDT-152 search extension.

## Composition

```text
ProjectBrowserPanel
├── Backdrop (bg-black/50, backdrop-blur-sm)
└── Panel Container (max-w-4xl, pt-20)
    ├── PanelHeader
    │   ├── Title ("Projects")
    │   ├── SearchInput (pl-10, placeholder "Search projects...")
    │   │   └── SearchIcon (absolute left-3)
    │   └── CloseButton (p-2, rounded-lg, hover:bg-gray-100)
    └── ProjectList (max-h-[60vh], overflow-y-auto, p-6)
        ├── ProjectGrid (grid grid-cols-1 md:grid-cols-2, gap-4)
        │   └── ProjectSelectorCard[] (border rounded-xl)
        └── EmptyState (text-center py-12)
            ├── no-projects (0 registered)
            └── no-search-results (query matches nothing)

ProjectSelectorRail (composed by ProjectSelector)
├── ActiveCard (ProjectSelectorCard, isActive=true, useRailWidthConstraints=true)
└── InactiveChips[]
    └── ProjectSelectorChip (compact code-only, HoverCard wrapper)

LauncherButton (+ icon, rounded-full w-10 h-10)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| ProjectBrowserPanel | `ProjectSelector/ProjectBrowserPanel.tsx` | this file | panel open |
| ProjectSelectorCard | `ProjectSelector/ProjectSelectorCard.tsx` | — | always in panel |
| ProjectSelectorChip | `ProjectSelector/ProjectSelectorChip.tsx` | — | inactive projects in rail |
| ProjectSelectorRail | `ProjectSelector/ProjectSelectorRail.tsx` | — | always |
| LauncherButton | `ProjectSelector/LauncherButton.tsx` | — | always |

## Source files

| Type | Path |
|------|------|
| Panel | `src/components/ProjectSelector/ProjectBrowserPanel.tsx` |
| Card | `src/components/ProjectSelector/ProjectSelectorCard.tsx` |
| Chip | `src/components/ProjectSelector/ProjectSelectorChip.tsx` |
| Rail | `src/components/ProjectSelector/ProjectSelectorRail.tsx` |
| Launcher | `src/components/ProjectSelector/LauncherButton.tsx` |
| Types | `src/components/ProjectSelector/types.ts` |
| Index | `src/components/ProjectSelector/index.tsx` |
| Hook | `src/components/ProjectSelector/useProjectSelectorManager.ts` |
| Ordering | `src/utils/selectorOrdering.ts` |

## Search Logic

- **Scope**: Client-side filter on preloaded project list
- **Match**: Case-insensitive substring on project `code`, `name`, OR `description`
- **Current project exclusion**: If the query matches the current project code, name, or description, the current project does NOT appear in results
- **Debounce**: None needed (instant client-side filtering)
- **Max results**: Show all matches (no limit)
- **Placeholder**: `Search projects...`
- **Empty message**: `No projects match your search`

## Layout

### Panel

- Fixed full-viewport overlay, `z-50`
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Container: `pointer-events-none`, `items-start justify-center pt-20`
- Content: `pointer-events-auto`, `max-w-4xl`, `mx-4`, `bg-white dark:bg-slate-900`, `rounded-2xl`, `shadow-2xl`, `border border-gray-200 dark:border-slate-700`, `overflow-hidden`
- Header: one row, `flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700`
- Header title: `Projects`, `text-lg font-semibold`, `shrink-0`
- Search input: inline between title and close button, `flex-1 min-w-0 pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-sm`, search icon `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`
- Close button: `p-2 h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800`, positioned at the far right of the header row
- Project list: `max-h-[60vh] overflow-y-auto p-6`
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Empty state: `text-center py-12 text-gray-500`

### Project Card (Panel)

- `group relative flex items-center justify-center`
- Active: `bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg`
- Inactive: `bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md`
- Shared: `border rounded-xl px-2 sm:px-4 py-1.5 min-h-12 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 ease-out cursor-pointer`
- Favorite star: `absolute top-1 right-1`, fav-star pattern from `THEME.md`

### Project Chip (Rail)

- `group relative inline-flex items-center justify-center`
- `bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80`
- `border border-gray-200/50 dark:border-slate-700/50 rounded-md px-2 py-1.5 h-12`
- `hover:bg-accent hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 hover:scale-[1.02]`
- `transition-all duration-200 ease-out cursor-pointer shadow-sm hover:shadow-md`
- Fav star (chip variant): `fav-star fav-star--chip` when favorited
- HoverCard wrapper reveals full project details (code, name, description)

### Launcher Button

- `rounded-full w-10 h-10`, gradient bg, `Plus` icon from lucide-react
- `hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 ease-out`
- Ring indicator when panel is open: `ring-2 ring-blue-400 dark:ring-blue-600`

## States

### Panel

| State | Trigger | Visual Change |
|-------|---------|---------------|
| closed | Escape / backdrop click / project select | `display: none` |
| open | Click active card or launcher button | Backdrop visible, panel slides in, inline search input focused |
| searching | User types in search input | Filter project cards by code/name/description substring; current project excluded if matched |
| no projects | 0 registered projects | Empty state: "No projects available" |
| no search results | Query matches zero projects (excluding current) | Empty state: "No projects match your search" |

### Card

| State | Trigger | Visual Change |
|-------|---------|---------------|
| active | Current project | Blue gradient, blue border, shadow-md |
| inactive | Not current project | White/gray gradient, lighter border, shadow-sm |
| hover | Mouse enter | `hover:shadow-lg`, `-translate-y-0.5`, `scale-[1.02]` |
| favorited | `project.favorite === true` | Star icon visible, `rotate-[15deg]` |
| not favorited | `project.favorite === false` | No star (or hidden star on hover) |

### Chip

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | Rendered | Compact code-only display |
| hover | Mouse enter | HoverCard opens with full details (100ms delay) |
| favorited | `project.favorite === true` | `fav-star--chip` overlay visible |
| mobile hidden | Viewport < 768px | Chips hidden; only active card shown |

## Ordering

### Rail Order

1. Active project (always first)
2. Favorites (sorted by `lastUsedAt` descending)
3. Non-favorites (sorted by `lastUsedAt` descending)
4. Tiebreaker: `count` descending
5. Visible count limited by `preferences.visibleCount`
6. Mobile (<768px): only active project shown

### Panel Order

1. Favorites first (sorted by `lastUsedAt` descending)
2. Non-favorites (sorted by `lastUsedAt` descending)
3. Tiebreaker: `count` descending
4. No visible count limit — all projects shown

## Keyboard

| Key | Action |
|-----|--------|
| `Escape` | Close panel, including while the search input is focused |
| `Cmd+K` / `Ctrl+K` | Close panel (if open) — QuickSearch takes priority |
| `Tab` | Move focus from search input into the visible project cards; the close button is skipped in the tab sequence |
| `Enter` / `Space` on focused card | Select focused project and close panel |
| `ArrowRight` / `ArrowLeft` on focused card | Move focus to next / previous visible project card |
| `ArrowDown` / `ArrowUp` on focused card | Move focus by grid row, using the current rendered column count |
| `Home` / `End` on focused card | Move focus to first / last visible project card |

Focused project cards show the standard blue focus ring. Arrow navigation applies only while a project card has focus; the search input keeps native text-editing behavior. The close button remains pointer-accessible, and `Escape` remains the keyboard close path.

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 768px (mobile) | Rail: active card only, no chips. Panel: full-width, single-column grid |
| < 480px (narrow mobile) | Header remains one row: title keeps `shrink-0`, search uses `min-w-0`, close remains 8×8 at far right |
| ≥ 768px (md) | Rail: active card + chips. Panel: 2-column grid |
| ≥ 768px | Panel max-w-4xl still applies; cards show description text at `sm:` breakpoint |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| Panel background | `--card` | `bg-white dark:bg-slate-900` |
| Panel border | `--border` | `border-gray-200 dark:border-slate-700` |
| Active card gradient | `--primary` (blue) | `from-blue-50 to-indigo-50` |
| Primary text | `--foreground` | Card title, code |
| Muted text | `--muted-foreground` | Card description |
| Star tokens | `--star-*` | Favorite indicators (see `THEME.md`) |
| Backdrop | — | `bg-black/50` (per MODALS.md) |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Favorite star | `.fav-star`, `.fav-star--card`, `.fav-star--chip` | `THEME.md`, `STYLING.md` |
| HoverCard | `HoverCard`, `HoverCardContent`, `HoverCardTrigger` | shadcn/ui |
| Modal overlay | Fixed overlay pattern | `MODALS.md` |

## Modal conventions (MODALS.md compliance)

- ✅ `bg-black/50 backdrop-blur-sm` backdrop
- ✅ Escape to close
- ✅ Click outside to close (via `data-testid="project-panel-content"` boundary)
- ✅ `pointer-events-none` on outer container
- ✅ `pointer-events-auto` on content
- ✅ Body scroll prevention
- Focus trapping remains out of scope for MDT-152; do not regress existing focus-on-open behavior
- `role="dialog"` / `aria-modal` should be added if the panel modal shell is touched during implementation

## Project selection behavior

1. User clicks card/chip → `onProjectSelect(projectKey)` fires
2. `trackProjectUsage(projectKey)` updates `lastUsedAt` and `count`
3. `setSelectedProject(project)` updates app state
4. Navigation to `/prj/{key}` (preserving last view mode)
5. Panel closes after selection (panel calls `onClose()` in its `handleProjectSelect`)

## Favorite toggle behavior

1. User clicks star → `onFavoriteToggle(projectKey, event)` fires
2. `event.stopPropagation()` prevents card selection
3. `toggleFavorite(projectKey)` persists to `project-selector.json`
4. Star visual updates immediately via state

## Extension notes

- The "Add Project" flow is handled by `AddProjectModal`, not this surface
- HoverCard open/close delay is configurable (100ms default per MDT-129 AC)
- Cross-project ticket search from Cmd+K is specified in `quick-search.spec.md`
