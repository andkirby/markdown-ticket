# Design Tokens

Reference for the CSS custom properties (design tokens) that drive theming, color, and density across the app.

**Source of truth:** [`frontend/src/styles/design-tokens.css`](styles/design-tokens.css) — imported first by `frontend/src/index.css`, so every other layer inherits these values. `THEME.md` is the human-readable mirror; if the two disagree, the CSS file wins. See [`frontend/src/styleguide.html`](styleguide.html) for a live rendered swatch page.

---

## Two palettes

The token file holds **two aligned palettes** (both retuned to the `designs/board-zai` v3 system):

| Palette | Format | Consumed as | Used by |
|---|---|---|---|
| **shadcn set** | bare OKLCH channels (`0.457 0.214 277.0`) | `oklch(var(--primary))` in CSS, or Tailwind `bg-primary` / `text-primary-foreground` | base surfaces, Tailwind utilities, shadcn primitives |
| **v3 semantic set** | full `oklch()` colors (`oklch(0.577 0.215 27.3)`) | bare `var(--prio-critical)` in CSS | the design3 system: bg tiers, badges, card accents, splines |

Never wrap a v3 token in `oklch()` — it is already a color. Never use a shadcn token bare — it is raw OKLCH channels, not a color.

---

## shadcn OKLCH palette

### Light (`:root`)

| Token | Value | Usage |
|---|---|---|
| `--background` | `1.0 0.0 89.9` | Page background |
| `--foreground` | `0.208 0.04 265.7` | Primary text |
| `--card` / `--card-foreground` | `1.0 0.0 89.9` / `0.208 0.04 265.7` | Card surface + text |
| `--popover` / `--popover-foreground` | `1.0 0.0 89.9` / `0.208 0.04 265.7` | Dropdown/popover surface + text |
| `--primary` / `--primary-foreground` | `0.457 0.214 277.0` (indigo) / `1.0 0.0 89.9` | Primary actions |
| `--secondary` / `--secondary-foreground` | `0.853 0.025 253.9` (gray tonal) / `0.208 0.04 265.7` | Secondary button (medium emphasis) |
| `--muted` / `--muted-foreground` | `0.929 0.011 256.7` / `0.445 0.037 257.3` | Muted surface / muted text |
| `--accent` / `--accent-foreground` | `0.929 0.011 256.7` / `0.208 0.04 265.7` | Accent surface |
| `--destructive` / `--destructive-foreground` | `0.637 0.208 25.3` / `1.0 0.0 89.9` | Errors, danger |
| `--border` / `--input` | `0.835 0.017 262.7` | Borders / inputs (shared value) |
| `--ring` | `0.457 0.214 277.0` | Focus ring |

### Dark (`.dark`)

Applied via a `.dark` class on the root element. Background shifts near-black, text near-white, primary brightens.

| Token | Value |
|---|---|
| `--background` | `0.164 0.014 264.1` |
| `--foreground` | `0.944 0.011 256.7` |
| `--card` / `--popover` | `0.336 0.033 255.8` |
| `--primary` | `0.51 0.23 276.9` |
| `--secondary` | `0.445 0.037 257.3` |
| `--muted` / `--accent` | `0.288 0.03 262.7` |
| `--muted-foreground` | `0.722 0.029 258.4` |
| `--destructive` | `0.396 0.133 25.7` |
| `--border` / `--input` | `0.412 0.027 254.6` |
| `--ring` | `0.51 0.23 276.9` |

---

## v3 semantic palette

The design3 system. Consumed as bare `var(--x)`. These hold the bg-tier grammar (which replaces decorative borders), the badge/accent colors, and the density slots.

