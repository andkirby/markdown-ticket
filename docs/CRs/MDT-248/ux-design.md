# UX Design: MDT-248

**Journey intent**: a reviewer working inside a ticket follows document references without losing the ticket — the ticket is the anchor, documents are reading material that opens beside it and never displaces it.

**Surfaces**: ticket viewer modal (split variant) — new pane child surface + session pill; delivery behavior of document links inside the modal; Documents view unchanged (hand-off target).

**States**:
- pane: closed / open-loading / open-loaded / open-html / open-error / hidden (pill)
- history: back/forward enabled per stack bounds (`cursor-not-allowed` when disabled, tooltips survive)
- flagged known-missing document links: render flagged, non-clickable (unchanged)
- breakpoints: ≥1100px split; <1100px full-cover overlay with `‹ Ticket` return

**Interactions**: follow-always delivery (click doc link → pane opens from any state); per-pane back/forward with scroll restore; Esc chain trace→pane→modal; pill reveal; × discard; `Open in Documents ↗` hand-off; ticket links swap the column with the session surviving.

**Accessibility/responsive**: pane = `complementary` landmark labelled `Document preview — {title}`; open/hide/discard announced; keyboard-only `:focus-visible` rings; focus moves to pane header on open and to the pill on hide; keyboard-operable end to end; <1100px single-column overlay.

**Alternatives considered**: docs as ticket tabs (hides content — reference job), hover-peek popover (glimpse tool, not a reader), docs-zai multi-pane workspace (rejected as complicated; parked), float-button mode toggle (rejected: unstable link semantics — became the session pill). Full record: `designs/ticket-side-doc/decisions.md`.

**Reviewer**: mdt-ux-designer workflow (authoring, 2026-09-22) + user approval of the design direction ("I love it", 2026-09-22 session) + this gate's checklist self-review (journey explicit ✓, states implementable ✓, a11y/responsive stated ✓, no contradiction with requirements/architecture/tests ✓).

**Verdict**: approved.

**Required changes**: one factual sync found at architecture — the document prose variant class is `prose--document` (singular), not `prose--documents`; corrected in the durable spec. Architecture's concrete names (context module, `split` modal tier, component files) added to the spec's proposed-paths note.

**Durable docs updated**:
- `docs/design/surfaces/ticket-side-doc.spec.md` — prose class fix + implementation-path note
- `docs/design/surfaces/ticket-side-doc.interactions.md` — unchanged (state machine matches architecture verbatim)
- `docs/design/surfaces/ticket-viewer.spec.md` — unchanged (pane pointers already added at design time)
