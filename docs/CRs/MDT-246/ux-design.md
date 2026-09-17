# MDT-246 — UX Design

The UX gate ran as the 2026-09-15 design pass (committed 49dfc019) and the
2026-09-16 label ruling; this file records the gate outcome and points at the
durable artifacts. No new UX decisions are made here.

## Gate checklist → where it lives

| Gate item | Artifact |
|-----------|----------|
| Journey intent | `docs/design/surfaces/epic-navigation.interactions.md` § Journey (ticket → epic → board; two entry points, one destination) |
| Surfaces | `context-badge.spec.md` (split chip), `ticket-viewer.spec.md` (epic board CTA), `swimlane-board.spec.md` (focused arrival) |
| States | each spec's States table (split-chip rest/hover/focus; focused lane highlight + auto-clear) |
| Interactions | `epic-navigation.interactions.md` § Focus lifecycle (expand → override → search → scroll → highlight) |
| Accessibility / responsive | `epic-navigation.interactions.md` § Keyboard and focus (two tab stops, live-region arrival announcement, 24px floor); mockups' mobile wrap note |
| Alternatives | CR §2 options B/C (rejected/deferred); styleguide § "epic badge · split chip" rejected bare-glyph variant with measured rationale |
| Pattern contract | `frontend/src/styleguide.html` § "epic badge · split chip — identity vs action" (verified light + dark) |

## Reviewer verdict

User-reviewed across the design sessions, with explicit rulings:

- 2026-09-13 — split chip chosen over the clickable Zap (measured rejection:
  12×12 target vs 24px floor, 4px from a competing link, misroute with no
  back, double-duty of the passive identity glyph).
- 2026-09-15 — focus lifecycle resolutions (filter override + search clear;
  ~2s auto-clear) folded into the CR §3.
- 2026-09-16 — `Epics →` label approved ("I love it!"); tooltip/aria carry the
  full sentence "Show MDT-### on Epics board" (Label-in-Name).

Required changes outstanding: none. Implementation may surface mechanical
adjustments (exact scroll behavior, live-region phrasing); those return here.

## Permanent-owner impact

Durable design docs were updated **before** implementation (spec-first pass):
`context-badge.spec.md` + `.mockups.md`, `ticket-viewer.spec.md` +
`.mockups.md`, `swimlane-board.spec.md` + `.mockups.md`,
`epic-navigation.interactions.md` (new), and the styleguide section. After
implementation, the reflection pass reconciles these against shipped reality
(disclaimer-staleness rule: proposed annotations become current).
