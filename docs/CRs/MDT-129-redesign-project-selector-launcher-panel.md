---
code: MDT-129
status: Proposed
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
- Users need deterministic rules for which projects remain visible in the rail when the registered project count exceeds the visible capacity.

### Affected Areas
- `src/components/ProjectSelector.tsx`: Add launcher control and panel logic
- `shared`: Selector preference and state contracts
- `CONFIG_DIR/user.toml`: User-specific selector display preferences
- `CONFIG_DIR/project-selector.json`: Mutable selector state
- `tests/e2e/project/selector-redesign.spec.ts`: E2E tests for launcher/panel/favorites
- `docs/CONFIG_USER_SPECIFICATION.md`: Document selector user configuration
### Scope
- In scope:
  - Present the active project as a larger card in the selector rail.
  - Present inactive visible projects in a user-configurable compact or medium rail style.
  - Add a single trailing launcher control at the end of the selector rail.
  - Show the full project list in a panel directly below the selector when the launcher is opened.
  - Show favorite state on project cards in the expanded panel and on the active project card.
  - Support a user preference that controls whether inactive visible rail projects stay compact.
  - Prioritize favorites in the visible rail and in the expanded list ordering.
  - Persist selector user state outside repository-shared configuration.
- Out of scope:
  - Cross-project aggregate browsing mode.
  - Changes to unrelated board, list, or documents navigation controls.
  - Non-required persistence enhancements beyond selector state support.

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
- Selector presentation preferences remain user-specific.
- Mutable selector state remains separate from immutable user preferences.
- Rail ordering must be deterministic.

### Non-Goals
- No aggregate "All Projects" mode.
- No rank or recency badges in the selector UI.
- No title or description expansion for inactive visible rail items.
## 3. Open Questions
### Known Constraints
- Active project is always visible in the selector rail.
- `compactInactive = true` keeps inactive visible rail projects as compact code-only cards.
- `compactInactive = false` allows inactive visible rail projects to use the medium card presentation.
- Full project cards show code, title, description, and favorite state.
- The selector ends with a single launcher control.
- No synthetic "All Projects" item is introduced.
- Personal selector display preferences are stored in `CONFIG_DIR/user.toml` under `[ui.projectSelector]`.
- Mutable selector state is stored in `CONFIG_DIR/project-selector.json`, keyed by project code.
- Active project counts toward `visibleCount` but is always prioritized (never hidden).
- On mobile-sized viewports, only the active project remains visible in the collapsed selector rail; the rest are accessed through the launcher.
- Responsive presentation may adapt by viewport, but must preserve the same selector state model and expanded project list behavior.

### Decisions Made
- **Immutable Preferences**: `CONFIG_DIR/user.toml` under `[ui.projectSelector]`
  - `visibleCount = 7` (number of projects to show in rail)
  - `compactInactive = true` (inactive visible projects use compact presentation)
- **Mutable Selector State**: `CONFIG_DIR/project-selector.json`
  - keyed by project code
  - stores mutable per-project state such as `favorite`, `lastUsedAt`, and `count`
- **Rail Selection and Ordering**:
  - active project always occupies one visible rail slot
  - remaining visible rail slots are filled by favorites first, then non-favorites
  - visible favorites are ordered by `count` descending, with `lastUsedAt` descending as tie-break
  - visible non-favorites are ordered by `lastUsedAt` descending, with `count` descending as tie-break
  - expanded project list ordering shows favorites first, then the remaining projects
  - favorites that do not fit in the visible rail remain at the top of the expanded project list
- **Usage Update Logic**:
  - when project selection is committed, update usage state for the selected project
  - set `lastUsedAt` to the current timestamp
  - increment `count`
  - apply the change in memory immediately
  - persist to `CONFIG_DIR/project-selector.json` shortly after, allowing small debounce/batching
  - shutdown/unload flushing is best-effort only and must not be the primary persistence mechanism
- **Active Project Visibility**: Active project counts toward `visibleCount` but is always prioritized
- **Responsive Behavior**: On mobile-sized viewports, show only the active project in the collapsed rail and access the rest through the launcher. Other responsive presentation details may vary by viewport, but must remain visually attached to the selector and preserve the same interaction model
- **Error Handling**: Invalid or missing selector preferences/state fall back safely without breaking the UI
- **Validation Approach**:
  - `user.toml`: `visibleCount` must be an integer `>= 1`; `compactInactive` must be a boolean
  - `project-selector.json`: top-level object keyed by project code; `favorite` must be a boolean; `lastUsedAt` must be an ISO-8601 timestamp string when present; `count` must be an integer `>= 0`
  - unknown fields are ignored
  - invalid fields fall back safely without invalidating neighboring valid fields
  - invalid per-project state entries may be dropped without preventing the rest of the file from loading

