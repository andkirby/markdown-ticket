# CSS Styling Architecture

Guide for organizing CSS, class naming, and themeable styling in this project.

**Related docs:**
- [THEME.md](THEME.md) - Design tokens (colors, typography)
- [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) - Data attribute pattern for badges
- [MODALS.md](MODALS.md) - Modal and overlay standards
- [PRIMITIVES.md](PRIMITIVES.md) - Inventory of shared CSS classes (the "what exists")
- [ITCSS.md](ITCSS.md) - ITCSS layer architecture (the "which layer")

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
place: `<TicketCode>` (`frontend/src/components/TicketCode.tsx`) renders the
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
frontend/src/components/
├── Board.tsx

# Component with extracted styles - becomes folder
frontend/src/components/Badge/
├── index.tsx
├── StatusBadge.tsx
├── badge.css
└── types.ts
```

**Rule:** Flat file -> folder when adding `*.css`

### CSS Locations

| CSS Type | Location |
|----------|----------|
| Component styles | `frontend/src/components/{Component}/{component}.css` |
| Shared component primitives | `frontend/src/styles/components/{concern}.css` |
| Shared entities | `frontend/src/styles/entities/{entity}.css` |
| Design tokens | `frontend/src/styles/design-tokens.css` |
| Base resets & typography | `frontend/src/styles/base.css` |
| Prose/markdown rendering | `frontend/src/styles/prose.css` |
| Animations | `frontend/src/styles/animations.css` |
| Utilities (scrollbar, print, a11y) | `frontend/src/styles/utilities.css` |
| Orchestration hub (imports only) | `frontend/src/index.css` |

### Import Pattern

All CSS is imported through `frontend/src/index.css` as the orchestration hub.
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

Global utilities should be rare and live in `frontend/src/index.css`.

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

Use [THEME.md](THEME.md) for the token system; the values live in [`frontend/src/styles/design-tokens.css`](styles/design-tokens.css) (imported first by `index.css`).

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

### Interaction-state ramp (hover vs active/selected)

**Hover is ALWAYS the neutral recessed tier** (`--state-hover-bg` = `--bg-muted`) — pointing, not committed. **Active/selected is ALWAYS the accent family**, delivered at two strengths:

| Strength | Recipe | For | Examples |
|---|---|---|---|
| hover / pointing | `--state-hover-bg` fill | any hover | result rows, icon buttons, facet options |
| active — **surface** | `--state-active-bg` tint **+ `--state-active-fg` signal** (ring/border — or a trailing check on flush menu rows — carries the state) | large surfaces | search result `[data-selected]` (2px inset ring), project card active (accent border), drag-over targets, `.tab[data-state=active]` (underline only), dropdown menu rows (SortMenu popover, Hamburger sort list: tint + check) |
| active — **solid** | `oklch(var(--primary))` fill + `oklch(var(--primary-foreground))` text | compact controls | scope-bar pills, mode badge (same as `.settings-theme-btn--active`) |

Rules:

- **State hierarchy: active absorbs hover.** An element in the active/selected state never demotes to the neutral hover tier on hover — that swaps the fill while the active rule's text/signal persists (white text on the light hover fill). Implement structurally, not per-site: nest the active rule inside the base **after** `&:hover` at equal specificity (`&.component--active { … }`), so the hierarchy is expressed by construction. A BEM modifier is ONE class `(0,1,0)` and silently loses to `:hover` `(0,2,0)` if declared flat — this exact bug shipped on the scope pill and the filter trigger. Attribute selectors (`[data-selected]`) count as class-level, so they must also be declared after the hover rule.
- **A tint cannot carry state alone in light mode.** Indigo tints cap at ~1.1:1 against the near-white tiers (`--bg-subtle`/`--background`), so a tinted pill is invisible — the original `--primary-light` fill measured **1.01:1** on the scope bar. Large surfaces get tint + a strong signal (ring/border/underline in `--state-active-fg` or primary); compact controls go **solid**.
- **Never a primary tint for hover.** The tier change (neutral → accent) carries hover→selected meaning and survives both themes; tint-strength steps collapse in light mode.
- Hand-written hover backgrounds consume `var(--state-hover-bg)`, never `var(--bg-muted)` directly (Tailwind `@apply hover:bg-*` forms are equivalent and fine).
- Drop-target highlights reuse `--state-active-bg` with a subdued ring (`ring-primary/40`) — "will receive" reads as commit-preview, not hover.
- Tabs are one *consumer* of this ramp, not the shared component for selectable things. Result rows are listboxes (`role="option"` + `aria-selected`); never force selection surfaces under the tabs component.
- **Verify state contrast where the state sits**, not in isolation: fill-vs-surface (and signal-vs-fill) in BOTH themes, AND under state combinations (hover-on-active, focus-on-active). A state token that is architecturally correct can still be imperceptible — measure it (`--primary-light` shipped invisible-on-arrival in light mode; the solid pill shipped with hover demoting it back to the invisible tier).

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

## Shared Primitives

The catalog of existing global classes lives in [PRIMITIVES.md](PRIMITIVES.md),
kept accurate by a nightly drift check. This file defines the *rules* for naming
and extracting classes; PRIMITIVES.md is the *inventory* of what exists.

Rules for adding to the inventory are above (§Class Taxonomy, §Semantic
Variants). When you extract a new shared primitive, add a row to PRIMITIVES.md.

### Shared Tabs

The ONE underline-tab implementation is the shared object in
[`styles/components/tabs.css`](styles/components/tabs.css) — every tab strip
(Settings modal, ticket document tabs, filename tabs) consumes it, and
`styleguide.html` demos the same classes (no parallel demo classes). It is pure
CSS (no `@apply`) so it renders standalone in browser-served contexts. Canonical spacing pattern:

```tsx
<Tabs.List className="tab__list scrollbar-hide">
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

