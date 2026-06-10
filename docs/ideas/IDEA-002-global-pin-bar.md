---
id: IDEA-002
status: promoted
date: 2026-06-10
resolution-date:
promoted-to:
---

# Global Pin Bar for Quick Access

## Idea

A persistent "pin bar" in the top area of the desktop layout where users can pin tickets and documents for quick access. Not favorites — a global hot-pin area for items you're actively working with.

### Behavior

- **Drag & drop**: When user starts dragging a ticket, the pin bar highlights to signal it's a drop target. Drop pins the item.
- **Documents too**: Pin documents from the documents view/folders. Document drag-drop doesn't exist yet — needs investigation.
- **Compact cards**: Pinned items render as small cards. Tickets can shrink down to just the code (e.g. `MDT-042`). Documents need enough text to be identifiable (first few words of name/filename).
- **Dynamic sizing**: When many items are pinned, cards shrink to a reasonable minimum. Exact behavior TBD — possibly a max-width with overflow scroll or a "show more" toggle.
- **Tooltips on hover**: Hovering a pinned card shows a tooltip with full info — ticket summary/status or document full name/filepath. Similar to project chip hover cards.
- **Unpin**: Click or right-click to unpin. Possibly a small × on hover.

### Layout

- Lives in the top bar area of the desktop view
- Coexists with the project selector rail (IDEA-001) — the freed space from collapsed chips makes room
- Should feel integrated, not bolted on

### Smart default

When the user is on a non-board view (list, documents, etc.), the pin bar could auto-populate with **in-progress tickets** as a starting set. This gives immediate value without requiring manual pinning — the user sees what's active without switching to the board.

Once the user manually pins/unpins items, their choices take precedence. The auto-population only fills the bar when it's empty.

### Naming

"Pin bar" is the working name. Other candidates: Hotbar, Quick Access Bar, Pin Strip, Shelf, Pinned Strip.

### Auto-unpin on done column

When a ticket is moved to any status in the done column (implemented, rejected, partially implemented), the user should be offered to unpin it.

**Per-action flag (preferred)**: A toggle in the status change dialog that only appears when:
1. The ticket is currently pinned, AND
2. The target column is the done column

**Default is on (unpin)** — nudges users to clean up done work. When on, label reads "Unpin from bar". User can toggle it off, label changes to "Leave pinned". This way the user makes a conscious choice to keep the ticket pinned rather than having to remember to clean up.

Alternative: global config ("always unpin on done" / "always leave"). Simpler but less flexible — defer unless users ask for it.

**Default at launch**: no auto-unpin (user manages pins manually). Add the per-action toggle when the done column concept is stable.

**CLI behavior**: When closing a ticket via CLI (e.g. status change to done column), unpin silently without prompting. No flags, no options. CLI is mostly for agents — they don't manage pins.

## Investigation

### Current state

- MDT-129 delivers the project selector rail in the top bar
- IDEA-001 (collapsed chips) frees horizontal space in that bar
- Tickets have drag-and-drop on the board view (for status changes)
- Documents view exists with folder browsing but no drag-drop
- Favorites exist for documents but are per-project, not global

### Open questions

- **Document drag-drop**: Does not exist yet. Would need a drag source on document rows/cards. Could use the same HTML5 DnD or a library approach.
- **Persistence**: Where do pins live? Per-user, global (cross-project)? Likely stored in localStorage or user preferences.
- **Max items**: Is there a cap? What happens when the bar overflows — scroll, wrap, shrink, or pop an overflow menu?
- **Cross-project pins**: If user works across projects, can they pin MDT-042 and OTHER-15 side by side? Probably yes.

## Decision

**Promote** — Option B (+N collapse button) is the right approach. Additive, no conflicts with existing interactions, well-understood UX pattern. Cost: S.

## References

- MDT-129: Project selector redesign (top bar area)
- IDEA-001: Collapsed project chips (frees space in top bar)
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — current top bar occupant
- Document favorites: existing per-project favorite mechanism
