# Badge CSS Architecture

**Status: ✅ Migration Complete**
This pattern is now implemented. See `src/components/Badge/badge.css` for the live implementation.

Step-by-step guide for defining badge styles with theming support.

---

## Overview

**End result:**
```
src/components/Badge/
├── index.tsx              # Exports
├── StatusBadge.tsx        # Uses data attributes (no CVA)
├── PriorityBadge.tsx
├── TypeBadge.tsx
├── badge.css              # All badge styles
└── types.ts               # TypeScript types

# badgeVariants.ts - DELETED (no longer needed)
```

**Layering:**
```
┌─────────────────────────────────────────────┐
│  Component (TSX)                            │
│  className="badge"                          │
│  data-status="proposed"                     │
└────────────────────┬────────────────────────┘
                     │ CSS selector matches
                     ▼
┌─────────────────────────────────────────────┐
│  CSS (badge.css)                            │
│  .badge[data-status="proposed"] { }         │
└────────────────────┬────────────────────────┘
                     │ Uses (optional)
                     ▼
┌─────────────────────────────────────────────┐
│  Tokens (badge.css :root)                   │
│  --badge-proposed-bg: ...                   │
└─────────────────────────────────────────────┘
```

---

## Step 1: Define Tokens (Optional)

Choose granularity based on theming needs:

### Option A: Per-variant tokens (maximum theming)
```css
/* badge.css */

:root {
  --badge-proposed-bg: theme('colors.gray.100');
  --badge-proposed-text: theme('colors.gray.800');
  --badge-approved-bg: theme('colors.blue.100');
  --badge-approved-text: theme('colors.blue.800');
  /* ... */
}

.dark {
  --badge-proposed-bg: theme('colors.gray.950');
  --badge-proposed-text: theme('colors.gray.200');
  /* ... */
}
```

### Option B: Direct values in classes (simpler)
```css
/* No tokens, just Tailwind values in classes */
/* See Step 2 */
```

**Recommendation:** Start with Option B. Add tokens only when you need runtime theming.

---

## Step 2: Define CSS Classes

```css
/* badge.css */

/* Base class (single, shared by all badge types) */
.badge {
  @apply inline-flex items-center px-2 py-1 text-xs font-medium;
  @apply rounded-full border border-transparent;
  @apply transition-colors;
}

/* Status variants */
.badge[data-status="proposed"] {
  @apply bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200;
}

.badge[data-status="approved"] {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200;
}

.badge[data-status="in-progress"] {
  @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200;
}

.badge[data-status="implemented"] {
  @apply bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200;
}

/* Priority variants */
.badge[data-priority="critical"] {
  @apply bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200;
}

.badge[data-priority="high"] {
  @apply bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200;
}

/* Type variants */
.badge[data-type="bug-fix"] {
  @apply bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200;
}

.badge[data-type="feature-enhancement"] {
  @apply bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200;
}

/* Size modifiers */
.badge.badge--sm { @apply px-1.5 py-0.5 text-[10px]; }
.badge.badge--lg { @apply px-3 py-1.5 text-sm; }

/* State modifiers (neighbor classes) */
.badge.active { @apply ring-2 ring-primary; }
.badge.loading { @apply opacity-50 animate-pulse; }
```

---

## Step 3: Component Implementation (No CVA)

```tsx
// StatusBadge.tsx

import { cn } from '../../lib/utils'
import type { Status } from '@mdt/domain-contracts'

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function formatDataAttr(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'badge',
        size !== 'md' && `badge--${size}`,
        className
      )}
      data-status={formatDataAttr(status)}
    >
      {status}
    </div>
  )
}
```

---

## Step 4: Priority & Type Badges

Same pattern, different data attributes:

```tsx
// PriorityBadge.tsx
export function PriorityBadge({ priority, size, className }: PriorityBadgeProps) {
  return (
    <div
      className={cn('badge', size !== 'md' && `badge--${size}`, className)}
      data-priority={formatDataAttr(priority)}
    >
      {priority}
    </div>
  )
}

// TypeBadge.tsx
export function TypeBadge({ type, size, className }: TypeBadgeProps) {
  return (
    <div
      className={cn('badge', size !== 'md' && `badge--${size}`, className)}
      data-type={formatDataAttr(type)}
    >
      {type}
    </div>
  )
}
```

---

## Step 5: Import CSS

```css
/* src/index.css */

@import './components/Badge/badge.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Token Granularity Guide

| Granularity | When to Use | Example |
|-------------|-------------|---------|
| Per-variant | Runtime theming, user themes | `--badge-proposed-bg` |
| Direct values | Build-time theming only | `@apply bg-gray-100` |
| Semantic | Shared meanings | `--color-success`, `--color-danger` |

---

## Data Attribute Format

```
data-{attribute}="{value}"

Examples:
data-status="proposed"
data-status="in-progress"    // spaces → dashes
data-priority="critical"
data-type="bug-fix"
```

---

## Checklist: Adding New Badge Variant

1. [ ] Add CSS selector in `badge.css`:
       `.badge[data-status="new-variant"] { ... }`
2. [ ] Add token if using tokens: `--badge-new-variant-bg`
3. [ ] No CVA changes needed
4. [ ] No TypeScript changes needed (if type already exists)
5. [ ] Test in light/dark mode

---

## Migration: From CVA to Data Attributes

**Before (current CVA - Tailwind classes in TS):**
```tsx
// badgeVariants.ts
const statusVariants = cva(baseBadgeClasses, {
  variants: {
    status: {
      Proposed: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200',
      Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      // ... all colors defined in TypeScript
    }
  }
})

// Component
<div className={statusVariants({ status })}>
```

**After (data attrs - colors in CSS):**
```tsx
// Component only
<div className="badge" data-status={formatDataAttr(status)}>
```
```css
/* badge.css */
.badge[data-status="proposed"] { @apply bg-gray-100 text-gray-800...; }
.badge[data-status="approved"] { @apply bg-blue-100 text-blue-800...; }
```

| Aspect | Before (CVA) | After (Data Attr) |
|--------|--------------|-------------------|
| Color definitions | TypeScript strings | CSS file |
| Theming | Rebuild TS | Edit CSS only |
| New variant | Update CVA + types | Add CSS selector |
| `badgeVariants.ts` | Required | Delete |

---

## Summary

```tsx
// Component
<div className="badge badge--sm" data-status="approved">Approved</div>
```

```css
.badge { /* base styles */ }
.badge[data-status="approved"] { /* variant styles */ }
.badge.badge--sm { /* size modifier */ }
```

**One base class. Data attribute = semantic meaning. Size/state as modifiers.**
