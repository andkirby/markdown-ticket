# App Header

Top navigation bar — the chrome that persists across all views. Provides project identity, view switching, project selection, and the action menu.

## Composition

```text
nav.main-nav
├── div.nav-inner
│   ├── div.nav-left
│   │   ├── MobileLogo
│   │   ├── ViewModeSwitcher
│   │   └── ProjectSelector (flex-1)
│   └── div.nav-right
│       └── SecondaryHeader
│           ├── SortControls (board/list only, desktop only)
│           └── HamburgerMenu
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| MobileLogo | `src/components/AppHeader/MobileLogo.tsx` | — | always |
| ViewModeSwitcher | `src/components/ViewModeSwitcher/ViewModeSwitcher.tsx` | — | always |
| ProjectSelector | `src/components/ProjectSelector/index.tsx` | `project-browser.spec.md` | always |
| SecondaryHeader | `src/components/SecondaryHeader.tsx` | — | always |
| SortControls | `src/components/SortControls.tsx` | — | board or list view, desktop only |
| HamburgerMenu | `src/components/HamburgerMenu.tsx` | — | always (via SecondaryHeader) |

## Source files

| Type | Path |
|------|------|
| Component | `src/App.tsx` (nav section, lines ~211–243) |
| SecondaryHeader | `src/components/SecondaryHeader.tsx` |
| HamburgerMenu | `src/components/HamburgerMenu.tsx` |
| ViewModeSwitcher | `src/components/ViewModeSwitcher/ViewModeSwitcher.tsx` |
| AppHeader exports | `src/components/AppHeader/index.tsx` |

## Layout

- Fixed height: `h-16` (64px)
- Sticky top: `sticky top-0`
- Backdrop blur: `backdrop-blur-xl bg-white/90 dark:bg-gray-900/90`
- Border bottom: `border-b border-gray-200/50 dark:border-gray-700/50`
- Shadow: `shadow-sm`
- z-index: `z-50`
- Horizontal padding: `px-1 sm:px-2 lg:px-2`

### Nav-left slot (flex, items-center, gap-1 sm:gap-4)

1. **MobileLogo** — `flex-shrink-0`, always visible
2. **ViewModeSwitcher** — toggles between board/list/documents
3. **ProjectSelector** — `min-w-0 flex-1 overflow-hidden`, fills remaining space

### Nav-right slot (flex, items-center)

1. **SortControls** — hidden on `< sm` breakpoint; only when viewMode is `board` or `list`
2. **HamburgerMenu** — always visible, `≡` icon button

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | page load | blurred translucent bar |
| board view | viewMode=board | SortControls visible (desktop), ViewModeSwitcher shows board active |
| list view | viewMode=list | SortControls visible (desktop), ViewModeSwitcher shows list active |
| documents view | viewMode=documents | SortControls hidden, ViewModeSwitcher shows documents active |

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px (mobile) | `gap-1`, `px-1`, sort controls hidden (moved to hamburger menu), ProjectSelector may collapse |
| 640px+ (tablet) | `gap-4`, `px-2`, sort controls visible inline |
| 1024px+ (desktop) | same as tablet, ProjectSelector has full width |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| background | `--background` (via `bg-white/90`) | translucent bar |
| border | `--border` (via `border-gray-200/50`) | bottom separator |
| foreground | `--foreground` | text in nav items |
| primary | `--primary` | active states, focus rings |

## Hamburger Menu Contents

The hamburger menu is the only structured action menu. Current items in order:

| Order | Item | Icon | Condition |
|-------|------|------|-----------|
| 1 | Add Project | `Plus` | always |
| 2 | Edit Project | `Edit` | when a project is selected |
| 3 | Sort by (mobile) | — | mobile only, board/list view |
| 4 | Sort direction (mobile) | `ArrowUpDown` | mobile only, board/list view |
| 5 | Clear Cache | `Trash2` | always |
| 6 | Event History | `Eye`/`EyeOff` | toggled on: show "hide"; toggled off: show "show" |
| 7 | Settings | `Settings` | always |
| 8 | Theme selector | `Sun`/`Moon`/`Monitor` | always (quick access, also in Settings) |

The menu is a positioned dropdown: `absolute right-0 top-full mt-1 w-48`, with click-outside-to-close behavior.

## Extension notes

- New header-level features MUST choose between nav-left, nav-right, or hamburger menu — no new floating elements.
- If the hamburger menu exceeds 8 items, consider splitting into a dedicated settings surface.
- Future settings entry point: Settings item in the hamburger menu opens the dedicated Settings modal. See `settings.spec.md`.
- ViewModeSwitcher does not persist its own state — persistence is handled by `App.tsx` via localStorage keys `lastBoardListMode` and `lastViewMode`.