### Surface tiers & structure

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-subtle` | `oklch(0.957 0.006 255.5)` | `oklch(0.24 0.024 267.0)` | Recessed-soft tier (tab bars, nav rails, columns, chips) |
| `--bg-muted` | `oklch(0.929 0.011 256.7)` | `oklch(0.288 0.03 262.8)` | Recessed tier (hover, inputs, secondary chrome) |
| `--bg-elevated` | `oklch(1.0 0.0 89.9)` | `oklch(0.337 0.033 255.7)` | Raised surface (cards, header, modals, popovers) |
| `--border-strong` | `oklch(0.661 0.025 260.7)` | `oklch(0.562 0.028 257.7)` | The only structural border token (hover/active reveals) |
| `--text-muted` | `oklch(0.446 0.037 257.3)` | `oklch(0.722 0.03 258.4)` | Secondary text |
| `--text-subtle` | `oklch(0.506 0.027 256.2)` | `oklch(0.674 0.033 260.7)` | Tertiary text |
| `--primary-text` | `oklch(0.457 0.214 277)` | `oklch(0.75 0.14 277)` | Indigo accent for text on surfaces (7.9:1 light / ~5.2:1 dark) |

### Interaction-state ramp

Hover is always the neutral tier; active/selected is always the accent family at two strengths — **surface** (tint + `--state-active-fg` signal) and **solid** (compact controls: `oklch(var(--primary))` + `oklch(var(--primary-foreground))`). Never a primary tint for hover. See [STYLING.md](STYLING.md) §Interaction-state ramp.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--state-hover-bg` | `var(--bg-muted)` | (same alias) | Hover/pointing fill — neutral recessed tier ("cursor is here") |
| `--state-active-bg` | `oklch(0.90 0.05 277)` | `oklch(0.30 0.10 281)` | Active/selected SURFACE tint ("committed / current") — explicit per theme; the old `--primary-light` alias was 1.01:1 on `--bg-subtle` in light (invisible) and was removed |
| `--state-active-fg` | `var(--primary-text)` | (same alias) | Active/selected signal — text, ring, or underline |

### Status (badge fg / bg pairs)

| Status | fg token | Light fg/bg | Dark fg/bg |
|---|---|---|---|
| backlog | `--status-backlog` | `oklch(0.554 0.041 257.4)` / `oklch(0.968 0.007 247.9)` | `oklch(0.711 0.035 256.8)` / `oklch(0.252 0.031 262.6)` |
| open | `--status-open` | `oklch(0.623 0.188 259.8)` / `oklch(0.97 0.014 254.6)` | `oklch(0.714 0.143 254.6)` / `oklch(0.282 0.087 267.9)` |
| progress | `--status-progress` | `oklch(0.666 0.157 58.3)` / `oklch(0.987 0.021 95.3)` | `oklch(0.837 0.164 84.4)` / `oklch(0.286 0.064 53.8)` |
| done | `--status-done` | `oklch(0.596 0.127 163.2)` / `oklch(0.979 0.021 166.1)` | `oklch(0.773 0.153 163.2)` / `oklch(0.378 0.073 168.9)` |
| deferred | `--status-deferred` | `oklch(0.646 0.194 41.1)` / `oklch(0.98 0.016 73.7)` | `oklch(0.758 0.159 55.9)` / `oklch(0.266 0.076 36.3)` |
| rejected | `--status-rejected` | `oklch(0.577 0.215 27.3)` / `oklch(0.971 0.013 17.4)` | `oklch(0.711 0.166 22.2)` / `oklch(0.258 0.089 26.0)` |
| hold | `--status-hold` | `oklch(0.541 0.247 293.0)` / `oklch(0.969 0.016 293.8)` | `oklch(0.709 0.159 293.5)` / `oklch(0.283 0.135 291.1)` |

Status → token mapping (proposed→backlog, approved→open, in-progress→progress, implemented→done, rejected→rejected, on-hold→hold, invalid→rejected) lives in [`badge.css`](components/Badge/badge.css).

### Priority (`--prio-*`)

| Token | Light | Dark |
|---|---|---|
| `--prio-critical` | `oklch(0.577 0.215 27.3)` | `oklch(0.711 0.166 22.2)` |
| `--prio-high` | `oklch(0.646 0.194 41.1)` | `oklch(0.758 0.159 55.9)` |
| `--prio-medium` | `oklch(0.666 0.157 58.3)` | `oklch(0.837 0.164 84.4)` |
| `--prio-low` | `oklch(0.546 0.215 262.9)` | `oklch(0.714 0.143 254.6)` |

Drives the priority icon glyph color and the critical/high card accent stripe.

### Epic (`--epic-*`), Spline (`--spline-*`), Type (`--type-*`)

| Group | Light | Dark |
|---|---|---|
| `--epic-1..4` | `oklch(0.511 0.23 277.0)` `oklch(0.715 0.126 215.2)` `oklch(0.769 0.165 70.1)` `oklch(0.696 0.149 162.5)` | `oklch(0.68 0.158 276.9)` `oklch(0.797 0.134 211.5)` `oklch(0.837 0.164 84.4)` `oklch(0.773 0.153 163.2)` |
| `--spline-blocker` / `--spline-related` | `oklch(0.577 0.215 27.3)` / `oklch(0.6 0.104 184.7)` | `oklch(0.711 0.166 22.2)` / `oklch(0.785 0.133 181.9)` |
| `--type-feature/bug/architecture/documentation/research` | `oklch(0.623 0.188 259.8)` `oklch(0.646 0.194 41.1)` `oklch(0.541 0.247 293.0)` `oklch(0.609 0.111 221.7)` `oklch(0.592 0.218 0.6)` | `oklch(0.714 0.143 254.6)` `oklch(0.758 0.159 55.9)` `oklch(0.709 0.159 293.5)` `oklch(0.797 0.134 211.5)` `oklch(0.725 0.175 349.8)` |

