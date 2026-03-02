# Requirements: MDT-129
  
**Source**: [MDT-129](../MDT-129-redesign-project-selector-launcher-panel.md)
**Generated**: 2026-03-02
  
## Overview
  
The project selector requires a redesigned experience that scales with many registered projects while remaining compact in the rail. The system shall provide a visible rail with the active project and quick-access projects, a launcher control for accessing the full project list, deterministic ordering rules, user-configurable preferences, and persistent mutable state for favorites and usage tracking.
  
## Behavioral Requirements
  
### BR-1: Active Project Presentation
  
**Goal**: Users can clearly identify which project is currently active.
**Delivery Timing**: Now
  
1. WHEN the selector rail renders, the system shall display the active project as a larger card containing project code and title.
2. WHEN the active project is favorited, the system shall display favorite state on the active project card.
3. WHEN the active project would otherwise fall outside the visible subset based on ordering rules, the system shall prioritize the active project to remain visible.
  
### BR-2: Inactive Visible Project Presentation
  
**Goal**: Users can quickly access frequently-used inactive projects from the rail.
**Delivery Timing**: Now
  
1. WHEN `compactInactive` is `true`, the system shall render inactive visible rail projects as compact code-only cards.
2. WHEN `compactInactive` is `false`, the system shall render inactive visible rail projects using medium card presentation.
3. WHEN an inactive visible project is rendered, the system shall not display title or description expansion in the rail.
  
### BR-3: Launcher Control
  
**Goal**: Users can access the full project list from a single consistent entry point.
**Delivery Timing**: Now
  
1. WHEN the selector rail renders, the system shall display a single launcher control at the end of the selector rail.
2. WHEN the launcher is activated, the system shall open a panel directly below the selector.
3. WHEN the launcher uses a visual icon, the system shall use the acclaim visual asset.
  
### BR-4: Full Project Panel
  
**Goal**: Users can browse and select from all registered projects.
**Delivery Timing**: Now
  
1. WHEN the panel opens, the system shall display the full project list as cards containing project code, title, and description.
2. WHEN a project in the panel is favorited, the system shall display favorite state on the full project card.
3. WHEN the panel renders, the system shall order favorites first, then remaining projects.
4. WHEN ordering remaining (non-favorite) projects in the panel, the system shall sort by `lastUsedAt` descending, with `count` descending as tie-break.
5. WHEN favorites do not fit in the visible rail, the system shall display those favorites at the top of the expanded project list.
  
### BR-5: Project Selection
  
**Goal**: Users can switch projects from both the rail and the full panel.
**Delivery Timing**: Now
  
1. WHEN a user selects a project from the selector rail, the system shall change the current project to the selected project.
2. WHEN a user selects a project from the full project panel, the system shall change the current project to the selected project.
3. WHEN project selection is committed, the system shall update usage state for the selected project.
4. WHEN usage state is updated, the system shall set `lastUsedAt` to the current timestamp.
5. WHEN usage state is updated, the system shall increment `count`.
  
### BR-6: Rail Ordering
  
**Goal**: Users see a deterministic, predictable ordering of projects in the rail.
**Delivery Timing**: Now
  
1. WHEN the selector rail renders, the system shall display the active project first.
2. WHEN filling remaining visible rail slots, the system shall prioritize favorites first, then non-favorites.
3. WHEN ordering visible favorites, the system shall sort by `count` descending, with `lastUsedAt` descending as tie-break.
4. WHEN ordering visible non-favorites, the system shall sort by `lastUsedAt` descending, with `count` descending as tie-break.
5. WHEN the active project would otherwise fall outside the visible subset based on ordering rules, the system shall prioritize the active project to remain visible regardless of favorite status.
  
### BR-7: User Preferences
  
**Goal**: Users can customize selector display behavior through configuration.
**Delivery Timing**: Now
  
1. WHEN `CONFIG_DIR/user.toml` contains `[ui.projectSelector].visibleCount`, the system shall use that value as the number of visible projects in the rail.
2. WHEN `CONFIG_DIR/user.toml` contains `[ui.projectSelector].compactInactive`, the system shall use that value to control inactive visible project presentation.
3. WHEN `CONFIG_DIR/user.toml` is missing, the system shall fall back to default values without breaking the UI.
4. WHEN `visibleCount` in `user.toml` is invalid, the system shall fall back to the default value (7).
5. WHEN `compactInactive` in `user.toml` is invalid, the system shall fall back to the default value (true).
  
### BR-8: Mutable Selector State Persistence
  
**Goal**: Users' favorites and usage patterns persist across sessions.
**Delivery Timing**: Now
  
1. WHEN mutable selector state changes, the system shall persist the state to `CONFIG_DIR/project-selector.json`.
2. WHEN persisting selector state, the system shall key entries by project code.
3. WHEN persisting selector state, the system shall store `favorite`, `lastUsedAt`, and `count` per project.
4. WHEN persisting after project selection, the system shall write shortly after the selection changes and shall not depend on shutdown behavior.
5. WHEN `CONFIG_DIR/project-selector.json` is missing, the system shall initialize empty state without breaking the UI.
6. WHEN `CONFIG_DIR/project-selector.json` is invalid JSON, the system shall fall back to empty state without breaking the UI.
7. WHEN `CONFIG_DIR/project-selector.json` contains partially malformed entries, the system shall load valid project entries and drop invalid entries.
  
