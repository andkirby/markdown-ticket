---
code: MDT-161
status: Proposed
dateCreated: 2026-05-11T17:34:03.767Z
type: Feature Enhancement
priority: Medium
---

# Add active document scroll target

## 1. Description

### Requirements Scope
`full` — focused UX behavior for Documents View navigation.

### Problem
- Users can open or route directly to a document while the file tree is scrolled elsewhere.
- Users need to manually search or scroll the tree to find the active document.
- Collapsed folders can hide the active document, reducing context when reading or switching files.

### Affected Areas
- Frontend: Documents View sidebar and document tree navigation.
- UX: Active document orientation and recovery after filtering or scrolling.
- Design: Documents View control placement and state behavior.

### Scope
- In scope:
  - A compact target/crosshair action for locating the active document in the tree.
  - Behavior that scrolls the tree to the selected document.
  - Behavior that reveals the selected document when ancestor folders are collapsed.
  - Disabled or inactive state when no document is selected.
- Out of scope:
  - Changing document selection rules.
  - Changing document loading or markdown rendering.
  - Replacing search, sorting, or path configuration controls.

## 2. Desired Outcome

### Success Conditions
- User can click a target action to bring the active document row into view.
- User can regain tree context after scrolling, searching, or opening a document from a route.
- The action is visually grouped with existing Documents sidebar controls.
- The document tree keeps the selected file highlighted after scrolling.

### Constraints
- Must fit the existing Documents View sidebar header controls.
- Must not disrupt sorting, search, or path configuration behavior.
- Must preserve existing file tree selection behavior.
- Must remain usable on narrow viewports.

### Non-Goals
- Not adding a second document navigation model.
- Not adding breadcrumbs or a full location panel.
- Not changing backend document discovery.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| UX | Should search be cleared if the active file is hidden by filtering? | User intent around active-file recovery should be preserved. |
| Interaction | Should scrolling be smooth or immediate? | Avoid disorienting users in long trees. |
| Accessibility | What label and disabled state should assistive tech expose? | Icon-only control needs a clear accessible name. |
| Placement | Should the action sit beside sort controls or beside configure paths? | Keep the control close to tree navigation actions. |

### Known Constraints
- Documents View already has sidebar header controls for sorting and path configuration.
- File tree can contain nested folders.
- Selected file can be set by URL, not only by direct tree click.

### Decisions Deferred
- Implementation approach determined by `/mdt:architecture`.
- Exact component responsibilities determined by `/mdt:architecture`.
- Test breakdown determined by `/mdt:tests` and `/mdt:tasks`.

## 4. Acceptance Criteria

### Functional
- [ ] Documents View shows a target/crosshair action in the sidebar header.
- [ ] Target action is disabled or inert when no document is selected.
- [ ] Clicking the target action scrolls the file tree to the selected document.
- [ ] Clicking the target action expands collapsed parent folders for the selected document.
- [ ] Selected document remains highlighted after the tree scrolls.
- [ ] Target action does not change the selected document.
- [ ] Target action coexists with sort, search, and configure-path controls without overlap.

### Non-Functional
- [ ] Interaction completes without visible layout shift in the sidebar header.
- [ ] Icon-only control has a clear accessible label or tooltip.
- [ ] Behavior works with nested document folders.

### Edge Cases
- [ ] No selected document: target action does not scroll.
- [ ] Selected document hidden by search: recovery behavior is predictable and documented.
- [ ] Selected document path no longer exists: action does not throw or break the view.
- [ ] Deeply nested selected document: all required ancestors are revealed.

## 5. Verification

### How to Verify Success
- Manual: Select a document, scroll the tree away, click target, verify active row returns into view.
- Manual: Collapse the active document's parent folder, click target, verify parent expands and row is visible.
- Manual: Open Documents View with a selected file from URL, click target, verify tree locates it.
- Automated: Component or E2E test for target disabled state, selected-file scrolling, and ancestor expansion.

## 6. Design Reference

- Documents View sidebar control cluster should represent the action as a compact target/crosshair icon.
- Recommended placement: between sort direction and configure-path controls.