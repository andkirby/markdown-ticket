# Requirements: MDT-118

**Source**: [MDT-118](../MDT-118.md)
**Generated**: 2026-01-17
**CR Type**: Feature Enhancement
**Scope**: Brief

## UI Styling Enhancement

Visual improvements to the ticket board interface using modern CSS patterns including gradients, animations, skeleton loaders, and overflow handling.

## Styling Requirements

### 1. Skeleton Loading State

WHEN the board is loading tickets,
the system shall render a skeleton grid matching the actual board layout
with 4 columns × 3 placeholder cards and staggered gradient animations.

- Animation uses `bg-gradient-to-r` with `animate-pulse`
- Stagger delay: 150ms per element
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

### 2. Badge Gradient Styling

Ticket attribute badges (status, priority, type) shall render with gradient backgrounds
instead of flat colors.

- Status badges: `backdrop-blur-sm` with gradient
- Priority badges: Color-specific gradients (rose, amber, emerald)
- Type badges: Color-specific gradients (blue, orange, purple, slate, cyan)

### 3. Drag-and-Drop Visual Feedback

WHEN a ticket card is being dragged,
the system shall apply transform effects (scale, rotate, shadow)
and remove them when dragging ends.

- Dragging state: `opacity-40 scale-95 rotate-2` with `shadow-2xl`
- Hover state: `scale-[1.02] -translate-y-1`
- Transition: `duration-300 ease-out`

### 4. Column Header Gradients

Column headers shall render with gradient backgrounds
matching their status color mapping.

- Uses `getColumnGradient(colorName)` from `colorUtils.ts`
- Includes borders: `border-black/5 dark:border-white/10`
- Rounded top corners with `shadow-md`

### 5. Project Selector Scroll Overflow

WHEN project count exceeds viewport width,
the system shall enable horizontal scrolling with hover-visible scrollbar.

- Uses Radix UI `ScrollAreaPrimitive.Root/Viewport`
- Scrollbar hidden by default, visible on hover
- Max-width: `calc(100vw - 320px)`

### 6. Color Mapping Utility

The system shall provide `getColumnGradient(colorName)` function
that maps color names to Tailwind gradient classes.

- Supports: gray, blue, yellow, green, red, teal, indigo, orange, purple, pink
- Returns light/dark mode variants
- Fallback to gray gradient for unknown colors

## Fix Criteria

- [ ] `src/utils/colorUtils.ts` exists and exports `getColumnGradient()`
- [ ] Board loading state shows skeleton grid instead of spinner
- [ ] All badge types render with `bg-gradient-to-r` classes
- [ ] Dragged tickets have visual transform effects
- [ ] Column headers use gradient backgrounds from `colorUtils.ts`
- [ ] Project selector scrolls horizontally when needed
- [ ] Scrollbar appears on hover only
- [ ] Dark mode gradients work for all color mappings
- [ ] No behavioral regressions in drag-and-drop functionality
- [ ] No behavioral regressions in project switching

## Verification

**Manual Testing**:
1. Load board with slow network → verify skeleton animation
2. Drag ticket card → verify transform effects apply/remove
3. Add 10+ projects → verify horizontal scroll appears on hover
4. Toggle dark mode → verify gradients render correctly
5. Inspect badge elements → verify `bg-gradient-to-r` classes present

**Unit Testing**:
- `getColumnGradient('blue')` returns correct gradient classes
- `getColumnGradient('unknown')` returns gray gradient fallback

**Visual Regression**:
- Compare board layout before/after → ensure no spacing issues
- Verify responsive breakpoints work (md, lg, xl grid columns)

---
*Generated from MDT-118 by /mdt:requirements (v2)*
