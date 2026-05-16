---
name: mdt-frontend
description: Build and refactor MDT frontend components following project conventions. Use when creating React components, writing CSS classes, working with modals, tabs, or any UI surface in src/. Enforces STYLING.md patterns, Tailwind 3 constraints, and build safety checks.
---

# MDT Frontend Developer

Project-specific conventions for writing frontend code in `src/`. Generic React/TypeScript knowledge is assumed — this skill only covers **MDT-specific rules that break builds or create inconsistency**.

## Mandatory reads

Before touching CSS or a modal component, read these files:

1. `src/STYLING.md` — CSS architecture, BEM naming, inline-vs-extract decision tree
2. `src/MODALS.md` — three modal patterns, spacing standard, close button rules

## Critical rules

### 1. Tailwind 3 `@apply` cannot chain custom classes

**This is the #1 build breaker.** Tailwind 3 cannot resolve custom classes (defined in `@layer components`) inside `@apply` within the same layer.

```css
/* ❌ BREAKS BUILD — .btn is a custom class in @layer components */
.btn-primary {
  @apply btn bg-primary text-primary-foreground;
}

/* ✅ CORRECT — inline the base utilities */
.btn-primary {
  @apply inline-flex items-center justify-center rounded-md text-sm font-medium
    bg-primary text-primary-foreground;
  border: 1px solid hsl(var(--border));
}
```

Only Tailwind utility classes work in `@apply`. If you need to "extend" a base class, copy the utilities and add your own.

### 2. Always run `bun run build` after CSS changes

PostCSS/Tailwind crashes produce unhelpful errors like `Cannot read properties of undefined (reading 'insertAfter')`. The root cause is usually:

- Missing closing brace (malformed CSS block)
- `@apply` referencing a custom class (see rule 1)
- Invalid Tailwind utility name in `@apply`

```bash
# After ANY edit to src/index.css or any imported .css file:
bun run build

# If it fails, bisect: comment out blocks until it passes,
# then narrow down to the specific malformed rule.
```

### 3. Modals: always use `<Modal>` from `ui/Modal.tsx`

Never hand-roll `fixed inset-0` overlays. Three patterns exist:

| Pattern | Use for | Structure |
|---------|---------|-----------|
| **A** (form) | Settings, forms | `ModalHeader` + `ModalBody` + `ModalFooter` |
| **B** (content) | Ticket viewer, search | `ModalBody className="p-0"`, own close button |
| **C** (alert) | Confirmations, errors | Small, centered, footer buttons only |

See `src/MODALS.md` for full details.

### 4. Close button: single pattern

All close buttons use `modal__close--absolute` (absolutely positioned, SVG sizing in CSS). The `ModalHeader` component renders this automatically. Pattern B modals place it manually.

```tsx
// Pattern A — ModalHeader handles it
<ModalHeader title="Title" onClose={close} />

// Pattern B — manual placement
<button className="modal__close--absolute" onClick={close}>
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

SVG sizing is controlled by CSS (`.modal__close--absolute svg { h-5 w-5 }`), never inline.

### 5. Modal spacing: tight layout

| Part | Padding | Border |
|------|---------|--------|
| Header | `px-4 py-3` | `border-b` |
| Body | `p-4` (or `p-0` for content modals) | none |
| Footer | `px-4 py-3` | `border-t` |
| Sections | `px-4 py-3` | `border-b` |

Never use `p-6`. Border color is always `border-gray-200 dark:border-gray-700`.

### 6. z-index hierarchy

| Level | Element |
|-------|---------|
| `z-40` | ToC (fixed overlay) |
| `z-50` | Sticky header, modals |
| `z-[60]` | Dropdowns portaled to body (hamburger menu) |
| `z-[100]` | Toast notifications |

Dropdown menus that need to appear above modals must use `createPortal` to `document.body` with `z-[60]`.

### 7. CSS class naming: BEM with `data-*` variants

Follow `src/STYLING.md` taxonomy:

| Concern | Pattern | Example |
|---------|---------|---------|
| Base component | `.component` | `.modal`, `.tab` |
| Structural variant | `.component--modifier` | `.tab--fill`, `.badge--sm` |
| Child part | `.component__element` | `.modal__header`, `.tab__list` |
| Semantic meaning | `data-*` attribute | `.badge[data-status="approved"]` |
| Behavioral state | `.state` class | `.active`, `.loading` |

### 8. Use `cn()` for dynamic classNames

```tsx
// ✅ Correct — handles undefined gracefully
<div className={cn('modal__header', className)}>

// ❌ Wrong — can render "modal__header undefined"
<div className={`modal__header ${className}`}>
```

### 9. CSS imports go through `src/index.css`

Extracted CSS files are imported from `src/index.css`, not from individual components:

```css
/* src/index.css */
@import './components/Badge/badge.css';
@import './components/SmartLink/smart-link.css';
@import './styles/entities/fav-star.css';
```

### 10. Tabs: shared `.tab` base class

Radix Tabs triggers use the `.tab` base class with modifiers:

```tsx
// Settings (equal-width)
<Tabs.Trigger className="tab tab--fill" />

// Ticket viewer (compact, scrollable)
<Tabs.Trigger className="tab mr-3 last:mr-0" />

// Container
<Tabs.List className="tab__list" />
<Tabs.Content className="tab__content" />
```

## Workflow checklist

Before submitting any frontend change:

1. `bun run validate:ts` — TypeScript check
2. `bun run build` — catches CSS/PostCSS errors
3. Verify no `@apply` references custom classes: `grep '@apply' src/index.css | grep -v '^[^@]*@apply [a-z]*-'`
4. Verify no hand-rolled overlays: `grep -r "fixed inset-0" src/components --include="*.tsx"` should only match `ui/Modal.tsx`
5. Check `data-testid` attributes are preserved

## Anti-patterns

❌ `@apply modal__header` or `@apply btn` — custom class chains
❌ Hand-rolling `fixed inset-0 bg-black/50` — use `<Modal>`
❌ `p-6` in modal components — use tight spacing
❌ Inline SVG sizing (`<svg className="h-5 w-5">`) on close buttons — CSS handles it
❌ Template literals for dynamic className — use `cn()`
❌ `focus:ring-primary-500` in `@apply` — use `focus:ring-ring`
❌ Creating new z-index levels without checking the hierarchy above
