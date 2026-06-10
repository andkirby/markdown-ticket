---
id: IDEA-001
status: deferred
date: 2026-06-10
resolution-date:
promoted-to:
---

# Collapsed Project Chips in Selector Rail

## Idea

Two UX options for hiding inactive project chips in the selector rail when screen space is tight or the list is long:

**Option A — Hover-expand on active card**: Hide inactive chips by default. On hover over the active project card, the card area expands rightward to reveal the full chip list. User moves mouse right to select another project. Clicking the active card itself opens the project browser (existing behavior).

**Option B — Collapse button with count**: Keep active card as-is. Add a "collapse" button to the right, styled as a project chip, showing the count of hidden projects (e.g. "+7"). On click/hover, it expands into the full chips list. The list stays open while the mouse remains in the area; once the user leaves, it collapses back to the "+N" button.

## Investigation

Current state (MDT-129):
- `ProjectSelectorRail` renders active card + all inactive chips inline
- On mobile, inactive chips are hidden entirely (only active card shown)
- No collapse/expand behavior exists on desktop
- The `useProjectSelectorManager` hook already computes `railProjects` with favorites-first ordering

Both options solve the same problem: the chip rail can get long with many projects.

Option A changes the active card interaction (hover = expand chips instead of/in addition to hovercard tooltip). Risk of conflicting with the existing HoverCard on the active card and with BR-1.3 (click active card → open browser).

Option B is additive — no change to active card behavior. The "+N" button is a new element. Hover-area-based collapse is a well-known pattern (similar to tab overflow menus, Slack channel lists).

## Decision

**Deferred** — Strong idea, but depends on IDEA-001 shipping first (frees top bar space) and document DnD existing. Promote when top bar has room. Tickets-only first, documents as phase 2.

## References

- MDT-129: Project selector redesign
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — current rail composition
- `src/components/ProjectSelector/ProjectSelectorChip.tsx` — chip component
- `src/components/ProjectSelector/ProjectSelectorCard.tsx` — active card component
