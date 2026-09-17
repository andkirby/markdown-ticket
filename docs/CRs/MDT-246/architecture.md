# MDT-246 — Architecture

Frontend-only feature: two entry points jump from an epic reference to the Epics
board focused on that epic, via a URL-addressable `?epic=` token. No backend,
schema, or data changes.

Upstream decisions live in the CR (`docs/CRs/MDT-246-epic-detail-board-jump.md`
§2) and the design pass (2026-09-15, committed 49dfc019):
`docs/design/surfaces/epic-navigation.interactions.md` is the binding journey
contract (token semantics, focus lifecycle, `?view=` carry).

## 1. Route token — parsing and construction

**Owner**: `frontend/src/routes.ts` owns construction; `ProjectRouteHandler`
owns parsing (same split as `?view=` today).

- New builder `buildEpicsFocusPath(projectCode, epicKey)` →
  `/prj/:code/epics?epic=KEY`. Both entry points (CTA + split-chip action zone)
  use this single construction site — no string concatenation at call sites.
- Parsing: `ProjectRouteHandler` reads `searchParams.get('epic')` **only when
  `onEpicsRoute`** and threads `focusEpicKey: string | null` down
  `ProjectView` → `Board` → `SwimlaneBoard`. The board never reads the URL
  itself; prop threading mirrors how `boardLayoutMode` travels today.
- Token lifetime: view state, not resource address. It is dropped naturally by
  any in-app navigation (view switch, opening a ticket) and never rewritten
  onto other routes. `useViewModeRouting`'s root-path redirect only fires on
  the bare `/prj/:code` path, so `/epics?epic=X` arrives intact.

## 2. Focus lifecycle — `SwimlaneBoard`

**Owner**: `SwimlaneBoard/index.tsx` (effects) + `SwimlaneBoard/helpers.ts`
(pure logic) + `swimlane-board.css` (transient highlight).

Ordered effects when the board mounts with a token, or the token changes while
mounted (interactions doc §Focus lifecycle):

1. **Expand** — the focused lane joins `expandedLaneKeys`; `writeExpandedLanes`
   persists it (`mdt-settings-swimlane-expanded-lanes`). Unknown key: no state
   change at all (degrade, do not block).
2. **Visibility override** — `filterLanesByVisibility` gains a `focusedKey`
   option: the focused lane is exempt from `hideEmpty` / `showClosed`
   exclusion. Pure helper → unit-tested at the boundary (empty+hidden,
   closed+hidden, unknown key).
3. **Search** — an active search that would exclude the focused lane is
   cleared (arrival must land on the lane, not on a filtered-out board);
   a search that matches the lane stays.
4. **Scroll** — after render, `[data-lane-key=KEY]` scrolls into view
   (`block: 'nearest'`, `inline: 'start'` — label plus leading columns).
5. **Highlight** — transient `data-focused` lane styling in the lane's
   `--epic-color` custom property (already set per lane); auto-clears ~2s.
   Expansion persists; the highlight does not.

Focus ends on user board interaction (search typing, filter toggle, collapsing
the focused lane). Ending focus never re-collapses the lane — the persisted
expanded set is the user's, not the token's. A `focusSeq` counter (increments
per token change) keys the one-shot arrival; interactions set `focusActive`
false without touching the URL.

Announcement: a polite live region announces the focused lane as an expanded
epic lane (a11y parity with the visual highlight).

## 3. Entry point 1 — `Epics →` CTA on the epic detail

**Owner**: new `TicketViewer/EpicBoardAction.tsx`; composed in
`TicketViewer/index.tsx` action slot beside Trace Graph.

- Renders when `ticket.level === 'epic'` (same predicate as
  `utils/ticketLevels.isEpicTicket`).
- One navigation: `navigate(buildEpicsFocusPath(projectCode, ticket.code))`.
  The pathname leaves `/ticket/…`, so the URL-driven modal unmounts with the
  navigation — no `onClose` call, no orphaned modal state.
- Chrome: the shared 32px ticket-viewer action style (`.trace-graph-action`
  renamed to a surface-neutral name, both buttons consuming it — no second
  copy of the chrome). Label `Epics →` (Rows3 leading, arrow-right trailing);
  accessible name is the full sentence "Show MDT-### on Epics board"
  (Label-in-Name).

