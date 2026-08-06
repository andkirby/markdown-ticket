---
code: MDT-197
status: Implemented
dateCreated: 2026-07-21T22:56:52.402Z
type: Feature Enhancement
priority: Medium
---

# Add vertical pin rail for ticket quick access

## 1. Description

### Requirements Scope

`full`

### Problem

- There is no quick-access surface for tickets a user is actively working on. To return to a ticket, the user must navigate back to the board, locate the column it's in, and scan cards. Repeated context-switching across the session has no shortcut.
- Tickets have no always-visible presence outside their board column. Once a ticket leaves the viewport (different column sort, different filter, different view mode), it's gone until re-found.
- The board is grouped by status, not by "what I'm touching right now." The user's working set and the board's organization are different axes; today only the board's axis has a UI.

### Affected Areas

- Frontend: new left rail in `App.tsx` content row; board cards as drag sources; ticket detail surface as a pin/unpin affordance
- Backend: new persistence endpoint following the document-favorites pattern (`PUT /api/documents/favs`)
- Shared: pin model (project code + ticket code, ordering, favorited-at timestamp)
- Domain contracts: pin entity and input types
- Tests: API endpoint tests (mirroring `server/tests/api/document-favs.test.ts`), E2E for drag-to-pin and click-to-open

### Scope

In scope (Phase 1 — tickets only):

- Vertical left rail (~48px wide) rendered as a sibling to the content area in `App.tsx`
- Icon-only pinned ticket items with hover tooltip showing full identity (project code + ticket code + title + status)
- Drag-to-pin: dragging a board card onto the rail pins the ticket
- Click-to-open: clicking a pinned item opens the ticket viewer
- Unpin via hover-× on each item
- Server-backed persistence via a new `/api/pins` endpoint (following the document-favorites API pattern)
- Cross-project pins rendered side by side (pin carries its project code)
- Overflow: vertical scroll inside the rail; no cap, no wrap, no shrink-to-fit
- Empty rail: hidden entirely (no empty state taking horizontal space)

Out of scope (deferred with evidence):

- Document pins (Phase 2 — requires a drag source on document rows that does not exist yet)
- Auto-populate with in-progress tickets as a smart default
- Auto-unpin on done column (per-action toggle in the resolution dialog)
- Mobile FAB/sheet for the rail (mobile interaction model deferred)
- Pin reordering via drag within the rail (manual ordering; current order is recency-based)
- Hover card / preview pane for pinned items (tooltip only for v1)

## 2. Desired Outcome

### Success Conditions

- When a user drags a board card onto the left rail, the ticket is pinned and appears as an icon-only item in the rail.
- When a user clicks a pinned item, the ticket viewer opens for that ticket.
- When a user hovers a pinned item, a tooltip shows project code, ticket code, title, and status.
- When a user hovers a pinned item, an × appears for one-tap unpin.
- When a user reloads the page, their pin set is restored from the server.
- When a user works across projects, pins from different projects render side by side in the rail.
- When the pin set is empty, the rail is absent (no horizontal real estate consumed).
- When a user has many pins, the rail scrolls vertically rather than wrapping, shrinking, or overflowing the viewport.

### Constraints

