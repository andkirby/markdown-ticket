---
code: MDT-129
status: In Progress
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
- Add a single trailing launcher control at the end of the selector rail.
- Show the full project list in a panel directly below the selector when the launcher is opened.
- Show favorite state on full project cards and on the active project card.
- Support a configurable visible project count through global UI configuration.
- Out of scope:
- Cross-project aggregate browsing mode.
- Changes to unrelated board, list, or documents navigation controls.
- Non-required persistence enhancements beyond favorite-state support.
## 2. Desired Outcome
### Success Conditions
- The selector rail clearly identifies the current project.
- The selector rail remains compact while still exposing quick access to visible inactive projects.
- Users can open a full project browser from a single launcher at the end of the selector rail.
- The full project browser appears directly below the selector.
- Users can switch projects from both the selector rail and the full project browser.
- Favorite state is visible consistently in the selector experience.
- The selector remains usable when the number of projects exceeds the visible rail count.

### Constraints
- The launcher uses the existing acclaim visual asset.
- The full project browser is visually attached to the selector.
- Project switching behavior remains supported.
- Visible selector capacity is controlled through global UI configuration.

### Non-Goals
- No aggregate "All Projects" mode.
- No rank or recency badges in the selector UI.
- No title or description expansion for inactive visible rail items.
## 3. Open Questions
See [architecture.md](./MDT-129/architecture.md)

- **Pattern**: Progressive Disclosure with Anchored Overlay
- **Key constraint**: Active project always visible; panel anchored directly below rail; mutable state in `project-selector.json`
- **Extension**: Add new view modes by creating new components; no changes to existing rail/panel
## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [ ] The selector rail shows the active project as a larger card containing project code and title.
- [ ] The selector rail shows inactive visible projects as compact code-only cards.
- [ ] The selector rail ends with a single launcher control.
- [ ] Activating the launcher opens a panel directly below the selector.
- [ ] The panel shows the full project list as cards containing project code, title, and description.
- [ ] Favorite state is visible on full project cards.
- [ ] Favorite state is visible on the active project card when the active project is favorited.
- [ ] Selecting a project from the selector rail changes the current project.
- [ ] Selecting a project from the full project panel changes the current project.
- [ ] The selector supports a configured visible project count through global UI configuration.

### Non-Functional
- [ ] The selector remains readable and operable when many projects are registered.
- [ ] The panel remains visually anchored to the selector.
- [ ] The interaction remains usable on desktop and mobile-sized viewports.
- [ ] The updated behavior is covered by stable automated selectors.

### Edge Cases
- [ ] Long project titles do not break the active rail card or full project cards.
- [ ] Projects without descriptions remain selectable and visually coherent in the panel.
- [ ] The active project remains visible even when it would otherwise fall outside the normal visible subset.
- [ ] Absence of favorite state does not create broken spacing or misaligned controls.
- [ ] The selector behaves correctly when the total number of projects is less than or equal to the visible count.
## 5. Verification
### How to Verify Success
- Manual verification:
- Confirm that the rail shows one active larger card, compact inactive cards, and one trailing launcher.
- Confirm that the launcher opens a full project panel directly below the selector.
- Confirm that project switching works from both the rail and the full project panel.
- Automated verification:
- Verify active card rendering, compact inactive rendering, launcher open behavior, panel rendering, and project switching.
- Verify behavior when project count is below, equal to, and above the configured visible limit.
- Documentation verification:
- Confirm that global configuration documentation describes visible selector capacity and selector behavior.