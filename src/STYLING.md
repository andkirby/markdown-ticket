# CSS Styling Architecture

Guide for organizing CSS, class naming, and themeable styling in this project.

**Related docs:**
- [THEME.md](THEME.md) - Design tokens (colors, typography)
- [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) - Data attribute pattern for badges
- [MODALS.md](MODALS.md) - Modal and overlay standards

---

## Purpose

This file defines the styling contract for the frontend:

- when to keep Tailwind classes inline
- when to extract CSS into component files
- how classes should be named
- how semantic variants should be expressed
- how theming should work

Use this file for structure and conventions. Use [THEME.md](THEME.md) for the available tokens.

---

## Stable Scanning Patterns (UX)

For attributes users scan every day, render a **positionally-stable marker** on
every surface so muscle-memory works across views. The marker must not move or
change shape between the board, the list, and the ticket viewer.

- **Priority** is always the colored `<PriorityIcon>` glyph placed immediately
  **before the ticket key** — board card, cloud-projected stub, list row
  (desktop table + mobile card), ticket viewer header, and search results.
  Same glyph, same `data-priority` color mapping, same `--sz-icon` size, same
  position (left of the key). Users find priority in one place regardless of view.

**Single source of truth.** The glyph-before-key invariant lives in exactly one
place: `<TicketCode>` (`src/components/TicketCode.tsx`) renders the
`<PriorityIcon>` then the code. Every surface that shows a ticket key MUST use
`<TicketCode code={...} priority={...} />` (or pass `ticket`). **Never**
hand-compose `<PriorityIcon>` + the code in a surface — that is how surfaces
drift out of sync (QuickSearch rendered a bare `{ticket.code}` with no glyph
until it was routed through `<TicketCode>`). Adding a surface? Use `<TicketCode>`;
the glyph comes for free and can never be forgotten.

**Ticket-key typography** lives in `.ticket-key` (mono / tabular-nums / 600, color-agnostic). `.ticket-code` (TicketCode) layers primary-text color + glyph layout on top. Use `.ticket-key` for key renderings that need their own color — e.g. a key inside a gold epic badge inherits the badge color (`text-inherit`) instead of forcing primary-text. Never redeclare the JetBrains Mono family per-surface.

---

## Decision Tree

### Keep Styles Inline

Prefer inline Tailwind utilities in JSX when the styling is:

- local to one component
- short and easy to read
- unlikely to be reused
- mostly layout or spacing
- still in active iteration

### Extract CSS

Extract styles into a `*.css` file when any of these are true:

- the same class combination appears in multiple places
- the pattern has stabilized and should be reused
- the styling needs semantic selectors like `data-*`
- the styling needs pseudo states or child elements
- the styling should consume theme tokens through CSS variables
- the JSX is getting noisy enough that the structure is harder to read

### Rule of Thumb

Start inline. Extract once the pattern becomes reusable, semantic, or theme-driven.

---

## File Organization

### "As Needed" Principle

Start with a flat file. Convert to a folder when extracting CSS.

```text
# Simple component - keep flat
src/components/
├── Board.tsx

# Component with extracted styles - becomes folder
src/components/Badge/
├── index.tsx
├── StatusBadge.tsx
├── badge.css
└── types.ts
```

**Rule:** Flat file -> folder when adding `*.css`

### CSS Locations

| CSS Type | Location |
|----------|----------|
| Component styles | `src/components/{Component}/{component}.css` |
| Shared component primitives | `src/styles/components/{concern}.css` |
| Shared entities | `src/styles/entities/{entity}.css` |
| Design tokens | `src/styles/design-tokens.css` |
| Base resets & typography | `src/styles/base.css` |
| Prose/markdown rendering | `src/styles/prose.css` |
| Animations | `src/styles/animations.css` |
| Utilities (scrollbar, print, a11y) | `src/styles/utilities.css` |
| Orchestration hub (imports only) | `src/index.css` |

### Import Pattern

All CSS is imported through `src/index.css` as the orchestration hub.
`@import` statements come before `@tailwind` directives so PostCSS resolves them correctly.