### Decisions Deferred
- Internal component structure (architecture will define)
- Specific test ID naming (BDD steps will define)
- Panel positioning implementation details
- Favorite toggle interaction pattern
## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [ ] The selector rail shows the active project as a larger card containing project code and title.
- [ ] The selector rail supports `compactInactive` so inactive visible projects can be rendered compact or medium.
- [ ] The selector rail ends with a single launcher control.
- [ ] Activating the launcher opens a panel directly below the selector.
- [ ] The panel shows the full project list as cards containing project code, title, and description.
- [ ] Favorite state is visible on full project cards.
- [ ] Favorite state is visible on the active project card when the active project is favorited.
- [ ] Selecting a project from the selector rail changes the current project.
- [ ] Selecting a project from the full project panel changes the current project.
- [ ] The selector supports a configured visible project count through `CONFIG_DIR/user.toml`.
- [ ] The selector supports `[ui.projectSelector].compactInactive` through `CONFIG_DIR/user.toml`.
- [ ] Active project counts toward `visibleCount` but is always visible (prioritized).
- [ ] Remaining visible rail slots are filled by favorites first, then non-favorites.
- [ ] Visible favorites are ordered by `count` descending, with `lastUsedAt` descending as tie-break.
- [ ] Visible non-favorites are ordered by `lastUsedAt` descending, with `count` descending as tie-break.
- [ ] Favorites that do not fit in the visible rail remain at the top of the expanded project list.
- [ ] Mutable selector state is persisted in `CONFIG_DIR/project-selector.json`, keyed by project code.
- [ ] Mutable selector state supports `favorite`, `lastUsedAt`, and `count`.
- [ ] When project selection is committed, the selected project's `lastUsedAt` and `count` are updated.
- [ ] Mutable selector state is written shortly after project selection changes and does not depend on shutdown behavior.
- [ ] Missing or invalid selector preferences/state fall back safely without breaking the UI.
- [ ] Unknown fields in `user.toml` and `project-selector.json` are ignored safely.
- [ ] Invalid preference fields fall back to defaults without invalidating other valid preference fields.
- [ ] Invalid per-project JSON entries may be dropped without invalidating the rest of the selector state.
### Non-Functional
- [ ] The selector remains readable and operable when many projects are registered.
- [ ] The panel remains visually anchored to the selector.
- [ ] The interaction remains usable on desktop and mobile-sized viewports.
- [ ] The updated behavior is covered by stable automated selectors.

### Edge Cases
- [ ] Long project titles do not break the active rail card or full project cards.
- [ ] Projects without descriptions remain selectable and visually coherent in the panel.
- [ ] The active project remains visible even when it would otherwise fall outside the normal visible subset (active prioritized).
- [ ] Absence of favorite state does not create broken spacing or misaligned controls.
- [ ] The selector behaves correctly when the total number of projects is less than or equal to the visible count.
- [ ] Missing `user.toml` file falls back to defaults without breaking the UI.
- [ ] Invalid values in `user.toml` (for example negative `visibleCount`) are handled gracefully.
- [ ] Missing or invalid `project-selector.json` does not block rendering or project switching.
- [ ] Partially malformed `project-selector.json` still loads valid project entries.
- [ ] Repeated project switches do not lose usage updates when shutdown does not occur cleanly.
- [ ] On mobile-sized viewports, the collapsed rail shows only the active project and launcher without losing access to the rest of the projects.
## 5. Verification
### How to Verify Success
- Manual verification:
  - Confirm that the rail shows one active larger card, inactive cards according to `compactInactive`, and one trailing launcher.
  - Confirm that the launcher opens a full project panel directly below the selector.
  - Confirm that project switching works from both the rail and the full project panel.
  - Confirm that `CONFIG_DIR/user.toml` is loaded and respects `visibleCount` and `compactInactive`.
  - Confirm that `CONFIG_DIR/project-selector.json` stores mutable selector state and is updated by favorite and project-usage changes.
  - Confirm that selecting a project updates `lastUsedAt` and increments `count` without waiting for shutdown.
  - Confirm that visible rail ordering uses active first, then favorites, then non-favorites.
  - Confirm that favorite overflow stays at the top of the expanded project list.
  - Confirm that mobile-sized viewports show only the active project and launcher in the collapsed rail.
  - Confirm that responsive presentation remains attached to the selector and preserves the same interaction model.
  - Confirm that malformed preference fields fall back safely while valid neighboring fields continue to work.
  - Confirm that malformed project-state entries are ignored without losing valid entries.
- Automated verification:
  - Verify active card rendering, inactive density rendering, launcher open behavior, panel rendering, and project switching.
  - Verify behavior when project count is below, equal to, and above the configured visible limit.
  - Verify active project visibility prioritization when count exceeds visible limit.
  - Verify rail ordering for favorites, recent non-favorites, and favorite overflow.
  - Verify mobile collapsed-rail behavior.
  - Verify fallback behavior when `user.toml` or `project-selector.json` is missing or invalid.
  - Verify field-level validation for `visibleCount`, `compactInactive`, `favorite`, `lastUsedAt`, and `count`.
  - Verify usage-state writes occur after committed project switches rather than only on shutdown.
- Documentation verification:
  - Confirm that `docs/CONFIG_USER_SPECIFICATION.md` describes selector preferences in `CONFIG_DIR/user.toml`.
  - Confirm that selector state storage in `CONFIG_DIR/project-selector.json` is documented.
  - Confirm that neither file is referenced as repository-shared project configuration.
