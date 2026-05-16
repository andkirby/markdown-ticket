# Tab Standardization Plan

## Problem
Settings modal tabs and TicketViewer tabs share the same Radix Tabs primitives
but have completely different styling — inline classes vs CSS classes, different
padding, colors, and active indicator behavior.

## Architecture (STYLING.md)

```css
.tab                 — base trigger: font, colors, active border-b-2
.tab--fill           — modifier: flex-1 equal-width (settings)
.tab__list           — Tabs.List container (replaces modal__section for tabs)
.tab__content        — Tabs.Content container
```

Both tab surfaces use the same base `.tab` class. Settings adds `tab--fill`
for equal-width layout. Ticket tabs stay compact with `mr-3` spacing.

## Changes

### 1. CSS: Add tab classes in index.css

```css
.tab__list {
  /* Same as modal__section — border-b separator */
  @apply flex px-4 py-0 border-b border-gray-200 dark:border-gray-700;
}
.tab {
  @apply px-2 py-1.5 text-sm font-medium text-muted-foreground
    transition-colors hover:text-foreground whitespace-nowrap;
}
.tab[data-state='active'] {
  @apply border-b-2 border-primary text-foreground;
}
.tab--fill {
  @apply flex-1 px-4 py-3;
}
.tab__content {
  @apply p-4 outline-none;
}
```

### 2. SettingsModal
- `Tabs.List` → `tab__list`
- `Tabs.Trigger` → `tab tab--fill` (replaces `settings-tab-trigger`)
- `Tabs.Content` → `tab__content` (replaces `settings-tab-content`)
- Remove `settings-tab-trigger` and `settings-tab-content` CSS

### 3. TicketDocumentTabs
- `Tabs.List` → `tab__list` + overflow classes
- `Tabs.Trigger` → `tab` + `mr-3 last:mr-0` (replaces inline monstrosity)
- Remove micro-hover animations (inconsistent with settings, adds complexity)

## Files
- `src/index.css` — add `.tab` classes, remove `.settings-tab-trigger`, `.settings-tab-content`
- `src/components/SettingsModal.tsx` — use `tab` classes
- `src/components/TicketViewer/TicketDocumentTabs.tsx` — use `tab` classes
