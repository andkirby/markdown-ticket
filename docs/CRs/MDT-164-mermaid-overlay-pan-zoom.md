---
code: MDT-164
status: Implemented
dateCreated: 2026-05-13T13:55:42.021Z
type: Bug Fix
priority: High
---

# Fix Mermaid overlay pan zoom

## 1. Description

### Requirements Scope
brief

### Problem
- Mermaid native fullscreen can delay pointer and wheel input during browser fullscreen transition.
- Users cannot reliably pan or zoom diagrams during the first seconds after opening fullscreen.
- A prior pan/zoom wrapper approach changed inline Mermaid layout and caused diagrams to no longer fit document width.

### Affected Areas
- `src/` Mermaid markdown rendering and viewer behavior.
- `tests/` Mermaid fullscreen and zoom coverage.
- `research/` profiling notes for the native fullscreen delay.

### Scope
- In scope: Mermaid fullscreen viewer opens without native fullscreen transition delay.
- In scope: Mermaid pan and zoom remain responsive immediately after opening the viewer.
- In scope: Inline Mermaid document layout remains unchanged.
- In scope: Escape closes only the Mermaid viewer when it is open.
- Out of scope: Reworking Mermaid rendering syntax, diagram generation, or markdown parsing.
- Out of scope: Adding third-party pan/zoom dependencies.

## 2. Desired Outcome

### Success Conditions
- Users can open a Mermaid diagram viewer and immediately pan or zoom the diagram.
- Mermaid diagrams keep their inline document sizing before opening the viewer.
- Exiting the viewer restores inline diagram state and page scroll behavior.
- Escape exits the Mermaid viewer without closing the surrounding ticket view.

### Constraints
- Must preserve existing Mermaid markdown block support.
- Must not require native browser fullscreen for the diagram viewer.
- Must not introduce a wrapper that changes inline Mermaid layout width.
- Must keep the diagram aspect ratio during viewer fit, pan, and zoom.

### Non-Goals
- Not changing ticket routing or ticket modal behavior except Escape handling while Mermaid viewer is active.
- Not changing Mermaid theme configuration.
- Not solving browser-level native fullscreen input suppression.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| UX | Should the viewer be called fullscreen if it is an in-app overlay? | Current control label uses fullscreen wording |
| Accessibility | Should focus be trapped inside the overlay? | Escape must remain available |
| Testing | Should an E2E test cover immediate wheel/drag after open? | Headless browser does not reproduce native fullscreen delay |

### Known Constraints
- Existing MarkdownContent rendering flow must continue to render Mermaid diagrams and fullscreen buttons.
- Existing ticket detail route must remain active when the Mermaid viewer handles Escape.
- Existing inline Mermaid layout must continue to fit within document width.

### Decisions Deferred
- Visual polish of the overlay control surface.
- Whether to rename fullscreen terminology to viewer/expand terminology.
- Whether to add broader E2E coverage beyond unit and smoke verification.

## 4. Acceptance Criteria

### Functional
- [ ] Opening a Mermaid diagram viewer does not call native browser fullscreen.
- [ ] Pan and zoom work immediately after the viewer opens.
- [ ] Inline Mermaid diagrams keep fitting document width before viewer open.
- [ ] Escape closes the Mermaid viewer without navigating away or closing the ticket detail.
- [ ] Closing the viewer clears transform, cursor, display, and scroll-lock state.

### Non-Functional
- [ ] No multi-second input dead period is observed after opening the viewer.
- [ ] No new runtime dependency is required for Mermaid pan/zoom.
- [ ] Existing Mermaid markdown rendering remains compatible with current tickets and documents.

### Edge Cases
- Opening a second Mermaid viewer closes any active Mermaid viewer first.
- Native browser fullscreen is unavailable or slow.
- User presses Escape while the viewer is active.
- User scrolls or drags immediately after opening the viewer.

## 5. Verification

### How to Verify Success
- Manual: Open `MDT-055`, expand a Mermaid diagram, immediately wheel zoom and drag pan.
- Manual: Press Escape and confirm the ticket detail route remains open.
- Automated: Unit tests cover overlay open/close behavior and zoom handler cleanup.
- Automated: TypeScript validation passes for changed Mermaid files.
- Browser smoke: Confirm overlay state is active, native fullscreen is false, and transform changes after wheel/drag.