- Must occupy the **left rail zone** per the spatial boundary contract (`docs/design/surfaces/board-filter-bar.spec.md` §"Spatial boundary"). The filter bar owns `header__right`; this surface owns the left rail. The two surfaces do not share a zone.
- Must slot into `App.tsx` cleanly: the current `flex-1 overflow-hidden` content row becomes `PinRail + content`. No eviction of existing surfaces.
- Must persist via a server endpoint following the **document-favorites pattern** (`PUT /api/documents/favs`, `src/config/documentFavs.ts`) — not localStorage-only. Reinventing localStorage-only pins would fork the persistence story for user selections.
- Must reuse the existing drag-drop infrastructure (`react-dnd` with `HTML5Backend`, drag type `'ticket'` per `board-layout.spec.md` "Drag-and-Drop"). The rail is a new drop target, not a new DnD system.
- Must work cross-view: rail is visible on board, list, and documents views (it's app-level chrome, not per-view chrome like the header).
- Must remain functional in read-only access modes for viewing pinned tickets; pinning/unpinning is blocked in read-only (mutation).
- Pin model carries project code + ticket code so cross-project pins are unambiguous.

### Non-Goals

- Not changing the board layout, columns, or drag-drop for status changes (`board-layout.spec.md`).
- Not changing the ticket card or its badges (`ticket-card.spec.md`). The card becomes a drag source but its visual contract is unchanged.
- Not redefining the filter bar's spatial zone (`board-filter-bar.spec.md`).
- Not shipping document pins in Phase 1 (no document drag source exists yet).
- Not introducing the auto-populate smart default or the auto-unpin-on-done behavior — both deferred per IDEA-002's "Default at launch" guidance.
- Not adding a hover card or preview pane for pins — tooltip only in v1.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Pin model shape | Where does the `Pin` entity live — `domain-contracts/src/pin/` or `shared/models/Pin.ts`? | Must mirror the document-favorites data shape (path/code, type, favoritedAt); follow the established entity location convention |
| Endpoint shape | Single `PUT /api/pins` with full ordered list (mirroring `/api/documents/favs`) vs. granular `POST`/`DELETE`? | Document favs uses whole-list PUT; prefer consistency unless granular ops have a concrete win |
| Ordering | Recency-pinned-first vs. user-reorderable? | v1: recency-pinned-first (simplest). Reordering deferred. |
| Drag affordance | How does the rail signal it's a drop target during a ticket drag? | Existing pattern: `bg-blue-50/50 ring-2 ring-blue-400/30` (per board-layout column drop hover). Reuse. |
| Tooltip content | What identity fields go in the tooltip? | Project code + ticket code + title + status badge; minimum to disambiguate cross-project pins |
| Empty rail width | Does an empty rail reserve 48px or collapse to 0? | Collapses to 0 — IDEA-002 specifies "hide the section entirely when there are no pins" |

### Known Constraints

- Server persistence pattern is fixed: follow document-favorites (`PUT /api/{resource}/favs`-style whole-list replace).
- Drag type `'ticket'` is fixed by the existing board DnD (`board-layout.spec.md` "Drag-and-Drop").
- Spatial zone is fixed: left rail, sibling to content in `App.tsx`. Cannot move to header (collision with filter bar — MDT-196).
- Cross-project pins must render side by side; the model carries project code.

### Decisions Deferred

- Implementation approach for the rail component (determined by `mdt:architecture`)
- Specific `/api/pins` endpoint shape and routes (determined by `mdt:architecture`)
- Pin model location and exact field set (determined by `mdt:architecture`)
- Task breakdown for Phase 1 vs Phase 2 staging (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)

- [x] User can drag a board card onto the left rail to pin the ticket; the ticket appears as an icon-only item. _(TEST-e2e-drag-to-pin, BR-1)_
- [x] User can click a pinned item to open the ticket viewer for that ticket. _(TEST-e2e-click-opens-viewer, BR-2)_
- [x] User can unpin via an × that appears on hover over a pinned item. _(TEST-e2e-hover-unpin, BR-3/BR-6)_
- [x] Pinned items persist across page reloads via the server endpoint (not browser-local only). _(TEST-e2e-persist-reload, BR-4; API tests in server/tests/api/pins.test.ts)_
- [x] Pins from different projects render side by side in the same rail. _(cross-project API test; PinItem renders per-pin projectCode independently)_
- [x] Hovering a pinned item shows a tooltip with project code, ticket code, title, and status. _(TEST-e2e-pin-tooltip-priority-glyph; tooltip renders via canonical <TicketCode> + StatusBadge)_
- [x] Empty pin set: no horizontal space consumed. _(TEST-e2e-empty-rail-collapsed; design evolved from "rail absent" to a collapsed floating button at 0px layout footprint — per UX iteration to eliminate jumping UI. The "no horizontal space consumed" intent is preserved.)_
- [x] Overflow pin set: rail scrolls vertically; items do not shrink, wrap, or overflow the viewport. _(overflow-y: auto on .pin-rail; flex-shrink: 0 on items)_
- [x] Rail is visible on board, list, and documents views (cross-view chrome). _(TEST-e2e-cross-view, BR-9)_
- [x] Pinning and unpinning are blocked in read-only access modes; viewing pinned tickets remains available. _(canWrite gates drop + unpin; click-to-open unconditional)_

### Non-Functional

- [x] Rail render has no perceivable lag with up to 50 pins. _(C-1: PinItem is a stateless 32px button; no per-item image/network; tooltip lazily portaled on hover)_
- [x] Drag-to-pin does not regress the existing board drag-drop for status changes. _(TEST-e2e-board-dnd-regression, C-2)_
- [x] Server endpoint response time is consistent with the document-favorites endpoint. _(C-3: same controller/service/repository layering; whole-list PUT replace mirroring /api/documents/favs)_
- [x] No new runtime frontend dependencies added. _(C-4: reuses react-dnd + HTML5Backend, lucide-react, Radix tooltip — all pre-existing)_

### Edge Cases

- Pinned ticket is deleted or moved out of scope → pin becomes stale; on next server sync, it is dropped silently from the rail.
- Pinned ticket's status changes → tooltip updates; the pin itself does not auto-remove (auto-unpin-on-done is deferred).
- User pins a ticket while offline → mutation fails gracefully with a toast; rail does not show a phantom pin.
- Pin set in server is from an older schema → migrated or reset; never throws.
- Two tickets from different projects have the same numeric code (e.g. `MDT-042` and `OTHER-042`) → both render correctly; project code disambiguates.

## 5. Verification

### How to Verify Success

- Manual: drag a board card onto the rail; confirm the pin appears, persists across reload, opens the viewer on click, and unpins on ×.
- Manual: pin tickets from two different projects; confirm both render side by side and tooltips disambiguate.
- Manual: confirm the rail is absent when no pins exist and scrolls vertically when many pins exist.
- Manual: confirm the rail is visible on board, list, and documents views.
- Automated: API endpoint tests mirroring `server/tests/api/document-favs.test.ts` — list, replace (PUT), validation, cross-project.
- Automated: E2E covering drag-to-pin, click-to-open, hover-unpin, and persistence across reload.
- Regression: existing board drag-drop tests, document-favorites tests, and read-only access tests remain green.

## Source Artifacts

| Artifact | Path | Role |
|----------|------|------|
| Idea (revised) | `docs/ideas/IDEA-002-global-pin-bar.md` | Source — revised 2026-07-20 with vertical left rail decision and resolved open questions |
| Spatial boundary | `docs/design/surfaces/board-filter-bar.spec.md` §"Spatial boundary" | Pin rail owns left rail; filter bar owns header__right |
| Spatial decision | `docs/design/explorations/filtering-system.md` §3.1 | Why the rail (not the header) — rejected alternatives |
| Neighbor spec | `docs/design/surfaces/board-layout.spec.md` | Drag-drop contract the rail reuses (drag type `'ticket'`) |
| Neighbor spec | `docs/design/surfaces/app-header.spec.md` | Extension note forbidding second header strip |
| Persistence pattern | `src/config/documentFavs.ts`, `server/tests/api/document-favs.test.ts` | Established server-backed user-selection pattern to follow |
| Layout insertion | `src/App.tsx` | `flex-1` content row becomes `PinRail + content` |
| Sibling ticket | `docs/CRs/MDT-196-board-filter-bar.md` | Spatial boundary partner — filter owns header |

## Phase Plan (non-binding — final breakdown via `mdt:tasks`)

- **Phase 1**: tickets only, vertical left rail, server-backed persistence (`/api/pins`), drag-to-pin from board cards, click-to-open, hover tooltip, unpin on hover-×. Cross-project pins. Overflow scroll. Empty rail hidden.
- **Phase 2**: document pins (requires document drag source — separate dependency).
- **Deferred**: auto-populate with in-progress tickets (smart default), auto-unpin on done column (per-action toggle in resolution dialog), mobile FAB/sheet for the rail, pin reordering via drag, hover card / preview pane.