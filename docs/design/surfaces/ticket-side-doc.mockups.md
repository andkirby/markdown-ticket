# Ticket Side Doc — Wireframe Schema

Related spec: `ticket-side-doc.spec.md`
Related interactions: `ticket-side-doc.interactions.md`
Related ticket: `docs/CRs/MDT-248-ticket-side-doc.md`

The closed state is today's ticket viewer unchanged — see `ticket-viewer.mockups.md` (no duplicated shell). These mockups cover the pane states only.

## Open — Document Beside Ticket

```wireloom
window "Ticket Viewer — Side Reading Pane Open":
  panel:
    row id="tsd-split":
      col 340:
        row:
          text "MDT-248 • Open documents beside ticket" bold id="tsd-title"
          spacer
          button "×" id="tsd-close"
        divider
        row:
          chip "Proposed" id="tsd-status"
          chip "Medium" id="tsd-priority"
          chip "Feature" id="tsd-type"
        divider
        tabs id="tsd-tabs":
          tab "Main" active id="tsd-tab-main"
          tab "Requirements" id="tsd-tab-req"
        text "### Problem" bold id="tsd-h3"
        text "Following a document link leaves the ticket behind..." muted
        text "Architecture index: designs/ticket-side-doc" id="tsd-doclink"
        text "Decisions live in decisions.md" id="tsd-doclink2"
      col fill:
        row:
          text "Cloud sync — map" bold id="tsd-doc-title"
          spacer
          button "↗" id="tsd-handoff"
          button "×" id="tsd-pane-close"
        row:
          button "◀" id="tsd-back"
          button "▶" id="tsd-fwd"
          text "docs/architecture/cloud-sync/README.md" muted size=small id="tsd-doc-path"
        text "### Cloud sync architecture" bold
        text "Index of the durable cloud-sync documentation set." muted
        text "• Data & consistency — journal, outcomes" muted
        text "• Identity & access — credentials" muted id="tsd-inner-link"

annotation "Modal widened (cap min(94vw, 1560px)); only the right edge grows —\nticket column keeps its measure, clamp(420px, 46%, 640px).\n1px --border divider between columns." target="tsd-split" position=top
annotation "Ticket column = today's viewer, byte-for-byte:\nheader, badge bar, subdoc tabs, prose, floating ToC.\nDocument links in this prose open the pane." target="tsd-doclink" position=left
annotation "Two-row head block mirroring the ticket header: title bar\n(modal__headline typography, 32px actions: hand-off + × discards the\nsession) over a meta bar (back/forward history + mono path). Disabled\nhistory = cursor-not-allowed." target="tsd-back" position=top
annotation "Hand-off: lands on this document in the Documents view.\nThe only path from the pane to the full workspace." target="tsd-handoff" position=right
annotation "Links inside pane docs open in the same pane (never a new\nsurface, never the ticket column) — recursion stays here." target="tsd-inner-link" position=right
annotation "Pane body renders the documents prose variant;\ndensity + theme settings apply identically to ticket prose." target="tsd-doc-path" position=right
```

## Open — Two Documents Deep (History)

```wireloom
window "Ticket Viewer — Pane History":
  panel:
    row:
      col 340:
        row:
          text "MDT-248 • Open documents beside ticket" bold id="tsdh-title"
          spacer
          button "×"
        divider
        tabs:
          tab "Main" active
        text "### Problem" bold
        text "Ticket column scroll position unchanged..." muted
      col fill:
        row:
          button "◀" id="tsdh-back"
          button "▶" id="tsdh-fwd"
          text "Data & consistency" bold id="tsdh-doc-title"
          spacer
          button "↗"
          button "×"
        divider
        text "### Data & consistency" bold
        text "The journal uses explicit outcomes..." muted
        text "See identity for token lifetimes." muted id="tsdh-inner"

annotation "Back is enabled: history = [README, data-and-consistency].\nBack/forward restore per-entry scroll positions." target="tsdh-back" position=top
annotation "Same pane, second document — the ticket column did not\nmove, and the subdoc tab selection is untouched." target="tsdh-doc-title" position=top
```

## Hidden — Session Pill

```wireloom
window "Ticket Viewer — Pane Hidden":
  panel:
    row:
      text "MDT-248 • Open documents beside ticket" bold id="tsdp-title"
      spacer
      button "×" id="tsdp-close"
    divider
    tabs:
      tab "Main" active
    text "### Problem" bold
    text "Working through the ticket body..." muted
    text "More prose fills the column." muted
    row justify=end:
      button "▤ Reading · Data & consistency · show ›" id="tsdp-pill"

annotation "Esc tucked the pane: modal back to single column,\nno width change felt in the ticket column.\nSession (doc + history + scroll) kept." target="tsdp-pill" position=top
annotation "Pill floats bottom-right of the ticket column content.\nOne button; accessible name 'Show Data & consistency side pane'.\nClick → pane re-reveals on the same doc, scroll restored.\nVisible ONLY while a session exists and the pane is hidden." target="tsdp-pill" position=bottom
```

## Narrow Viewport — Overlay Variant

```wireloom
window "Ticket Viewer — Pane Overlay (narrow)":
  panel:
    row:
      button "‹ Ticket" id="tsdo-back"
      text "Cloud sync — map" bold id="tsdo-title"
      spacer
      button "◀" id="tsdo-hist-back"
      button "↗" id="tsdo-handoff"
      button "×" id="tsdo-close"
    divider
    text "### Cloud sync architecture" bold
    text "Index of the durable cloud-sync documentation set." muted
    text "• Data & consistency — journal, outcomes" muted
    text "• Identity & access — credentials" muted

annotation "Below 1100px the pane covers the modal (single column).\n'‹ Ticket' returns to the ticket — same effect as Esc (hide, session kept).\nBack/forward history still available." target="tsdo-back" position=bottom
annotation "Ticket column, pill, and session all survive the breakpoint\ncrossing in either direction (live resize, no reload)." target="tsdo-title" position=top
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Pane surface | `--background` | `.ticket-side-pane` proposed | matches ticket column surface; divider separates |
| Divider | `--border` | — | 1px column separator |
| Pane header buttons | `--state-hover-bg` (hover) | 8×8 chrome recipe | disabled history: `cursor-not-allowed`, tooltip survives |
| Doc title / path | `--foreground` / `--muted-foreground` | mono path | path truncated, full value in `title` |
| Session pill | `--bg-elevated`, `--state-active-bg`/`--state-active-fg` emphasis | `.ticket-side-pane__pill` proposed | `--radius-pill`; one button, names the tucked doc |
| Pane error | `--destructive` | `role="alert"` | previous pane document not lost on fetch failure |
| Prose | `--foreground`, `--muted-foreground`, `--primary` | `.prose.prose--documents` | same pipeline as Documents view |
| Backdrop / z-index / close × | n/a | `MODALS.md` | unchanged from ticket viewer |