### Shared Checkbox

The ONE checkbox implementation is the shared object in
[`styles/components/checkbox.css`](styles/components/checkbox.css) — an
`<input type="checkbox">` at 16px **drawn by the object** (`appearance: none`),
with a small round corner (`--radius-xs`, 4px), checked fill
`oklch(var(--primary))` + white check glyph, and keyboard-only focus
(`:focus-visible`, ring-1 @50%). Every checkbox input consumes `.checkbox`,
and `styleguide.html` demos the same class (no parallel demo classes). It is
pure CSS (no `@apply`) so it renders standalone in browser-served contexts.

Why custom-drawn and not `accent-color`: engines normalize author
`border-radius` to 0 on native (`appearance: auto`) checkboxes — verified on
Chromium 147, where even an inline `border-radius: 4px` computes to 0px. The
UA's own painted rounding varies by browser, so the token-driven corner can
only be guaranteed by owning the drawing.

Rules:

- Only the shared object draws checkboxes — never a local `appearance: none` recipe, `peer-checked` chain, or `accent-color`-only theming (accent-color does nothing under `appearance: none`).
- Never restyle a checkbox with utility chains (`text-blue-600 border-gray-300 …`); size, corner, and color come from `.checkbox`.
- Spacing to the label belongs to the wrapping row (`.settings-checkbox-row`, `.facet-option`, `gap-*` on the container), not to `.checkbox`.
- State hierarchy: `&:checked` is declared after `&:hover` so a checked box never demotes on hover.
- Documented deviation: the column merge-mode checkbox overrides the *checked fill* with a warning tone (`.column-merge-checkbox` in `components/Column/column.css`) because drag-merging re-parents tickets. Prose task-lists are not a deviation — they share the object's selector list; `styles/prose.css` overrides only geometry (absolute position, `1em`).

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
frontend/src/components/shared/Icon.tsx  -> <Icon name="fav-star" />
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
6. Import extracted CSS from `frontend/src/index.css`.
7. Update this file when adding new global styling patterns.
