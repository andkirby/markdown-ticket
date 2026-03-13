# CSS Styling Architecture

Guide for organizing CSS in this project.

**Related docs:**
- [THEME.md](THEME.md) - Design tokens (colors, typography)
- [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) - Data attribute pattern for badges

---

## File Organization

### "As Needed" Principle

Start with a flat file. Convert to folder when extracting CSS:

```
# Simple component - keep flat
src/components/
├── Board.tsx              # No styles, stays flat

# Component with styles - becomes folder
src/components/Badge/
├── index.tsx              # Exports
├── StatusBadge.tsx        # Component
├── badge.css              # Extracted styles
└── types.ts
```

**Rule:** Flat file → Folder when adding `*.css`

### CSS Location

| CSS Type | Location |
|----------|----------|
| Component styles | `components/{Component}/{component}.css` |
| Shared entities | `styles/entities/{entity}.css` |
| Global utilities | `src/index.css` |

### Import Pattern

```css
/* src/index.css */
@import './components/Badge/badge.css';
@import './styles/entities/fav-star.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## When to Extract Classes

| Use Inline Tailwind | Use Extracted CSS |
|---------------------|-------------------|
| One-off styles | Repeated 3+ times |
| Rapid prototyping | Stable patterns |
| Component-specific | Cross-component use |
| Complex conditional logic | Simple, static styles |

---

## Naming Convention

### BEM-lite: `.component--modifier`

```css
/* Base */
.card { }

/* Modifier (variation) */
.card--featured { }
.card--compact { }
```

### Elements: `.component__element`

```css
/* For components with distinct parts */
.card__header { }
.card__body { }
.card__footer { }
```

### Utility Prefix: `.u-*`

```css
/* Cross-component utilities */
.u-sr-only { }       /* Screen reader only */
.u-scroll-hide { }   /* Hide scrollbar */
```

---

## Semantic Variants (Data Attributes)

For entities with multiple semantic values (status, priority, type), use data attributes instead of class proliferation.

### Pattern

```html
<!-- Single base class, data attribute for semantic value -->
<div class="badge" data-status="approved">Approved</div>
<div class="badge" data-priority="critical">Critical</div>
```

```css
/* Base styles */
.badge {
  @apply inline-flex items-center px-2 py-1 text-xs font-medium rounded-full;
}

/* Semantic variants */
.badge[data-status="approved"] {
  @apply bg-blue-100 text-blue-800;
}

.badge[data-priority="critical"] {
  @apply bg-red-100 text-red-800;
}
```

### Size Modifiers (Structural)

Use `--modifier` for size variations:

```html
<div class="badge badge--sm" data-status="approved">
```

```css
.badge--sm { @apply px-1.5 py-0.5 text-[10px]; }
.badge--lg { @apply px-3 py-1.5 text-sm; }
```

### State Modifiers (Behavioral)

Use neighbor classes for states:

```html
<div class="badge active" data-status="approved">
```

```css
.badge.active { @apply ring-2 ring-primary; }
.badge.loading { @apply opacity-50 animate-pulse; }
```

### Decision Guide

| Pattern | Use For | Example |
|---------|---------|---------|
| `data-*` | Semantic values (many variants) | `data-status="approved"` |
| `--modifier` | Structural variations | `.badge--sm`, `.card--compact` |
| `.state` | Behavioral states | `.active`, `.loading`, `.disabled` |

**Full pattern:** [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md)

---

## Tailwind Layers

```css
@layer components {
  /* Reusable component patterns */
  .btn { }
  .card { }
  .badge { }
}

@layer utilities {
  /* Single-purpose helpers */
  .scrollbar-hide { }
  .text-balance { }
}
```

### Layer Priority (low → high)

1. **base** - Resets, CSS variables
2. **components** - Reusable patterns
3. **utilities** - Helper classes

---

## Existing Component Classes

Global classes in `src/index.css`:

| Class | Purpose |
|-------|---------|
| `.btn`, `.btn-*` | Button variants |
| `.badge`, `.badge[*]` | Ticket attribute badges (see badge.css) |
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

**Note:** Badge styles use data attributes (`.badge[data-status="approved"]`) instead of CVA. See [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) for the complete pattern.

---

## Theming

All color values should use CSS variables for theme support:

```css
/* Good - themeable */
.badge[data-status="approved"] {
  background: var(--badge-approved-bg);
  color: var(--badge-approved-text);
}
```
```typescript
/* Avoid - hardcoded in TS (not themeable) */
const variants = cva({
  Approved: 'bg-blue-100 text-blue-800'  // ← can't theme
})
```

See [THEME.md](THEME.md) for available tokens.

---

## Component-Specific Docs

- [MODALS.md](MODALS.md) - Modal/overlay standards
- [BADGE_ARCHITECTURE.md](BADGE_ARCHITECTURE.md) - Badge data attribute pattern

---

## SVG Icons

Use SVG sprites for icon management:

**Benefits:** Single source of truth, browser caching, cleaner JSX.

```
public/icons/sprite.svg         → Icon definitions
src/components/shared/Icon.tsx  → <Icon name="fav-star" />
```

```
public/icons/sprite.svg    → Icon definitions (cached by browser)
src/components/shared/Icon.tsx → <Icon name="fav-star" />
```

```tsx
// Icon.tsx
export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className}>
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}

// Usage
<Icon name="fav-star" className="fav-star active" />
```

```svg
<!-- public/icons/sprite.svg -->
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
| Themed/styled icon | Sprite + CSS classes |

---

## Workflow

1. **Start inline** - Prototype with Tailwind utilities in JSX
2. **Identify patterns** - Notice repeated class combinations (3+ times)
3. **Extract to CSS** - Create `{component}.css` in component folder
4. **Use data attrs** - For semantic variants (status, priority)
5. **Import** - Add to `src/index.css`
6. **Document** - Update this file if adding new global patterns