```css
/* All @import statements first */
@import './styles/design-tokens.css';
@import './styles/base.css';
@import './styles/components/buttons.css';
/* ... more imports ... */

/* Then Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Class Taxonomy

Use one pattern per concern.

| Concern | Pattern | Example |
|---------|---------|---------|
| Base component | `.component` | `.badge` |
| Structural variation | `.component--modifier` | `.badge--sm`, `.card--compact` |
| Child part | `.component__element` | `.card__header` |
| Behavioral state | `.state` on the base element | `.badge.active`, `.badge.loading` |
| Semantic meaning | `data-*` attribute | `.badge[data-status="approved"]` |

### Base Classes

Every reusable pattern should have a single base class.

```css
.card { }
.badge { }
.dropdown { }
```

### Structural Modifiers

Use `--modifier` for size, density, layout, and other structural variations.

```css
.card--compact { }
.badge--sm { }
.badge--lg { }
```

Do not use modifiers for semantic meaning such as status, priority, or type.

### Elements

Use `__element` only when the component has clear internal parts worth naming.

```css
.card__header { }
.card__body { }
.card__footer { }
```

Avoid deep chains. If the structure becomes too nested, the component likely needs to be simplified.

### Behavioral State Classes

Use neighbor state classes for transient UI behavior.

```css
.badge.active { }
.badge.loading { }
.dropdown.open { }
```

Use state classes for interaction and runtime behavior:

- active
- loading
- open
- selected
- disabled

Use `data-*` instead when the value represents domain meaning rather than UI state.

### Global Utilities

Global utilities should be rare and live in `src/index.css`.

Use clear semantic names without a prefix:

```css
.scrollbar-hide { }
.text-balance { }
.sr-only { }
```

Do not create global utilities for component-specific styling.

---

## Semantic Variants

For entities with many semantic values, use `data-*` attributes instead of class proliferation.

### Use `data-*` For Meaning

Examples:

- ticket status
- priority
- CR type
- health state

```html
<div class="badge" data-status="approved">Approved</div>
<div class="badge" data-priority="critical">Critical</div>
```

```css
/* Flat: bg tint + colored text, NO border (border removed from the shared Badge base) */
.badge {
  @apply inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium;
  @apply transition-colors;
  border-radius: 4px;
}

