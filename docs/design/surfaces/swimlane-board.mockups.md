# Swimlane Board - Mockups

Related spec: `swimlane-board.spec.md`
Related requirements: MDT-206 (`docs/CRs/MDT-206-epic-swimlane-board.md`)

Wireloom is structural, not pixel-perfect. These mockups show layout truth, lane construction, and the epic lifecycle control states — the review-critical contracts. Exact column widths, color densities, and drag visuals are owned by the spec's tokens/classes.

## 1. Board header — Epics toggle (off)

The "Epics" toggle appears in the board header next to sort/refresh, only when the board view is active. Off = flat board (unchanged).

```wireloom
window "Atlas — Board":
  panel:
    row:
      text "Board"
      spacer
      segmented:
        segment "Flat" selected
        segment "Epics"
      button "Sort: Priority"
      button "Refresh"
      button "New" primary
    row:
      text "Columns: Backlog · Open · In Progress · Done"
```

| Element | Semantic Pattern | Notes |
|---|---|---|
| `segment "Epics"` | board-mode toggle | selecting it switches to swimlane layout; default is Flat |

## 2. Swimlane — default state

The default swimlane view. Two epic lanes + the trailing "No epic" lane. Each lane label shows the epic indicator, title, lifecycle control, progress, and count. Columns align across rows.

```wireloom
window "Atlas — Board / Epics":
  panel:
    row:
      segmented:
        segment "Flat"
        segment "Epics" selected
      button "Hide empty"
      button "Collapse all"
      button "Expand all"
      spacer
      text "3 lanes"
    row:
      col:
        text "EPIC LANE · Auth Overhaul"
        button "MDT-180" id="ep1-key"
        row:
          chip "Proposed" id="ep1-status"
          text "0"
          button "▾" id="ep1-chevron"
        progress value=0 max=5 label="0/5" id="ep1-progress"
        row:
          button "Activate" primary id="ep1-action"
        row:
          text "Backlog"
          text "Open"
          text "In Progress"
          text "Done"
        row:
          list:
            item "MDT-181  OAuth PKCE"
            item "MDT-182  Session store"
          list:
            item "MDT-183  Token refresh"
          list:
            item "—"
          list:
            item "—"
    row:
      col:
        text "EPIC LANE · Cloud Sync"
        button "MDT-012" id="ep2-key"
        row:
          chip "Approved" id="ep2-status"
          text "3"
          button "▾" id="ep2-chevron"
        progress value=3 max=5 label="3/5" id="ep2-progress"
        row:
          button "Close" id="ep2-action"
        row:
          list:
            item "MDT-200  First slice"
          list:
            item "MDT-201  Conflict UI"
          list:
            item "MDT-202  Poll worker"
            item "MDT-203  Backoff"
          list:
            item "MDT-204  E2E"
            item "MDT-205  Telemetry"
    row:
      col:
        text "NO EPIC"
        row:
          chip "—"
          text "no epic"
          button "▾"
        row:
          list:
            item "MDT-099  README typo"
          list:
            item "—"
          list:
            item "—"
          list:
            item "—"
```

| Element | Semantic Pattern | Notes |
|---|---|---|
| `button "MDT-180"` (Auth key) | clickable epic key | `<TicketCode>` glyph-before-key; opens the epic ticket viewer |
| `chip "Proposed"` (Auth lane) | EpicLifecycleControl, Proposed state | on the status/count row |
| `button "Activate" primary` | Proposed→Approved transition | sits directly under the progress bar |
| `button "Close"` (Cloud Sync lane) | Approved→Implemented transition | enabled here because all children terminal |
| `chip "Approved"` | EpicLifecycleControl, Approved state | on the status/count row |
| `progress "3 of 5" percent=60` | mini progress bar | `--epic-N` fill on `--bg-muted` track |
| `chevron down` | lane collapse toggle | right-aligned on the status/count row; `aria-expanded` |
| "NO EPIC" lane | `__none` trailing lane | neutral accent, no lifecycle control, no progress, no key |

## 3. Lane lifecycle — blocked Close

The same Cloud Sync epic, now with two children still open. Close is disabled with a tooltip naming the blockers. This is how the MDT-205 close guard surfaces in the UI.