## 4. Entry point 2 — split chip on the epic ContextBadge

**Owner**: `Badge/ContextBadge.tsx` + `Badge/badge.css`; surface flag from the
two detail call sites.

- New prop `detail?: boolean`. `CompactTicketHeader` passes it;
  `TicketAttributeTags` (board cards) does not — cards are scan surfaces and
  keep the compact single-zone badge. `TicketAttributes.tsx` also passes it,
  but that component is currently dead code (only its test imports it,
  pre-existing at the baseline commit) — the live detail surface is the viewer
  header; the flag keeps the panel correct if it is ever revived.
- Structure (spec composition): `Badge[data-context=epic]` shell with
  `span.badge__id` (passive Zap + key link, unchanged MDT-193 behavior) and a
  sibling `button.badge-action` (rows-3, ≥24×24, seam + rest veil, hover
  `--state-hover-bg`, `stopPropagation`). Zones are siblings — never a button
  inside a link.
- The action navigates via `buildEpicsFocusPath(currentProject, ticketKey)`
  using `parsedLink.ticketKey` (already normalized by `classifyLink`, so
  `MDT-231.md` style values resolve too). Cross-project phase values ride the
  pre-existing `classifyLink` limitation (current-project resolution) — out of
  scope, documented in context-badge.spec.md.

## 5. `?view=` carry — `SmartLink`

**Owner**: `SmartLink/index.tsx` — the single runtime owner of in-content
ticket-link rendering, so ContextBadge, RelationshipBadge, and markdown ticket
links get the fix uniformly.

Rule: when the current location is a ticket route and carries `?view=V`, a
TICKET/CROSS_PROJECT link whose href has no query gains `?view=V`. Everything
else (documents, external, anchors) is untouched, and hrefs that already carry
a query are never rewritten. `ticketCloseTargetPath` already maps the token —
this closes the modal-to-modal gap where it was dropped.

## 6. Invariants

- INV-1: The Zap glyph is never a click target (identity, not action).
- INV-2: Board cards never render the action zone (scan surfaces stay
  compact).
- INV-3: Focus is one-shot per token value; user interactions end it; lane
  expansion is never auto-reverted.
- INV-4: `?epic=` is never rewritten onto non-`/epics` routes.
- INV-5: Unknown epic keys produce no error state anywhere in the chain
  (builder is unconditional; board ignores what it cannot resolve).

## 7. Rollback

Every change is behind existing routes and props; reverting the commits
restores current behavior. No migration, no persisted-format change (the
expanded-lanes localStorage shape is untouched — focus only adds a member to
the existing set).

## 8. Test architecture

- Unit (bun:test + happy-dom, DndProvider wrapper for board):
  - `SwimlaneBoard/helpers.test.ts` — visibility-override pure logic +
    unknown-key no-op.
  - `SwimlaneBoard/SwimlaneBoard.test.tsx` — focus lifecycle: expansion
    persisted, search cleared, transient highlight cleared after timeout,
    unknown key ignored.
  - `Badge/ContextBadge.test.tsx` — split-chip zones (detail vs card), a11y
    names, Zap passive, stopPropagation.
  - `SmartLink` — view-carry rule (ticket route + view → carried; board route
    → not carried; existing query → untouched).
  - `EpicBoardAction` — render contract + navigation target.
- E2E (Playwright, wrapper): one journey spec per entry point —
  CTA: ticket → epic detail → `Epics →` → focused lane (expanded, scrolled,
  highlighted) via `data-lane-key`; badge: split-chip action → focused lane;
  view-carry round trip (open from Epics view → epic via badge link → close →
  back on `/epics`).

## 9. What this architecture does NOT do (accepted scope)

- No embedded children list inside the epic detail (option B, rejected).
- No universal "reveal ticket anywhere" (option C, deferred; the focus
  primitive is built generically for it).
- No history/back machinery — entry-point affordances carry the
  unambiguity burden instead (design rationale).
- No cross-project deep link for the phase badge (pre-existing
  `classifyLink` limitation).
