# Requirements

Ticket: `MDT-129`

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] WHEN the selector rail renders, the system shall display the active project as a larger card containing project code, title, and description.
- `BR-1.2` [bdd] WHEN the active project is favorited, the system shall display favorite state on the active project card.
- `BR-1.3` [bdd] WHEN the active project would otherwise fall outside the visible subset based on ordering rules, the system shall prioritize the active project to remain visible.
- `BR-1.4` [bdd] WHEN the user clicks the favorite star on any project card, the system shall toggle the favorite state and persist the change.

### BR-2

- `BR-2.1` [bdd] WHEN compactInactive is true (default), the system shall render inactive visible rail projects as compact code-only cards.
- `BR-2.3` [bdd] WHEN an inactive visible project is rendered, the system shall not display title or description expansion in the rail.

### BR-3

- `BR-3.1` [bdd] WHEN the user clicks the active project card, the system shall open the full project browser panel.
- `BR-3.2` [bdd] WHEN the user hovers over an inactive project chip, the system shall display a hover card with full project details after a short delay.
- `BR-3.3` [bdd] WHEN a hover card displays, the system shall show the project code, name, description, and favorite status.
- `BR-3.4` [bdd] WHEN the user stops hovering over an inactive project chip, the system shall dismiss the hover card after a short delay.

### BR-4

- `BR-4.1` [bdd] WHEN the panel opens, the system shall display the full project list as cards containing project code, title, and description.
- `BR-4.2` [bdd] WHEN a project in the panel is favorited, the system shall display favorite state on the full project card.
- `BR-4.3` [bdd] WHEN the panel renders, the system shall order favorites first, then remaining projects.
- `BR-4.4` [bdd] WHEN ordering remaining non-favorite projects in the panel, the system shall sort by lastUsedAt descending, with count descending as tie-break.
- `BR-4.5` [bdd] WHEN favorites do not fit in the visible rail, the system shall display those favorites at the top of the expanded project list.

### BR-5

- `BR-5.1` [bdd] WHEN a user selects a project from the selector rail, the system shall change the current project to the selected project.
- `BR-5.2` [bdd] WHEN a user selects a project from the full project panel, the system shall change the current project to the selected project.
- `BR-5.3` [bdd] WHEN project selection is committed, the system shall update usage state for the selected project.
- `BR-5.4` [bdd] WHEN usage state is updated, the system shall set lastUsedAt to the current timestamp.
- `BR-5.5` [bdd] WHEN usage state is updated, the system shall increment count.

### BR-6

- `BR-6.1` [bdd] WHEN the selector rail renders, the system shall display the active project first.
- `BR-6.2` [bdd] WHEN filling remaining visible rail slots, the system shall prioritize favorites first, then non-favorites.
- `BR-6.3` [bdd] WHEN ordering visible favorites, the system shall sort by count descending, with lastUsedAt descending as tie-break.
- `BR-6.4` [bdd] WHEN ordering visible non-favorites, the system shall sort by lastUsedAt descending, with count descending as tie-break.
- `BR-6.5` [bdd] WHEN the active project would otherwise fall outside the visible subset based on ordering rules, the system shall prioritize the active project to remain visible regardless of favorite status.

### BR-7

- `BR-7.1` [bdd] WHEN CONFIG_DIR/user.toml contains [ui.projectSelector].visibleCount, the system shall use that value as the number of visible projects in the rail.
- `BR-7.2` [bdd] WHEN CONFIG_DIR/user.toml contains [ui.projectSelector].compactInactive, the system shall use that value to control inactive visible project presentation.
- `BR-7.3` [bdd] WHEN CONFIG_DIR/user.toml is missing, the system shall fall back to default values without breaking the UI.
- `BR-7.4` [bdd] WHEN visibleCount in user.toml is invalid, the system shall fall back to the default value (7).
- `BR-7.5` [bdd] WHEN compactInactive in user.toml is invalid, the system shall fall back to the default value (true).

### BR-8

- `BR-8.1` [bdd] WHEN mutable selector state changes, the system shall persist the state to CONFIG_DIR/project-selector.json.
- `BR-8.2` [bdd] WHEN persisting selector state, the system shall key entries by project code.
- `BR-8.3` [bdd] WHEN persisting selector state, the system shall store favorite, lastUsedAt, and count per project.
- `BR-8.4` [bdd] WHEN persisting after project selection, the system shall write shortly after the selection changes and shall not depend on shutdown behavior.
- `BR-8.5` [bdd] WHEN CONFIG_DIR/project-selector.json is missing, the system shall initialize empty state without breaking the UI.
- `BR-8.6` [bdd] WHEN CONFIG_DIR/project-selector.json is invalid JSON, the system shall fall back to empty state without breaking the UI.
- `BR-8.7` [bdd] WHEN CONFIG_DIR/project-selector.json contains partially malformed entries, the system shall load valid project entries and drop invalid entries.

### BR-9

- `BR-9.1` [bdd] WHEN the viewport is mobile-sized, the system shall display only the active project in the collapsed selector rail.
- `BR-9.3` [bdd] WHEN responsive presentation adapts by viewport, the system shall preserve the same selector state model and expanded project list behavior.

### BR-10

- `BR-10.1` [tests] WHEN visibleCount is not an integer greater than or equal to 1, the system shall fall back to the default value (7).
- `BR-10.2` [tests] WHEN compactInactive is not a boolean, the system shall fall back to the default value (true).
- `BR-10.3` [tests] WHEN a project-state entry's favorite is not a boolean, the system shall drop that field or entry.
- `BR-10.4` [tests] WHEN a project-state entry's lastUsedAt is present but not a valid ISO-8601 timestamp, the system shall drop that field.
- `BR-10.5` [tests] WHEN a project-state entry's count is not an integer greater than or equal to 0, the system shall treat it as 0.
- `BR-10.6` [tests] WHEN unknown fields appear in user.toml or project-selector.json, the system shall ignore them safely.
- `BR-10.7` [tests] WHEN a per-project state entry is invalid, the system shall drop that entry without preventing other valid entries from loading.

## Constraints

- `C1` [tests] User preferences stored in CONFIG_DIR/user.toml under [ui.projectSelector]
- `C2` [tests] Mutable selector state stored in CONFIG_DIR/project-selector.json, keyed by project code
- `C3` [tests] Usage state writes occur shortly after project selection, not on shutdown
- `C5` [tests] Full project browser panel is visually attached to the selector
- `C6` [tests] visibleCount default is 7; compactInactive default is true
- `C7` [tests] Active project always counts toward visibleCount but is never hidden
- `C9` [tests] No All Projects synthetic item is introduced
- `C10` [tests] Mutable selector state remains separate from immutable user preferences

## Edge Cases

_No edge cases recorded._

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 39 | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-2.1`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-3.4`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-4.5`, `BR-5.1`, `BR-5.2`, `BR-5.3`, `BR-5.4`, `BR-5.5`, `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`, `BR-6.5`, `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `BR-9.1`, `BR-9.3` |
| tests | 15 | `BR-10.1`, `BR-10.2`, `BR-10.3`, `BR-10.4`, `BR-10.5`, `BR-10.6`, `BR-10.7`, `C1`, `C2`, `C3`, `C5`, `C6`, `C7`, `C9`, `C10` |
| clarification | 0 | - |
| not_applicable | 0 | - |
