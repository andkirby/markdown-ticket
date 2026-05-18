# Requirements

Ticket: `MDT-171`

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] WHEN the user marks an eligible folder as a fav, the system shall persist that folder as a project-scoped fav and show its active star state.
- `BR-1.2` [bdd] WHEN the user marks an eligible markdown document as a fav, the system shall persist that document as a project-scoped fav and show its active star state.
- `BR-1.3` [bdd] WHEN at least one reconciled fav exists, the system shall display a compact Favs section above Recent.
- `BR-1.4` [bdd] WHEN no reconciled favs exist, the system shall hide the Favs section.
- `BR-1.5` [bdd] WHILE an item is currently a fav, the system shall show active star state for that item in tree rows and fav rows.
- `BR-1.6` [bdd] WHEN the user selects the active star for a fav, the system shall remove that fav from persisted state and from the Favs section.

### BR-2

- `BR-2.1` [bdd] WHEN the user selects a document fav, the system shall open that markdown document and select the matching tree row.
- `BR-2.2` [bdd] WHEN the user selects a folder fav, the system shall expand the folder ancestors and scroll or locate the folder row in the tree.
- `BR-2.3` [bdd] WHEN the Documents View reloads for the same project, the system shall restore reconciled favs from durable project-scoped state.

### BR-3

- `BR-3.1` [bdd] WHEN the document tree is loaded, the system shall expose favorite state and favorited timestamp metadata for eligible fav nodes without changing non-favorite tree behavior.
- `BR-3.2` [bdd] WHEN fav state is written for a resolved project, the system shall save the complete ordered fav list for that project.
- `BR-3.3` [bdd] WHEN the user opens existing Recent or All Documents navigation, the system shall preserve existing Recent and document tree selection behavior.

## Constraints

- `C1` [tests] The system shall store document fav state under CONFIG_DIR/projects/{project.id}/document-favs.json.
- `C2` [tests] The system shall not store document fav state in .mdt-config.toml.
- `C3` [tests] The system shall keep document favs project-scoped by resolving API lookup input to the canonical project.id before selecting the state file.
- `C4` [tests] The system shall persist fav records with project-relative path, type of file or folder, and favoritedAt timestamp.
- `C5` [tests] The system shall accept only folders and markdown documents that are present in the eligible document tree as fav targets.
- `C6` [tests] The system shall use the existing project favorite star active/inactive states, hover/focus affordance, and accessible label pattern for document fav controls, unless architecture documents a specific incompatibility.
- `C7` [tests] The system shall validate fav path input as project-relative, normalized, non-empty, non-absolute, and free of parent-directory traversal before persistence.
- `C8` [tests] The system shall keep Favs and Recent outside the document tree scroll area and keep tree rows compact without increasing sidebar row height.
- `C9` [tests] The system shall use only `PUT /api/documents/favs` for document fav writes and shall not write fav state through `.mdt-config.toml`, `/api/documents/configure`, `/api/documents/content`, project config routes, or `/api/config/selector`.
- `C10` [tests] The system shall show a five-row Favs preview and expose `Show all` / `Show less` when six or more reconciled favs exist.

## Edge Cases

- `Edge-1` [tests] IF a stored fav path no longer exists in the eligible document tree, THEN the system shall remove or ignore that fav on refresh.
- `Edge-2` [tests] IF a stored fav path is outside configured document roots, THEN the system shall not expose it as a usable fav.
- `Edge-3` [tests] IF a stored fav path is under docs/CRs or the configured ticket path, THEN the system shall not expose it as a usable document fav.
- `Edge-4` [tests] IF stored fav state is missing, malformed, or invalid JSON, THEN the system shall fall back to an empty fav list without breaking Documents View.
- `Edge-5` [tests] IF a fav write references an unknown project, THEN the system shall reject the write without creating document fav state for an unresolved project.

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 12 | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-1.6`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3` |
| tests | 15 | `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `C8`, `C9`, `C10`, `Edge-1`, `Edge-2`, `Edge-3`, `Edge-4`, `Edge-5` |
| clarification | 0 | - |
| not_applicable | 0 | - |