.badge[data-status="approved"] { background: var(--status-open-bg); color: var(--status-open); }
.badge[data-priority="critical"] { background: color-mix(in srgb, var(--prio-critical) 15%, transparent); color: var(--prio-critical); }
```

### Use Modifiers For Structure

```html
<div class="badge badge--sm" data-status="approved">
```

```css
.badge--sm { @apply px-1.5 py-0.5 text-[10px]; }
.badge--lg { @apply px-3 py-1.5 text-sm; }
```

### Use State Classes For Behavior

```html
<div class="badge active" data-status="approved">
```

```css
.badge.active { @apply ring-2 ring-primary; }
.badge.loading { @apply animate-pulse opacity-50; }
```

### Quick Decision Guide

| Pattern | Use For | Example |
|---------|---------|---------|
| `data-*` | semantic values with multiple variants | `data-status="approved"` |
| `--modifier` | structural variations | `.badge--sm`, `.card--compact` |
| `.state` | behavioral or runtime state | `.active`, `.loading`, `.open` |

See [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) for the full badge pattern.

---

## Theming Contract

Themeability matters more than minimizing CSS files.

### Use CSS Variables For Reusable Color Decisions

If a style expresses semantic color or a reusable visual token, it should use CSS variables.

```css
.badge[data-status="approved"] {
  background: var(--status-open-bg);
  color: var(--status-open);
}
```

Good candidates for CSS variables:

- semantic colors
- component surface colors
- border colors
- focus states
- icon fills and strokes

### Inline Tailwind Is Fine For Non-Semantic Layout

Tailwind utilities are still the default for:

- spacing
- flex and grid layout
- sizing
- positioning
- one-off typography adjustments

```tsx
<div className="flex items-center gap-2 px-3 py-2" />
```

### Avoid Hardcoding Semantic Colors In TypeScript

Avoid freezing semantic color choices into TS variants when those colors should change with the theme.

```typescript
const variants = cva({
  Approved: 'bg-blue-100 text-blue-800',
})
```

That pattern is acceptable only for non-themeable, purely structural class composition. For semantic colors, move the decision into CSS variables.

### Token Source Of Truth

Use [THEME.md](THEME.md) for the token system; the values live in [`src/styles/design-tokens.css`](styles/design-tokens.css) (imported first by `index.css`).

### Surface Tier Model (colors as signals)

Background tokens encode a four-rung ladder. Each tier *signals* a role — pick the tier by what the surface **does**, not by look. Values live in [`design-tokens.css`](styles/design-tokens.css); both themes share one ladder (dark steps down, light steps up).

| Tier | Token (dark → light) | Signal | Lives on |
|---|---|---|---|
| **Base / canvas** | `--background` (`oklch(0.164…)` dark / white light) | "Read me." Maximum text contrast. | page, **document reader**, **ticket reader**, prose containers |
| **Raised** | `--card` / `--bg-elevated` (`0.337…` / white) | "A discrete unit / floating layer." | ticket cards, dialogs/modals, popovers, header |
| **Recessed** | `--bg-muted` (`0.288…` / `0.929…`) | "Inset / interactive affordance." | inputs, hover fills, secondary chrome |
| **Recessed-soft** | `--bg-subtle` (`0.24…` / `0.957…`) | "Navigation chrome above content." | **tab bars**, nav rails |

Rules:

- **Reading surfaces are base.** Anywhere long-form text is consumed (document viewer, ticket viewer, prose) sits on `--background` — the darkest tier in dark mode / white in light — for maximum contrast. Never put prose on a raised tier: that is the root cause of "the ticket reader looks lighter than the document reader." The ticket viewer stays a centered modal but on the base tier (`.ticket-detail-modal`); a base fill has no step above the canvas and modal shadows are invisible in dark, so it is **border-defined** (1px `--border`) for separation from the dimmed overlay rather than fill-separated.
- **Tab bars are recessed-soft (`--bg-subtle`).** A tab strip is chrome that *organises* content, not content — it sits one rung apart from the base content it switches (`.ticket-document-tabs`, `.documents-view__filename-tabs`).
- **Cards / popovers / dialogs are raised** — they float or group; in dark mode they rely on the fill step above the canvas (shadows are invisible on dark). A *reading* modal (the ticket viewer) is the exception: base-tier for reading contrast, border-defined instead of fill-separated.
- **Inputs are recessed or border-defined** — see the Surface Contract below (`--bg-muted` is only ~1.2:1 from `--card` in light, so a borderless muted input ghosts).

In light mode, base and raised are both white — distinguished by borders/shadows, not fill. The ladder only diverges in dark mode, which is why wrong-tier drift is invisible in light and glaring in dark.

### Surface Contract For Interactive Controls

A control's fill must differ from its host surface, or the control ghosts (becomes invisible). This is why form-control borders are **affordance**, not decoration — they survive the border-drop.

- **Solid fills** (primary, destructive): saturated — separate from every neutral tier; usable anywhere, border optional.
- **Tonal / secondary fills**: must sit on a contrasting tier. `btn-secondary` now uses a distinct `--secondary` (gray tonal solid — `213.3 29.7% 82.2%` light / `215.3 19.3% 34.5%` dark), no longer equal to `--muted`, so it reads as a medium-emphasis solid on `card`/`bg-elevated` (1.56:1) with **no border**. Still subtle on the `bg-muted` tier itself (1.2:1) — prefer `primary` there. Only `btn-secondary` consumes `--secondary` (no app consumers today), so the change is fully scoped.
- **Borderless inputs**: a recessed-fill input reads only if its fill is ≥~1.7:1 from the container. `--bg-muted` is only ~1.2:1 from `--card`/`--bg-elevated` in light, so a borderless muted input **ghosts**. Borderless inputs need either a deeper recessed fill (Material-3 filled-field, e.g. `#bcc7d4` light / `#384560` dark) or a hairline border + focus ring. Pick one and apply it to *every* input class (`.input`, `.settings-input`, sort selects, project-search, FormField) — piecemeal looks broken.
- **Outline / ghost**: transparent by design — exempt from the fill rule; rely on their border (outline) or ≥3:1 text (ghost).

Measured (light): `--bg-muted` `#e3e8ef` on `--card` `#fff` = **1.23:1** (ghost); a `#bcc7d4` recessed fill = **1.71:1** (reads); `--primary` = 4.9–6:1 on every tier (safe). See [`styleguide.html`](styleguide.html) → "form controls & the surface contract" for a live demo.

---

## Tailwind Layers

Use Tailwind layers intentionally.

```css
@layer base {
  :root { }
}

@layer components {
  .btn { }
  .card { }
  .badge { }
}

@layer utilities {
  .scrollbar-hide { }
  .text-balance { }
}
```

### Layer Priority

1. `base` - resets, CSS variables, element defaults
2. `components` - reusable component classes
3. `utilities` - single-purpose helper classes

---

## Worked Examples

### Example: Good Inline Tailwind

Local layout, no semantic styling, not reused:

