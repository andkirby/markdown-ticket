# UX Design: MDT-206

Journey intent: Board users need to compare progress across epics while still scanning shared status columns vertically.

Surfaces: App header icon-only view switcher (`Board`, `Swimlanes`, `List`, `Docs` as accessible names); board route/container; swimlane board surface; lane header lifecycle controls.

States: flat mode, swimlane mode, no epics, empty lanes, hidden empty lanes, collapsed lanes, valid drag hover, invalid cross-epic drag hover, Proposed/Approved/Implemented epic lifecycle states, close blocked error, read-only mode.

Interactions: select Board or Swimlanes from the header icon group; hide empty lanes; collapse/expand all; collapse one lane; drag ticket within same epic lane to change status; reject drag toward another epic lane; Activate Proposed epic; Close Approved epic; show Closed indicator for Implemented epic.

Accessibility/responsive: controls are real buttons; lane collapse uses `aria-expanded`; disabled/blocked Close has a title naming blockers; mobile disables sticky-left labels and uses full-width lane headers above horizontally scrollable tracks.

Alternatives considered: a Board-local inline toggle was rejected after UAT because Design 3 treats Swimlanes as a peer view. Visible text labels were also rejected for this pass; the final control is icon-only with `aria-label` and `title`.

Reviewer: self-review against `mdt-ux-designer`, `ux-designer-specifier`, `frontend/src/THEME.md`, `frontend/src/STYLING.md`, `docs/design/surfaces/swimlane-board.spec.md`, and `designs/board-zai/design3.html`.

Verdict: approved for implementation with ticket-local override.

Required changes: implement semantic CSS classes that mirror the Design 3 swimlane concept without copying Alpine/mock-data architecture; do not render epic tickets as cards in swimlane mode.

Durable docs: reconciled with the implementation boundary in `docs/design/surfaces/swimlane-board.spec.md`, `board-layout.spec.md`, and `app-header.spec.md`.
