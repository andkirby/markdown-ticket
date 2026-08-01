# Design Tokens

Reference for the CSS custom properties (design tokens) that drive theming, color, and density across the app.

**Source of truth:** [`src/styles/design-tokens.css`](styles/design-tokens.css) — imported first by `src/index.css`, so every other layer inherits these values. `THEME.md` is the human-readable mirror; if the two disagree, the CSS file wins. See [`src/styleguide.html`](styleguide.html) for a live rendered swatch page.

---

## Two palettes

The token file holds **two aligned palettes** (both retuned to the `designs/board-zai` v3 system):

| Palette | Format | Consumed as | Used by |
|---|---|---|---|
| **shadcn HSL set** | bare HSL channels (`244.5 57.9% 50.6%`) | `oklch(var(--primary))` in CSS, or Tailwind `bg-primary` / `text-primary-foreground` | base surfaces, Tailwind utilities, shadcn primitives |
| **v3 semantic set** | hex (`#dc2626`) | bare `var(--prio-critical)` in CSS | the design3 system: bg tiers, badges, card accents, splines |

Never wrap a v3 hex token in `hsl()` — it is already a color. Never use a shadcn token bare — it is raw channels, not a color.

---

## shadcn HSL palette

### Light (`:root`)

| Token | Value | Usage |
|---|---|---|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `222.2 47.4% 11.2%` | Primary text |
| `--card` / `--card-foreground` | `0 0% 100%` / `222.2 47.4% 11.2%` | Card surface + text |
| `--popover` / `--popover-foreground` | `0 0% 100%` / `222.2 47.4% 11.2%` | Dropdown/popover surface + text |
| `--primary` / `--primary-foreground` | `244.5 57.9% 50.6%` (indigo-700) / `0 0% 100%` | Primary actions |
| `--secondary` / `--secondary-foreground` | `213.3 29.7% 82.2%` (gray tonal) / `222.2 47.4% 11.2%` | Secondary button (medium emphasis) |
| `--muted` / `--muted-foreground` | `215 27.3% 91.4%` / `215.3 19.3% 34.5%` | Muted surface / muted text |
| `--accent` / `--accent-foreground` | `215 27.3% 91.4%` / `222.2 47.4% 11.2%` | Accent surface |
| `--destructive` / `--destructive-foreground` | `0 84.2% 60.2%` / `0 0% 100%` | Errors, danger |
| `--border` / `--input` | `218.8 16.5% 79.8%` | Borders / inputs (shared value) |
| `--ring` | `244.5 57.9% 50.6%` | Focus ring |

### Dark (`.dark`)

Applied via a `.dark` class on the root element. Background shifts near-black, text near-white, primary brightens.

| Token | Value |
|---|---|
| `--background` | `220 29% 6.1%` |
| `--foreground` | `215 35.3% 93.3%` |
| `--card` / `--popover` | `214.3 24.1% 22.7%` |
| `--primary` | `243.4 75.4% 58.6%` |
| `--secondary` | `215.3 19.3% 34.5%` |
| `--muted` / `--accent` | `219.1 24.7% 18.2%` |
| `--muted-foreground` | `216 17.4% 66.3%` |
| `--destructive` | `0 62.8% 30.6%` |
| `--border` / `--input` | `213.6 16.1% 30.4%` |
| `--ring` | `243.4 75.4% 58.6%` |

---

## v3 semantic palette

The design3 system. Consumed as bare `var(--x)`. These hold the bg-tier grammar (which replaces decorative borders), the badge/accent colors, and the density slots.

### Surface tiers & structure

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-subtle` | `#eef1f5` | `#1a1f2b` | Recessed tier (columns, chips, nav panes) |
| `--bg-muted` | `#e3e8ef` | `#232b3a` | Mid tier |
| `--bg-elevated` | `#ffffff` | `#2c3848` | Raised surface (cards, header, inputs) |
| `--border-strong` | `#8a93a2` | `#6b7686` | The only structural border token (hover/active reveals) |
| `--text-muted` | `#475569` | `#9aa6b8` | Secondary text |
| `--text-subtle` | `#5b6675` | `#8b97ab` | Tertiary text |
| `--primary-light` | `#eef2ff` | `#1e1b4b` | Primary tint (active project, selection) |

### Status (badge fg / bg pairs)

| Status | fg token | Light fg/bg | Dark fg/bg |
|---|---|---|---|
| backlog | `--status-backlog` | `#64748b` / `#f1f5f9` | `#94a3b8` / `#1a2231` |
| open | `--status-open` | `#3b82f6` / `#eff6ff` | `#60a5fa` / `#172554` |
| progress | `--status-progress` | `#d97706` / `#fffbeb` | `#fbbf24` / `#422006` |
| done | `--status-done` | `#059669` / `#ecfdf5` | `#34d399` / `#064e3b` |
| deferred | `--status-deferred` | `#ea580c` / `#fff7ed` | `#fb923c` / `#431407` |
| rejected | `--status-rejected` | `#dc2626` / `#fef2f2` | `#f87171` / `#450a0a` |
| hold | `--status-hold` | `#7c3aed` / `#f5f3ff` | `#a78bfa` / `#2e1065` |

