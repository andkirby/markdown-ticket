---
code: MDT-185
status: Implemented
dateCreated: 2026-06-12T16:53:52.478Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-129
---

# Hide inactive project chips until active-card hover

## What changed

Inactive project chips in the selector rail are now **always hidden by default** and **revealed by hovering the active project card**. This removes the daily UI noise of inactive chips always being visible.

| State | Behavior |
|-------|----------|
| Default (desktop) | Only the active project card is visible. Inactive chips hidden. A faint `‹` hint on the card's right edge signals hover reveals more. |
| Hover active card | Inactive chips appear **inline to the right** of the active card, in the same header line, overlaying subsequent header elements. Each chip fades/slides in with a ~25ms stagger. |
| Pointer leaves | Chips hide after a 150ms debounce. |
| Mobile | Unchanged — only the active card; project switching uses the browser. |
| Click active card | Unchanged — opens the project browser. |

## Design decisions

- **Always hide** (no threshold) — even low chip counts add noise to daily UI scanning.
- **No separate button** — the active card itself is the trigger: one gesture, one place to look.
- **Transparent overlay, not a modal** — chips appear as bare inline header elements. No background, border, shadow, or padding on the container.
- **Inline right positioning** — portaled to `document.body`, fixed at the active card's right edge + 8px (matches header `gap-2`), vertically centered on the card.

## Affected files

- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — owns hover state; renders the `CollapsedChipsIndicator` overlay and the `‹` hint.
- `src/components/ProjectSelector/CollapsedChipsIndicator.tsx` — controlled portaled overlay; transparent container; positions via the active card ref.
- `src/components/ProjectSelector/useCollapsedChips.ts` — `isExpanded`/`expand`/`collapse` with debounced leave.
- `src/components/ProjectSelector/project-selector.css` — `.rail-expand-hint`, `.collapsed-chips-overlay`, stagger keyframes.
- `src/components/ProjectSelector/CollapsedChipsIndicator.test.tsx` — unit tests.
- `tests/e2e/selector/project-selector.spec.ts` — E2E tests (hover-reveal behavior).

## Verification

```
Unit tests: 47/47 GREEN (selector suite)
E2E tests:  17/17 GREEN (project-selector.spec.ts)
TypeScript: clean
Build:      ✅
```

## Watchlist

- **Discoverability**: the `‹` chevron is subtle; may need a stronger affordance for first-time users.
- **Keyboard path**: hover-reveal is mouse-only; keyboard users reach projects via the browser (click active card). Progressive enhancement.
