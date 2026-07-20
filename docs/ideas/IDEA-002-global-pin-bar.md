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

- **Revised 2026-07-20**: lives in a **vertical left rail** (~48px wide), not the top header. See Decision.
- Original plan (top header, coexisting with project selector rail) was abandoned due to collision with the board filter bar.

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

### Open questions (resolved 2026-07-20)

- **Document drag-drop**: Still does not exist. Phase 1 ships **tickets only**; documents are phase 2 once a drag source exists on document rows.
- **Persistence**: Follow the existing document-favorites pattern — server-backed via a `/api/pins` endpoint, not pure localStorage. The document favs API (`PUT /api/documents/favs`) is the established MDT pattern for persistent user selections; reinventing localStorage-only pins would fork the persistence story. Cross-project by default (pins carry their project code, e.g. `MDT-042`, `OTHER-15`).
- **Max items / overflow**: Vertical scroll inside the rail. No cap, no wrap, no shrink-to-fit — the rail is a fixed-width column, overflow scrolls. Icon-only items keep each row to ~40px.
- **Cross-project pins**: Yes. Pin model carries project code + ticket code; the rail renders both side by side. Tooltip shows full identity.

## Decision

**Promote** — with a spatial change from the original idea.

The original idea placed the pin bar in the **top header area**, coexisting with the project selector
rail (IDEA-001). That plan collided with the board filter bar
(`docs/design/surfaces/board-filter-bar.spec.md`), which also needs `header__right`. Two horizontal
strips fighting for one 64px header is a forever-collision.

**Revised layout: vertical left rail.** The pin bar becomes a ~48px vertical rail on the left edge,
sibling to the content area in `App.tsx` (the `flex-1` content row becomes `PinRail + content`). The
filter bar keeps the header. Each surface gets its own zone — no shared-row negotiation, no permanent
vertical tax on the board, no special-case layout code.

Why a rail fits the pin bar specifically (vs. the header):

- Pins are persistent, cross-view context; the header is per-view chrome. Different jobs.
- The pin set is small; a vertical rail scales to ~10 icon-only items before scroll, vs. ~4 on a narrow header.
- MDT has no left rail today (`App.tsx` is `flex flex-col`), so the rail is greenfield — no eviction.
- A vertical strip is a larger, stabler drag-drop target than a thin header row.

**Phase plan**:

1. **Phase 1**: tickets only, vertical left rail, server-backed persistence (`/api/pins`), drag-to-pin from board cards, click-to-open, hover tooltip, unpin on hover-×.
2. **Phase 2**: document pins (requires document drag source).
3. **Deferred**: auto-populate with in-progress tickets, auto-unpin on done column (per-action toggle), mobile FAB/sheet for the rail.

The smart-default auto-populate and auto-unpin-on-done behaviors from the original idea stay deferred
per the idea's own "Default at launch: no auto-unpin" guidance.

Cost: M (was S — bumped for the new rail primitive + server endpoint).

## References

- MDT-129: Project selector redesign (top bar area)
- IDEA-001: Collapsed project chips (frees space in top bar)
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — current top bar occupant
- Document favorites: existing per-project favorite mechanism (`src/config/documentFavs.ts`, `PUT /api/documents/favs`)
- `docs/design/surfaces/board-filter-bar.spec.md` — spatial boundary contract (filter owns header__right, pin owns left rail)
- `docs/design/explorations/filtering-system.md` §3.1 — spatial decision and rejected horizontal alternatives
- `src/App.tsx` — rail insertion point (`flex-1` content row becomes `PinRail + content`)