### BR-9: Responsive Behavior
  
**Goal**: Users on mobile-sized viewports can still access all projects.
**Delivery Timing**: Now
  
1. WHEN the viewport is mobile-sized, the system shall display only the active project and launcher in the collapsed selector rail.
2. WHEN a mobile user activates the launcher, the system shall provide access to the remaining projects.
3. WHEN responsive presentation adapts by viewport, the system shall preserve the same selector state model and expanded project list behavior.
  
### BR-10: Validation and Error Handling
  
**Goal**: Users experience graceful degradation when configuration is invalid.
**Delivery Timing**: Now
  
1. WHEN `visibleCount` is not an integer >= 1, the system shall fall back to the default value (7).
2. WHEN `compactInactive` is not a boolean, the system shall fall back to the default value (true).
3. WHEN a project-state entry's `favorite` is not a boolean, the system shall drop that field or entry.
4. WHEN a project-state entry's `lastUsedAt` is present but not a valid ISO-8601 timestamp, the system shall drop that field.
5. WHEN a project-state entry's `count` is not an integer >= 0, the system shall treat it as 0.
6. WHEN unknown fields appear in `user.toml` or `project-selector.json`, the system shall ignore them safely.
7. WHEN a per-project state entry is invalid, the system shall drop that entry without preventing other valid entries from loading.
  
## Constraints
  
| Concern | Requirement |
|---------|-------------|
| C1: File Location | User preferences stored in `CONFIG_DIR/user.toml` under `[ui.projectSelector]` |
| C2: File Location | Mutable selector state stored in `CONFIG_DIR/project-selector.json`, keyed by project code |
| C3: Persistence Timing | Usage state writes occur shortly after project selection, not on shutdown |
| C4: Visual Asset | Launcher uses the existing acclaim visual asset |
| C5: Visual Attachment | Full project browser panel is visually attached to the selector |
| C6: Default Values | `visibleCount` default is 7; `compactInactive` default is true |
| C7: Active Visibility | Active project always counts toward `visibleCount` but is never hidden |
| C8: Rail Termination | Selector rail ends with exactly one launcher control |
| C9: No Synthetic Items | No "All Projects" synthetic item is introduced |
| C10: State Separation | Mutable selector state remains separate from immutable user preferences |
  
## Constraint Carryover
  
| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Configuration Layer), tasks.md (Implementation) |
| C2 | architecture.md (Configuration Layer), tasks.md (Implementation) |
| C3 | architecture.md (Runtime Behavior), tests.md (Persistence tests) |
| C4 | architecture.md (Visual Components), tasks.md (Launcher) |
| C5 | architecture.md (UI Layout), tests.md (Panel positioning) |
| C6 | architecture.md (Configuration Layer), tests.md (Defaults) |
| C7 | architecture.md (Selection Logic), tests.md (Active visibility) |
| C8 | architecture.md (UI Layout), tests.md (Launcher presence) |
| C9 | architecture.md (Selection Logic), tests.md (No synthetic items) |
| C10 | architecture.md (Data Model), tests.md (State isolation) |
  
## Non-Ambiguity Table
  
| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| visibleCount | Total slots in rail including active project | Slots for inactive projects only | Simpler mental model: user sees N items total |
| Active project visibility | Always visible, prioritized over favorites and ordering, regardless of favorite status | May be hidden if not in top N by count/recency | User must always see current context |
| Expanded panel ordering | Favorites first (by count desc, lastUsedAt desc), then non-favorites (by lastUsedAt desc, count desc) | Alphabetical, registration order, undefined for non-favorites | Mirrors rail ordering logic for consistency |
| Favorite ordering in rail | By `count` desc, then `lastUsedAt` desc | Alphabetical, registration order | Usage-based priority reflects actual usage patterns |
| Non-favorite ordering in rail | By `lastUsedAt` desc, then `count` desc | Alphabetical, registration order | Recency reflects likely next selection |
| Favorite overflow | Appears at top of expanded panel | Scattered throughout panel | Favorites remain discoverable even when not in rail |
| Persistence timing | Shortly after selection with debounce/batching | Only on shutdown | Prevents data loss on crash/close |
| Invalid entry handling | Drop invalid entries, keep valid ones | Fail entire file load | Maximizes resilience |
| Invalid count field | Treat as 0, preserving the entry | Drop the entry entirely | Maximizes data retention while providing safe default |
| compactInactive = true | Code-only compact cards for inactive | No inactive projects shown in rail | Maximizes rail density while preserving quick access |
| Mobile collapsed rail | Active project + launcher only | Active project only (no launcher) | Launcher required to access other projects |
  
## Configuration
  
| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `visibleCount` | Number of project entries in selector rail | 7 | Use default 7 |
| `compactInactive` | Whether inactive visible projects use compact cards | true | Use default true |
  
## Per-Project State Fields
  
| Field | Type | Description | When Absent |
|-------|------|-------------|-------------|
| `favorite` | boolean | Whether project is favorited | Treated as false |
| `lastUsedAt` | ISO-8601 string | Timestamp of last selection | Treated as never used |
| `count` | integer >= 0 | Number of times selected | Treated as 0 |
 
---
*Generated by /mdt:requirements*
