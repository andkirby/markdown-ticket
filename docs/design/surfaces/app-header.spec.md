# App Header

Top navigation bar — the chrome that persists across all views. Provides project identity, view switching, project selection, read-only/auth state, and the action menu.

## Composition

```text
nav.main-nav
├── div.nav-inner
│   ├── div.nav-left
│   │   ├── MobileLogo
│   │   ├── ViewModeSwitcher
│   │   └── ProjectSelector (flex-1)
│   └── div.nav-right
│       ├── ReadOnlyBadge (read-only/share/token access only)
│       ├── AuthStatusAction (locked state only)
│       │   ├── StatusChip
│       │   └── Button[Unlock]
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
| ReadOnlyBadge | `src/App.tsx` nav section | `auth-session-unlock.spec.md` | read-only/share/token access only |
| AuthStatusAction | `src/components/AuthUnlock/AuthStatusAction.tsx` | `auth-session-unlock.spec.md` | locked mode only |
| SortControls | `src/components/SortControls.tsx` | — | board or list view, desktop only |
| HamburgerMenu | `src/components/HamburgerMenu.tsx` | — | always (via SecondaryHeader) |

## Source files

| Type | Path |
|------|------|
| Component | `src/App.tsx` (nav section, lines ~211–243) |
| SecondaryHeader | `src/components/SecondaryHeader.tsx` |
| HamburgerMenu | `src/components/HamburgerMenu.tsx` |
| Auth status action | `src/components/AuthUnlock/AuthStatusAction.tsx` |
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

1. **ReadOnlyBadge** — one compact `Read only` badge in read-only modes only
2. **AuthStatusAction** — locked status chip before sort controls; hidden in owner/admin, no-auth-dev, and read-only modes
3. **SortControls** — hidden on `< sm` breakpoint; only when viewMode is `board` or `list`
4. **HamburgerMenu** — always visible, `≡` icon button

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | page load | blurred translucent bar |
| board view | viewMode=board | SortControls visible (desktop), ViewModeSwitcher shows board active |
| list view | viewMode=list | SortControls visible (desktop), ViewModeSwitcher shows list active |
| documents view | viewMode=documents | SortControls hidden, ViewModeSwitcher shows documents active |
| public read-only | anonymous visitor opens shared project | single `Read only` badge in nav; hamburger includes `Unlock access`; owner/admin menu items are not mounted |
| token read-only | visitor has scoped read token | single `Read only` badge in nav; hamburger includes `Unlock access`; visible projects include token scope; owner/admin menu items are not mounted |
| owner/admin | valid write/admin access | no inline auth chip; hamburger menu includes `Lock`; project mutation menu items available |
| no-auth-dev | auth disabled locally | AuthStatusAction hidden; local project mutation menu items available |

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
| muted | `--muted` | auth status chip background |

## Hamburger Menu Contents

The hamburger menu is the only structured action menu. Current items in order:

| Order | Item | Icon | Condition |
|-------|------|------|-----------|
| 1 | Lock | `LockKeyhole` | owner/admin only |
| 2 | Add Project | `Plus` | owner/admin only |
| 3 | Edit Project | `Edit` | owner/admin only and when a project is selected |
| 4 | Unlock access | `KeyRound` | read-only only |
| 5 | Sort by (mobile) | — | mobile only, board/list view |
| 6 | Sort direction (mobile) | `ArrowUpDown` | mobile only, board/list view |
| 7 | Clear Cache | `Trash2` | always; read-only clears browser storage only, owner/admin may also clear backend cache |
| 8 | Event History | `Eye`/`EyeOff` | when event history is available |
| 9 | Settings | `Settings` | owner/admin only |
| 10 | Theme selector | `Sun`/`Moon`/`Monitor` | always (quick access, also in Settings) |

The menu is a positioned dropdown: `absolute right-0 top-full mt-1 w-48`, with click-outside-to-close behavior.

## Extension notes

- New header-level features MUST choose between nav-left, nav-right, or hamburger menu — no new floating elements.
- If the hamburger menu grows beyond the current action set, consider splitting into a dedicated settings surface.
- Access-token entry is owned by `AuthStatusAction` and `AuthUnlockPanel`; do not add a second persistent header form.
- Owner lock/logout is owned by `HamburgerMenu`; do not render owner-session status text inside the action menu or as a second inline chip.
- `Lock` clears owner/admin privileges only. If the current project is still visible through public/share/read-token access, the header must downgrade to the single `Read only` badge and keep the current route visible.
- Owner/admin-only actions must not be mounted in read-only mode. Backend authorization remains authoritative, but hidden components must not run owner-only effects.
- Frontend API calls to `/api/*` must go through `authFetch` or an approved API wrapper so session cookies and owner-intent headers are applied consistently.
- Future settings entry point: Settings item in the hamburger menu opens the dedicated Settings modal. See `settings.spec.md`.
- ViewModeSwitcher does not persist its own state — persistence is handled by `App.tsx` via localStorage keys `lastBoardListMode` and `lastViewMode`.
