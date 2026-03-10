---
code: MDT-129
status: Implemented
dateCreated: 2026-03-02T16:06:27.177Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-039,MDT-118
---

# Redesign project selector launcher panel

## 1. Description
### Requirements Scope
- full

### Problem
- The current project selector becomes difficult to use when many projects are available.
- The current selector does not provide a clear distinction between the current project, quick-access projects, and the full project list.
- Users need a project selector that remains compact in the rail while still providing access to all projects.

### Affected Areas
- `src`: project selector and project switching UI
- `shared`: global configuration contract for selector visibility settings
- `server`: validated delivery of global UI configuration
- `tests`: selector behavior coverage
- `docs`: selector behavior and configuration documentation

### Scope
- In scope:
- Present the active project as a larger card in the selector rail.
- Present inactive visible projects as compact code-only cards in the selector rail.
- Open the full project browser panel by clicking the active project card.
- Show the full project list in a panel directly below the selector.
- Show favorite state on full project cards and on the active project card.
- Show hover cards on inactive project chips revealing full project details.
- Support a configurable visible project count through global UI configuration.
- Out of scope:
- Cross-project aggregate browsing mode.
- Changes to unrelated board, list, or documents navigation controls.
- Non-required persistence enhancements beyond favorite-state support.
## 2. Desired Outcome
### Success Conditions
- The selector rail clearly identifies the current project.
- The selector rail remains compact while still exposing quick access to visible inactive projects.
- Users can open a full project browser by clicking the active project card.
- The full project browser appears directly below the selector.
- Users can switch projects from both the selector rail and the full project browser.
- Hovering over inactive project chips reveals full project details.
- Favorite state is visible consistently in the selector experience.
- The selector remains usable when the number of projects exceeds the visible rail count.

### Constraints
- The full project browser is visually attached to the selector.
- Project switching behavior remains supported.
- Visible selector capacity is controlled through global UI configuration.
- Hover cards appear on inactive chips with configurable delay (100ms open/close).

### Non-Goals
- No aggregate "All Projects" mode.
- No rank or recency badges in the selector UI.
- No title or description expansion for inactive visible rail items.
## 3. Architecture
> Architecture projection: [architecture.md](./architecture.md) (rendered from canonical spec-trace state)

**Pattern**: Progressive Disclosure with Anchored Overlay

**Key constraint**: Active project always visible; panel anchored directly below rail; mutable state in `project-selector.json`

**Extension**: Add new view modes by creating new components; no changes to existing rail/panel
## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [x] The selector rail shows the active project as a larger card containing project code and title.
- [x] The selector rail shows inactive visible projects as compact code-only cards.
- [x] Clicking the active project card opens a panel directly below the selector.
- [x] Hovering over inactive project chips shows a hover card with full project details.
- [x] The panel shows the full project list as cards containing project code, title, and description.
- [x] Favorite state is visible on full project cards.
- [x] Favorite state is visible on the active project card when the active project is favorited.
- [x] Selecting a project from the selector rail changes the current project.
- [x] Selecting a project from the full project panel changes the current project.
- [x] The selector supports a configured visible project count through global UI configuration.

### Non-Functional
- [x] The selector remains readable and operable when many projects are registered.
- [x] The panel remains visually anchored to the selector.
- [x] The interaction remains usable on desktop and mobile-sized viewports.
- [x] The updated behavior is covered by stable automated selectors.

### Edge Cases
- [x] Long project titles do not break the active rail card or full project cards.
- [x] Projects without descriptions remain selectable and visually coherent in the panel.
- [x] The active project remains visible even when it would otherwise fall outside the normal visible subset.
- [x] Absence of favorite state does not create broken spacing or misaligned controls.
- [x] The selector behaves correctly when the total number of projects is less than or equal to the visible count.
## 5. Verification
### How to Verify Success
- Manual verification:
- Confirm that the rail shows one active larger card and compact inactive cards.
- Confirm that clicking the active project card opens a full project panel directly below the selector.
- Confirm that hovering over inactive project chips shows hover cards with full project details.
- Confirm that project switching works from both the rail and the full project panel.
- Automated verification:
- Verify active card rendering, compact inactive rendering, hover card behavior, panel rendering, and project switching.
- Verify behavior when project count is below, equal to, and above the configured visible limit.
- Documentation verification:
- Confirm that global configuration documentation describes visible selector capacity and selector behavior.