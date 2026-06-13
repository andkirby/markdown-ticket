# Project Browser

Full-screen overlay panel for browsing, filtering, and switching between projects visible to the current access mode. MDT-129 plus MDT-152 search extension.

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
└── ActiveCard (ProjectSelectorCard, isActive=true, useRailWidthConstraints=true)
    ├── RailExpandHint (faint ‹ chevron) — when inactive chips exist & not revealed (MDT-185)
    ├── hover trigger — reveal on `pointerenter` of the card wrapper (MDT-185)
    └── ChipsOverlay (absolute-positioned child, revealed inline to the right on hover) (MDT-185)
        └── ProjectSelectorChip[] (compact code-only, HoverCard wrapper, staggered entrance)

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
| Rail styles | `src/components/ProjectSelector/project-selector.css` |
| Ordering | `src/utils/selectorOrdering.ts` |

## Search Logic

- **Scope**: Client-side filter on preloaded project list
- **Visibility**: The preloaded list is already filtered by backend access mode: anonymous users receive `public-readonly` projects only; `unlisted-readonly` projects are absent unless opened through `/share/{shareId}`; read-token users receive all token-scoped projects plus public projects; owner/admin users receive all allowed projects.
- **Match**: Case-insensitive substring on project `code`, title (`name` in the data model), OR `description`
- **Current project exclusion**: If the query matches the current project code, title/name, or description, the current project does NOT appear in results
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

### Project Identity Accent

- Project identity accent is a current-user visual preference, not shared project metadata.
- The accent is selected from **Settings > Appearance > Project Accents**; this surface only consumes the selected preference.
- If no user-selected accent exists, derive a deterministic fallback via FNV-1a hash → 360° hue mapping with HSL(saturation 65%, lightness 45%). This produces a unique vivid color per project code; at 0.3 opacity the accent renders as a soft pastel.
- Store one canonical accent value per user/project pair; light and dark mode derive contrast and surface treatment from that value.
- The accent may also be a backend-validated custom hex value chosen from **Settings > Appearance > Project Accents**.
- Do not discover or auto-read project images from the project folder for this personal preference.
- If personal image support is added later, image selection must use user-owned preference storage; shared project-folder branding belongs to a separate design/CR.

### Project Card (Panel)

- `group relative flex items-center justify-center`
- Active: `bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg`
- Inactive: `bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md`
- Shared: `border rounded-xl px-2 sm:px-4 py-1.5 min-h-12 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200 ease-out cursor-pointer`
- Favorite star: `absolute top-1 right-1`, fav-star pattern from `THEME.md`
- Accent mark treatment: same card height; a fixed-width left identity area rendered via CSS with accent color. The identity bar uses a 250° diagonal gradient (transparent upper-right → opaque lower-left) at 0.5 opacity. The content area keeps the existing code/name/description hierarchy.
- Active card gradient: when accent is enabled and gradients are on, the card background uses `linear-gradient(to left, theme-bg, accent tint 0.15)` — accent bleeds from the left, theme background on the right.
- Flat mode (gradients off): identity bar is a 6px solid stripe at 0.3 opacity.

### Project Chip (Rail)

- `group relative inline-flex items-center justify-center`
- `bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80`
- `border border-gray-200/50 dark:border-slate-700/50 rounded-md px-2 py-1.5 h-12`
- `hover:bg-accent hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 hover:scale-[1.02]`
- `transition-all duration-200 ease-out cursor-pointer shadow-sm hover:shadow-md`
- Fav star (chip variant): `fav-star fav-star--chip` when favorited
- Accent mark: compact 28-32px color block or dot plus code; rail height stays `h-12`
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
| searching | User types in search input | Filter project cards by code/title/description substring; current project excluded if matched |
| no projects | 0 registered projects | Empty state: "No projects available" |
| no search results | Query matches zero projects (excluding current) | Empty state: "No projects match your search" |
| no visible projects | API returns zero listable projects for current access mode | Empty state: "No projects available" |

### Card

| State | Trigger | Visual Change |
|-------|---------|---------------|
| active | Current project | Blue gradient, blue border, shadow-md |
| inactive | Not current project | White/gray gradient, lighter border, shadow-sm |
| hover | Mouse enter | `hover:shadow-lg`, `-translate-y-0.5`, `scale-[1.02]` |
| favorited | `project.favorite === true` | Star icon visible, `rotate-[15deg]` |
| not favorited | `project.favorite === false` | No star (or hidden star on hover) |
| accent configured | Current user selected project accent | Card/chip uses selected accent for identity mark |
| custom hex accent | Current user selected validated hex | Card/chip uses the custom hex with derived light/dark contrast treatment |
| accent fallback | No current-user accent exists | Card/chip uses deterministic FNV-1a → 360° hue HSL fallback |
| filled identity | Browser card renders filled-left treatment | Same card row height; left identity area filled by accent color or user-owned image |
| read-only visible | project access mode is read-only | favorite star toggle hidden because it writes state |
| token-scoped visible | read token grants project scope | card is selectable like any other visible project |
| public visible | anonymous or token visitor can see public project | no favorite toggle |
| share-link merged | visitor opened `/share/{shareId}` while token-scoped | additional shared project appears without removing token-scoped projects |