Status → token mapping (proposed→backlog, approved→open, in-progress→progress, implemented→done, rejected→rejected, on-hold→hold, invalid→rejected) lives in [`badge.css`](components/Badge/badge.css).

### Priority (`--prio-*`)

| Token | Light | Dark |
|---|---|---|
| `--prio-critical` | `#dc2626` | `#f87171` |
| `--prio-high` | `#ea580c` | `#fb923c` |
| `--prio-medium` | `#d97706` | `#fbbf24` |
| `--prio-low` | `#2563eb` | `#60a5fa` |

Drives the priority icon glyph color and the critical/high card accent stripe.

### Epic (`--epic-*`), Spline (`--spline-*`), Type (`--type-*`)

| Group | Light | Dark |
|---|---|---|
| `--epic-1..4` | `#4f46e5 #06b6d4 #f59e0b #10b981` | `#818cf8 #22d3ee #fbbf24 #34d399` |
| `--spline-blocker` / `--spline-related` | `#dc2626` / `#0d9488` | `#f87171` / `#2dd4bf` |
| `--type-feature/bug/architecture/documentation/research` | `#3b82f6 #ea580c #7c3aed #0891b2 #db2777` | `#60a5fa #fb923c #a78bfa #22d3ee #f472b6` |

### Density slots (mode-independent px)

| Token | Value | Usage |
|---|---|---|
| `--pad-y` / `--pad-x` | `10px` / `12px` | Card padding (driven by `CardDensity` pref) |
| `--fs-xs` / `--fs-md` | `11px` / `13px` | Card font sizes |
| `--radius-card` | `8px` | Card corner radius |
| `--sz-icon` | `16px` | Fixed lucide glyph size beside the ticket key |

---

## Usage

```css
/* shadcn HSL token — wrap in hsl() */
.btn { background: oklch(var(--primary)); border-color: oklch(var(--border)); }
.btn { background: oklch(var(--primary) / 0.5); } /* with opacity */

/* v3 semantic token — use bare */
.ticket-card { border-left: 3px solid var(--card-accent, transparent); }
.badge[data-priority="critical"] {
  background: color-mix(in srgb, var(--prio-critical) 15%, transparent);
  color: var(--prio-critical);
}
```

```tsx
/* Tailwind utilities resolve to the shadcn HSL tokens */
<div className="bg-primary text-primary-foreground border-border" />
```

See also: [STYLING.md](STYLING.md) — theming contract & component patterns · [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) — badge color system.

---

## Typography

### Font Families

| Usage | Font | Tailwind Class |
|-------|------|----------------|
| Body | Inter | `font-sans` |
| Code | JetBrains Mono | `font-mono` |

### Heading Scale

Defined in `@layer base` (`src/styles/base.css` lines 17-43):

| Element | Size | Responsive |
|---------|------|------------|
| `h1` | `text-3xl` | `lg:text-4xl` |
| `h2` | `text-2xl` | `lg:text-3xl` |
| `h3` | `text-xl` | `lg:text-2xl` |
| `h4` | `text-lg` | `lg:text-xl` |
| `h5` | `text-base` | `lg:text-lg` |
| `h6` | `text-sm` | `lg:text-base` |

All headings: `font-semibold tracking-tight`

---

## Spacing

Uses Tailwind's default spacing scale (4px base unit):

| Token | Value |
|-------|-------|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `8` | 32px |

---

## Border Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.75rem` (12px) |

Tailwind classes: `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`

---

## Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Normal content |
| Dropdown | 50 | Dropdowns, popovers |
| Modal | 50 | Modal dialogs |
| Toast | 100 | Notifications |

See [MODALS.md](MODALS.md) for modal z-index conventions.

---

## Star Colors (Favorite Indicator)

Themeable star icon tokens for project favorites. Defined in `src/styles/entities/fav-star.css`.

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--star-inactive-fill` | `transparent` | Empty star fill |
| `--star-inactive-color` | `gray-400` | Empty star stroke |
| `--star-hover-fill` | `yellow-500` | Hover fill (golden) |
| `--star-hover-color` | `yellow-600` | Hover stroke |
| `--star-active-fill` | `gray-400` | Favorited fill |
| `--star-active-color` | `gray-500` | Favorited stroke |
| `--star-active-hover-fill` | `yellow-500` | Favorited hover fill |
| `--star-active-hover-color` | `yellow-600` | Favorited hover stroke |
| `--star-chip-fill` | `gray-400` | Chip variant fill |
| `--star-chip-color` | `gray-500` | Chip variant stroke |

### Dark Mode

| Token | Value | Difference |
|-------|-------|------------|
| `--star-inactive-color` | `slate-500` | Darker gray |
| `--star-hover-fill` | `yellow-400` | Brighter yellow |
| `--star-active-fill` | `slate-500` | Darker gray |
| `--star-chip-fill` | `slate-500` | Darker gray |

### Usage

```tsx
import { Icon } from '../shared/Icon'

// Base star (unfavorited)
<Icon name="fav-star" className="fav-star" />

// Active/favorited
<Icon name="fav-star" className="fav-star active" />

// Chip variant (compact, rotated)
<Icon name="fav-star" className="fav-star fav-star--chip" />

// Card variant (inline)
<Icon name="fav-star" className="fav-star fav-star--card" />
```

**See also:** [STYLING.md](STYLING.md) - SVG icons pattern