```tsx
<div className="flex items-center justify-between gap-2 px-3 py-2">
  <span className="text-sm font-medium">Title</span>
</div>
```

### Example: Good Extracted CSS

Reusable, semantic, and themeable:

```css
.status-dot {
  @apply inline-block h-2 w-2 rounded-full;
  background: var(--status-dot-bg);
}

.status-dot[data-status="online"] {
  background: var(--status-online);
}

.status-dot[data-status="offline"] {
  background: var(--status-offline);
}
```

### Example: Mixed Approach

Keep layout inline, keep semantic color in CSS:

```tsx
<div className="flex items-center gap-2">
  <span className="badge badge--sm" data-status="approved">Approved</span>
</div>
```

This is usually the right balance.

---

## Current Shared Primitives

Existing global classes in `src/index.css` and shared entity CSS include:

| Class | Purpose | File |
|-------|---------|------|
| `.btn`, `.btn-*` | Button variants | `styles/components/buttons.css` |
| `.badge`, `.badge[*]` | Ticket attribute badges | `components/Badge/badge.css` |
| `.card`, `.card-*` | Card structure | `styles/components/layout.css` |
| `.input`, `.input-error` | Form inputs | `styles/components/forms.css` |
| `.label` | Form labels | `styles/components/forms.css` |
| `.dropdown`, `.dropdown-*` | Dropdown menus | `styles/components/overlays.css` |
| `.modal`, `.modal-*` | Modal dialogs | `components/ui/modal.css` |
| `.modal__headline` | Canonical modal `<h1>` title | `components/ui/modal.css` |
| `.tooltip`, `.tooltip-*` | Tooltips | `styles/components/overlays.css` |
| `.skeleton`, `.skeleton-*` | Loading placeholders | `styles/components/loading.css` |
| `.fav-star`, `.fav-star--*` | Favorite star indicator | `styles/entities/fav-star.css` |
| `.fav-star-btn`, `.fav-star-btn--*` | Star toggle button wrapper | `styles/entities/fav-star.css` |
| `.project-card`, `.project-card--*` | Project selector card (rail + panel) | `components/ProjectSelector/project-selector.css` |
| `.project-chip`, `.project-chip__*` | Compact project chip (rail inactive) | `components/ProjectSelector/project-selector.css` |
| `.project-launcher` | Panel launcher button | `components/ProjectSelector/project-selector.css` |
| `.project-chips-overlay`, `.project-chips-overlay__*` | Hover-revealed inactive chip strip (MDT-185) | `components/ProjectSelector/project-selector.css` |
| `.project-expand-hint` | Chevron hint on active card edge (MDT-185) | `components/ProjectSelector/project-selector.css` |
| `.project-search` | Panel search input | `components/ProjectSelector/project-selector.css` |
| `.project-lift` | Shared hover lift transition | `components/ProjectSelector/project-selector.css` |
| `.search-result`, `.search-result__*` | Quick search result items | `components/QuickSearch/quick-search.css` |
| `.search-results-list` | Result list container with dividers | `components/QuickSearch/quick-search.css` |
| `.search-section-header` | Section header in results | `components/QuickSearch/quick-search.css` |
| `.search-mode-badge` | Mode indicator pill (In: CODE) | `components/QuickSearch/quick-search.css` |
| `.search-skeleton-bar` | Loading skeleton bar | `components/QuickSearch/quick-search.css` |
| `.count-badge`, `.count-badge--*` | Count indicators | `styles/components/loading.css` |
| `.status-dot`, `.status-dot--*` | Pulsing status dots | `styles/components/loading.css` |
| `.avatar`, `.avatar-*` | Avatar sizes | `styles/components/layout.css` |
| `.settings-*` | Settings modal | `components/SettingsModal/settings.css` |
| `.tab`, `.tab__*`, `.tab--*` | Shared Radix Tabs pattern | `components/SettingsModal/settings.css` |
| `.ticket-card`, `.ticket-card--invalid` | Ticket card surface + hover | `components/TicketCard/ticket.css` |
| `.ticket-card__title` | Ticket title typography | `components/TicketCard/ticket.css` |
| `.ticket-card--projected` | Cloud-projected stub (dashed border) | `components/TicketCard/ticket.css` |
| `.board-container` | Kanban grid layout | `components/Column/column.css` |
| `.column`, `.column--over` | Board column + drop target | `components/Column/column.css` |
| `.column__header` | Column gradient header bar | `components/Column/column.css` |
| `.column__count` | Ticket count badge in header | `components/Column/column.css` |
| `.column-drop-zone` | Inner scrollable ticket list | `components/Column/column.css` |
| `.draggable-ticket`, `.draggable-ticket--*` | Drag wrapper states | `components/Column/column.css` |
| `.header`, `.header__*` | Sticky navigation bar | `components/Header/header.css` |

