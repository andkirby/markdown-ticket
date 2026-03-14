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
| Shared entities | `src/styles/entities/{entity}.css` |
| Global primitives and utilities | `src/index.css` |

### Import Pattern

Import extracted CSS from `src/index.css`.

```css
@import './components/Badge/badge.css';
@import './styles/entities/fav-star.css';

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
.badge {
  @apply inline-flex items-center rounded-full px-2 py-1 text-xs font-medium;
}

.badge[data-status="approved"] {
  background: var(--badge-approved-bg);
  color: var(--badge-approved-text);
}

.badge[data-priority="critical"] {
  background: var(--badge-critical-bg);
  color: var(--badge-critical-text);
}
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
  background: var(--badge-approved-bg);
  color: var(--badge-approved-text);
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

Use [THEME.md](THEME.md) for the available token system and `src/index.css` as the source of truth for the actual values.

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

| Class | Purpose |
|-------|---------|
| `.btn`, `.btn-*` | Button variants |
| `.badge`, `.badge[*]` | Ticket attribute badges |
| `.card`, `.card-*` | Card structure |
| `.input`, `.input-error` | Form inputs |
| `.label` | Form labels |
| `.dropdown`, `.dropdown-*` | Dropdown menus |
| `.modal`, `.modal-*` | Modal dialogs |
| `.tooltip`, `.tooltip-*` | Tooltips |
| `.skeleton`, `.skeleton-*` | Loading placeholders |
| `.fav-star`, `.fav-star--*` | Favorite star indicator |
| `.count-badge`, `.count-badge--*` | Count indicators |
| `.status-dot`, `.status-dot--*` | Pulsing status dots |

This section is a snapshot, not the source of truth for naming rules.

---

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