### Density slots (mode-independent px) — two axes, all content surfaces

`useCardDensity` rewrites these on `<html>` at runtime — consumers must be pure CSS `var()`/`calc()` references (no JS sizing). These are **surface-agnostic density slots**, not "card" tokens: every surface classified **content** consumes them. **Chrome never consumes them** — chrome uses the [chrome type scale](#chrome-type-scale). Two independent axes (design3 §Density), owned solely by the header Density menu (MDT-236: no Settings duplicate):

| Token | Compact / Tight | Regular / Normal | Comfortable / Relaxed | Axis |
|---|---|---|---|---|
| `--fs-xs` / `--fs-md` | `10px` / `12px` | `11px` / `13px` | `12px` / `14px` | SIZE (text & elements) |
| `--radius-card` | `4px` | `8px` | `8px` | SIZE |
| `--pad-y` / `--pad-x` | `6px` / `8px` | `10px` / `12px` | `14px` / `16px` | SPACE (padding & gaps) |
| `--sz-icon` | `16px` — fixed lucide glyph size beside the ticket key (not density-driven) ||| — |

**A11y floor (MDT-236):** content text consuming `--fs-xs` must wrap it as `clamp(11px, var(--fs-xs), 2rem)` — no content text below 11px at any axis combination, and interactive targets keep a 24px minimum (derive paddings with `calc()` factors that hold the floor at tight·compact).

**Surface classification (MDT-236):** content = a surface whose primary job is presenting ticket/document data; chrome = controls, navigation furniture, containers. Chrome verdicts are density-immune by rule, not case-by-case taste.

| Surface | Verdict | Scales |
|---------|---------|--------|
| Ticket cards (board, swimlane lanes) | content | SIZE+SPACE |
| PinRail card-mimics | content | SIZE+SPACE |
| List view rows + header row (grid-aligned) | content | SIZE+SPACE (header SIZE-following) |
| Documents nav rows (tree/favs/recent) | content | SIZE+SPACE |
| Ticket detail attributes | content | SIZE+SPACE |
| QuickSearch result rows | content | SIZE+SPACE |
| Project browser panel cards | content | SIZE+SPACE |
| Project selector rail card + chips (header `h-9` furniture) | chrome | — |
| Documents toolbar, viewer prose (own setting), modals/settings forms, header, menus, popovers, swimlane lane headers | chrome / excluded | — |

Misclassified later? Fix = change that surface's CSS token references only. No component rewrite, no new token family.

---

## Usage

```css
/* shadcn OKLCH token — wrap in oklch() */
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
/* Tailwind utilities resolve to the shadcn OKLCH tokens */
<div className="bg-primary text-primary-foreground border-border" />
```

See also: [STYLING.md](STYLING.md) — theming contract & component patterns · [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) — badge color system.

---

## Typography

### Chrome type scale

Three static sizes for all chrome (headers, toolbars, inputs, menus, sidebars, meta text). Deliberately equal to the Tailwind utilities chrome already uses: TSX may use `text-sm`/`text-xs`, CSS-authored components use the token — never raw px/rem, never the card-density tokens.

| Token | Value | Role | Equals |
|---|---|---|---|
| `--fs-ui` | `14px` | primary: controls, inputs, menu rows, primary labels, group headers | `text-sm` |
| `--fs-ui-sm` | `12px` | dense: sidebar row meta, counts, secondary labels | `text-xs` |
| `--fs-ui-xs` | `11px` | micro: pills in chrome, hints, mono meta | — |

Three sizes. No fourth. 10px and 13px are not chrome sizes (13px belongs to cards via `--fs-md`).

### Font Families

| Usage | Font | Tailwind Class |
|-------|------|----------------|
| Body | Inter | `font-sans` |
| Code | JetBrains Mono | `font-mono` |

### Heading Scale

Defined in `@layer base` (`frontend/src/styles/base.css` lines 17-43):

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

Themeable star icon tokens for project favorites. Defined in `frontend/src/styles/entities/fav-star.css`.

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