### Chip

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | Rendered | Compact code-only display |
| hover | Mouse enter | HoverCard opens with full details (100ms delay) |
| favorited | `project.favorite === true` | `fav-star--chip` overlay visible |
| accent configured | Current user selected project accent | Chip shows compact accent mark while preserving `h-12` |
| gradient mode on | Accent gradients toggle is on | 25px gradient stripe on left edge, fading at 0.3 opacity |
| gradient mode off | Accent gradients toggle is off | 4px solid flat stripe on left edge at 0.3 opacity |
| mobile hidden | Viewport < 768px | Chips hidden; only active card shown |

### Rail — inactive chip reveal (MDT-185)

On desktop, inactive chips are **always hidden by default** and revealed by hovering the active card. There is no count threshold and no separate "+N" button — even a single inactive chip hides behind the active-card hover. This keeps the header quiet during daily scanning. The reveal is **not** a modal, tooltip, or dropdown: it is the same `ProjectSelectorChip` instances, rendered as an absolutely-positioned child of the active card wrapper so they overlay subsequent header content as bare inline elements.

Hover-reveal is progressive enhancement; keyboard users reach inactive projects via the project browser (click the active card).

| State | Trigger | Visual Change |
|-------|---------|---------------|
| collapsed (default) | inactive chips exist | Only the active card shows; faint `‹` chevron on its right edge hints at reveal |
| revealing | pointer enters the active card wrapper | Chips fade/slide in to the right of the active card (150ms per chip, ~25ms stagger) |
| sustained | pointer stays inside the active card wrapper (card or chip strip) | Overlay remains visible; moving onto the chip strip is still inside the wrapper, so no `pointerleave` fires — no debounce is needed |
| hiding | pointer leaves the active card wrapper | Overlay unmounts immediately (no debounce; the strip is a DOM descendant, so there is no card→strip gap to bridge) |
| selected | user clicks a revealed chip | Overlay unmounts **immediately** — selection completes the intent, so the rail returns to the collapsed default showing only the newly active card; `‹` chevron reappears if inactive projects remain |
| no chips | no inactive projects | No chevron, no hover behavior — active card only |
| mobile | viewport < 768px | No reveal — mobile already shows the active card only; switching uses the browser |

**On selection** — clicking a revealed chip is a completed intent, so the overlay unmounts **immediately**: the rail drops back to the collapsed default (active card only), and the `‹` chevron reappears if inactive projects remain. This is mandatory — the strip must never stay open after a switch.

**Overlay positioning** — `.project-chips-overlay` is `position: absolute; left: 100%; top: 50%; transform: translateY(-50%); margin-left: 0.5rem` (the +8px matches header `gap-2`), `z-index: 50`. It is a DOM child of the active card wrapper (which is `position: relative`), so no portal, no `getBoundingClientRect`, and no scroll/resize listeners are required — it tracks the card automatically.

**Why no debounce / no portal** — because the strip is a descendant of the hovered wrapper, `pointerenter`/`pointerleave` on the wrapper already cover moving between the card and the chips. This keeps the interaction to one `useState` boolean plus plain `onPointerEnter`/`onPointerLeave` handlers.

**Visual treatment** — the overlay container is transparent: no background, border, shadow, padding, or border-radius. Revealed chips render identically to the old inline chips (the chip is always compact; its `compact` prop is unused).

**Affordance** — `.project-expand-hint` chevron: `opacity: 0.4`, `color: var(--project-card-title-color)`, `right: -4px`, vertically centered, 14×14px, `transition: opacity 120ms ease-out`, `pointer-events: none`, `aria-hidden="true"`. Conditionally rendered only while collapsed and not revealed (`hasChips && !isExpanded`); unmounts once chips show.

**Animation** — per chip: `@keyframes chip-stagger-in` (`translateY(6px) scale(.95)→0/1` + opacity, 150ms, delay `min(index, 8) × 25ms`), `ease-out` / fill `both`. The keyframe lives in `src/styles/animations.css` (not the component CSS). There is intentionally no container-level entrance animation — only the per-chip stagger.

## Ordering

### Rail Order