```wireloom
window "Atlas — Board / Epics":
  panel:
    row:
      col:
        text "EPIC LANE · Cloud Sync"
        button "MDT-012" id="ep3-key"
        row:
          chip "Approved" id="ep3-status"
          text "5"
          button "▾"
        progress value=3 max=5 label="3/5" id="ep3-progress"
        row:
          button "Close" disabled id="ep3-action"
        row:
          list:
            item "MDT-200  First slice"
          list:
            item "MDT-201  Conflict UI"
          list:
            item "MDT-202  Poll worker"
            item "MDT-203  Backoff"
            item "MDT-209  Retry cap"
          list:
            item "MDT-204  E2E"
            item "MDT-205  Telemetry"

annotation "Close blocked: 2 children still In Progress (MDT-202, MDT-209).\nTooltip lists the blockers.\nButton is disabled, not hidden." target="ep3-action" position=right
annotation "Progress reflects terminal children (3 of 5),\nnot just Implemented." target="ep3-progress" position=right
```

## 4. Lane lifecycle — Closed

The epic after a successful close. Implemented indicator, no primary action.

```wireloom
window "Atlas — Board / Epics":
  panel:
    row:
      col:
        text "EPIC LANE · Cloud Sync"
        button "MDT-012" id="ep4-key"
        row:
          chip "Implemented" id="ep4-status"
          text "5"
          button "▾"
        progress value=5 max=5 label="5/5" id="ep4-progress"
        row:
          text "✓ Closed" id="ep4-closed"
        row:
          list:
            item "—"
          list:
            item "—"
          list:
            item "—"
          list:
            item "MDT-200  First slice"
            item "MDT-201  Conflict UI"
            item "MDT-202  Poll worker"
            item "MDT-203  Backoff"
            item "MDT-204  E2E"

annotation "Implemented state: full-fill indicator.\nNo primary action on the lane.\nReopen happens in the ticket viewer, not here." target="ep4-closed" position=right
```

## 5. Cross-epic drag guard

Dragging a Cloud Sync ticket toward the Auth lane. The Auth lane-cols do not highlight; only the Cloud Sync lane-cols in the destination status do.

```wireloom
window "Atlas — Board / Epics":
  panel:
    row:
      col:
        text "EPIC LANE · Auth Overhaul"
        button "MDT-180"
        row:
          chip "Approved"
          text "2"
          button "▾"
        progress value=2 max=5 label="2/5"
        row:
          button "Close"
        row:
          list:
            item "no highlight"
          list:
            item "no highlight"
          list:
            item "no highlight — not a drop target" id="auth-inprogress"
          list:
            item "no highlight"
    row:
      col:
        text "EPIC LANE · Cloud Sync"
        button "MDT-012"
        row:
          chip "Approved"
          text "3"
          button "▾"
        progress value=3 max=5 label="3/5"
        row:
          button "Close"
        row:
          list:
            item "—"
          list:
            item "drop highlight" id="sync-open"
          list:
            item "MDT-202  Poll worker  ← dragging"
          list:
            item "—"

annotation "Wrong epic: lane-col does not light up.\ncanDrop returns false; drop would no-op even if fired." target="auth-inprogress" position=right
annotation "Same epic: lane-col highlights (--bg-muted).\nDrop changes status only — never reassigns the epic." target="sync-open" position=right
```

## 6. Mobile — collapsed lane labels

Below md, sticky-left is dropped; lane labels become full-width headers above each lane-track. Columns scroll horizontally within each lane.

```wireloom
window "Atlas — Board / Epics":
  panel:
    row:
      segmented:
        segment "Flat"
        segment "Epics" selected
      spacer
      button "☰"
    col:
      text "Auth Overhaul"
      button "MDT-180"
      row:
        chip "Proposed"
        text "0"
        button "Activate" primary
      row:
        text "Backlog"
        text "Open"
        text "In Progress"
        text "Done"
      row:
        list:
          item "MDT-181"
        list:
          item "MDT-183"
        list:
          item "—"
        list:
          item "—"
    col:
      text "Cloud Sync"
      button "MDT-012"
      row:
        chip "Approved"
        text "3"
        button "Close"
      row:
        text "Backlog"
        text "Open"
        text "In Progress"
        text "Done"
      row:
        list:
          item "MDT-200"
        list:
          item "MDT-201"
        list:
          item "MDT-202"
        list:
          item "MDT-204"
```

| Element | Semantic Pattern | Notes |
|---|---|---|
| lane label as full-width `text` | mobile lane header | sticky-left disabled below md per spec |
| horizontal `row` of column titles | per-lane column header | repeats per lane since there's no shared sticky header |

## Notes

- Epic colors are a fixed `--epic-1..4` rotation carried on the lane left border and progress fill; there is no color dot before the title.
- The "Epics" segmented control is shown in the board header. The spec's composition puts it next to sort/refresh; the final App-header placement is owned by `app-header.spec.md`.
- The flat board is unchanged when "Epics" is off — see `board-layout.spec.md`.
- Epics never appear as cards in any board mode. This diverges from `designs/board-zai/design3-epics.md` §2 and is documented in MDT-205/MDT-206.