This section is a snapshot, not the source of truth for naming rules.

### Shared Tabs

Use the Ticket Viewer tab rows as the canonical spacing pattern:

```tsx
<Tabs.List className="tab__list overflow-x-auto scrollbar-hide">
  <Tabs.Trigger className="tab mr-3 last:mr-0">Main</Tabs.Trigger>
  <Tabs.Trigger className="tab mr-3 last:mr-0">architecture.md</Tabs.Trigger>
</Tabs.List>
```

Rules:

- `.tab__list` owns row structure, bottom border, and overflow behavior.
- `.tab` owns trigger typography, padding, and active state.
- Horizontal spacing between tab triggers belongs on the trigger (`mr-3 last:mr-0`), not as `gap-*` on `.tab__list`.
- Use `.tab--fill` only for equal-width modal-style tabs. It must not redefine padding or gaps.
- Add surface-specific tab row styling with a second class, for example `settings-tab-list`.
- Surface wrappers (`.documents-view__filename-tabs`, `.ticket-document-tabs`) must NOT duplicate `.tab__list`'s padding/bg/border — `.tab__list` is the single owner. A wrapper sets its own bg only when it groups multiple tab rows (`.ticket-document-tabs` → solid bg-subtle band); a single-row wrapper stays `flex-shrink-0` only.

---

## Scrollable Regions

All in-component scroll regions use `<ScrollArea>` (from `ui/scroll-area.tsx`). It renders a Radix-based scrollbar that appears on hover and fades after 600ms.

### Required recipe

```tsx
<ScrollArea type="hover" scrollHideDelay={600} className="flex-1 min-h-0 overflow-hidden">
  {content}
</ScrollArea>
```

All three classes are required — without any one of them the ScrollArea will expand to fit content instead of scrolling:

| Class | Why |
|-------|-----|
| `flex-1` | Grow to fill available flex space |
| `min-h-0` | Allow flex item to shrink below content size |
| `overflow-hidden` | Clip overflow so Radix viewport detects scrollable content |

The parent **must** have a constrained height (explicit `height` or `flex` with `overflow: hidden`). Without a constrained parent, the ScrollArea root expands to fit all content and nothing scrolls.

Content padding goes on a wrapper `div` inside ScrollArea, never on ScrollArea itself.

### Where used

| Consumer | Parent constraint |
|----------|-----------------|
| Board columns | `.column` has `flex flex-col h-full` |
| Project Browser | `.modal__body--constrained` has `height: 80dvh; overflow: hidden` |
| Quick Search results | `.modal__body--constrained` |
| Add/Edit Project | `ScrollArea` with explicit `style={{ height: 'calc(100vh - 300px)' }}` |
| Folder Browser | `ScrollArea` with explicit `style={{ height: 'calc(80vh - 180px)' }}` |

### When NOT to use ScrollArea

- `.modal` outer overlay — native `overflow-y-auto` for full-page scroll of long-document modals
- Horizontal tab overflow — `.scrollbar-hide` (scrollbar hidden entirely)

## SVG Icons

Use SVG sprites for reusable icons.

**Benefits:**

- single source of truth
- browser caching
- cleaner JSX

```text
public/icons/sprite.svg         -> icon definitions
src/components/shared/Icon.tsx  -> <Icon name="fav-star" />
```

```tsx
export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className}>
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}

<Icon name="fav-star" className="fav-star active" />
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" style="display: none">
  <symbol id="fav-star" viewBox="0 0 24 24">
    <path d="..."/>
  </symbol>
</svg>
```

| Scenario | Approach |
|----------|----------|
| Simple, one-off | Inline SVG |
| Reusable icon | Add to sprite |
| Themed or styled icon | Sprite plus CSS classes |

---

## Workflow

1. Start inline with Tailwind utilities in JSX.
2. Extract CSS once the pattern becomes reusable, semantic, or theme-driven.
3. Use `data-*` for semantic variants.
4. Use modifiers for structural variations.
5. Use state classes for transient behavior.
6. Import extracted CSS from `src/index.css`.
7. Update this file when adding new global styling patterns.