1. Active project (always first)
2. Favorites (sorted by `lastUsedAt` descending)
3. Non-favorites (sorted by `lastUsedAt` descending)
4. Tiebreaker: `count` descending
5. Visible count limited by `preferences.visibleCount`
6. Mobile (<768px): only active project shown
7. Desktop (MDT-185): inactive chips never render inline — they always hide behind active-card hover-reveal; favorites-first ordering is preserved in the revealed overlay

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
| < 768px (mobile) | Rail: active card only, no chips, no reveal. Panel: full-width, single-column grid |
| < 480px (narrow mobile) | Header remains one row: title keeps `shrink-0`, search uses `min-w-0`, close remains 8×8 at far right |
| ≥ 768px (md) | Rail: active card only by default; inactive chips reveal on active-card hover as a transparent inline overlay to the right. Panel: 2-column grid |
| ≥ 768px | Panel max-w-4xl still applies; cards show description text at `sm:` breakpoint |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| Panel background | `--card` | `bg-white dark:bg-slate-900` |
| Panel border | `--border` | `border-gray-200 dark:border-slate-700` |
| Active card gradient | `--primary` (blue) | `from-blue-50 to-indigo-50` |
| Primary text | `--foreground` | Card title, code |
| Muted text | `--muted-foreground` | Card description |
| Project accent palette | proposed project accent tokens | Personal project identity marks; same source value derives light/dark surfaces |
| Accent identity bar | CSS `.project-card__identity` | 250° diagonal gradient, 0.5 opacity |
| Accent flat stripe | CSS `.project-card__identity` (gradients off) | 6px solid, 0.3 opacity |
| Chip accent gradient | CSS `.project-chip__accent-mark` (gradients on) | 25px gradient stripe, 0.3 opacity |
| Chip accent flat | CSS `.project-chip__accent-mark` (gradients off) | 4px solid, 0.3 opacity |
| Active card bg | CSS `.project-card[data-accent-gradients="true"]` | `linear-gradient(to left, theme-bg, accent/0.15)` |
| Star tokens | `--star-*` | Favorite indicators (see `THEME.md`) |
| Backdrop | — | `bg-black/50` (per MODALS.md) |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Favorite star | `.fav-star`, `.fav-star--card`, `.fav-star--chip` | `THEME.md`, `STYLING.md` |
| Project accent mark | proposed `.project-accent-mark` with `data-project-accent` | New reusable identity primitive for rail chips and browser cards |
| Filled identity area | proposed `.project-identity-fill` | Same-size color/image fill treatment inside cards |
| HoverCard | `HoverCard`, `HoverCardContent`, `HoverCardTrigger` | shadcn/ui |
| Rail expand hint | `.project-expand-hint` | `project-selector.css` (MDT-185) |
| Reveal overlay | `.project-chips-overlay`, `.__inner`, `.__chip` | `project-selector.css` (MDT-185) |
| Reveal keyframe | `@keyframes chip-stagger-in` | `styles/animations.css` (MDT-185) |
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

Read-only visitors can select visible listable projects normally. Token-scoped visitors must be able to switch among every project assigned to their named read token without re-entering a token. Project cards must not reveal private or unlisted project names, counts, paths, or disabled placeholders.

## Read Access Project Switching

| Visitor state | Visible projects | Switching rule |
|---------------|------------------|----------------|
| Anonymous | `public-readonly` only | can switch among public projects |
| Unlisted share link only | active shared project plus public projects if backend lists them | active shared project stays available by share-session grant |
| Named read token | token-assigned projects plus public projects | can switch among all visible projects with no token prompt |
| Named read token + share link | token-assigned projects, public projects, and the opened share-link project | share-link grant is additive and must not overwrite token scope |
| Owner/admin | all registered projects | normal owner selector behavior |

The project browser does not own authorization. It reflects the backend-filtered project list and must not implement privacy by client-side hiding alone.

## E2E Journey Contract

| Journey | Given | When | Expected |
|---------|-------|------|----------|
| token project switch | read-only session grants PRI and DOCS | open project browser | both PRI and DOCS are selectable |
| no repeated token | visitor switches PRI -> DOCS -> PRI | each project loads | no unlock prompt appears |
| public plus token | token grants PRI and public project PUB exists | open project browser | PRI and PUB both appear |
| share merge | token grants PRI and DOCS | visitor opens `/share/{shareId}` for OPS | PRI, DOCS, and OPS remain visible |
| privacy boundary | anonymous visitor opens project browser | private/unlisted projects exist | private/unlisted names are absent, not disabled placeholders |

## Favorite toggle behavior

1. User clicks star → `onFavoriteToggle(projectKey, event)` fires
2. `event.stopPropagation()` prevents card selection
3. `toggleFavorite(projectKey)` persists to `project-selector.json`
4. Star visual updates immediately via state

## Extension notes

- The "Add Project" flow is handled by `AddProjectModal`, not this surface
- HoverCard open/close delay is configurable (100ms default per MDT-129 AC)
- Cross-project ticket search from Cmd+K is specified in `quick-search.spec.md`
- Visibility is backend-filtered. Do not implement client-side hiding as the only privacy control.
- `unlisted-readonly` is reachable by share route, not by anonymous project browser listing.
- Read-only cards must not expose favorite toggles because selector favorites are mutable user state.
- Project accent display is personal visual preference. It must not reveal shared project branding or private project-folder assets to other users.
- Token-scoped read-only visitors use the same selector interactions as owner users for visible projects, but all write-oriented project actions remain hidden.
- MDT-185 hover-reveal: inactive rail chips are always hidden on desktop and revealed by hovering the active card as a transparent, absolutely-positioned inline overlay (no threshold, no "+N" button, no portal, no debounce — the strip is a DOM child of the hovered card wrapper). Keyboard users reach inactive projects through the project browser (click the active card); the `‹` chevron is decorative (`aria-hidden`). Favorites-first ordering is preserved in the revealed chips.
