# Requirements: MDT-171

**Source**: [MDT-171](../MDT-171-document-favs.md)
**Generated**: 2026-05-18

## Overview

MDT-171 adds explicit document and folder favs to Documents View so users can return to stable shortcuts without replacing Recent or the full document tree. Favs are durable project-scoped user state, reconciled against the eligible document tree, and shown only when usable entries exist.

The storage decision is locked for this ticket: document fav state uses `CONFIG_DIR/projects/{project.id}/document-favs.json`. Favs must not be stored in `.mdt-config.toml`.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md storage ownership, tests.md persistence-path coverage, tasks.md backend state task |
| C2 | architecture.md configuration boundary, tests.md no-project-config-write coverage |
| C3 | architecture.md project resolution flow, tests.md id/code resolution coverage |
| C4 | architecture.md state schema, tests.md schema validation coverage |
| C5 | architecture.md eligibility/reconciliation rules, tests.md invalid target coverage |
| C6 | architecture.md UI visual contract, tests.md active/inactive star assertions |
| C7 | architecture.md input validation/security boundary, tests.md path traversal rejection coverage |
| C8 | architecture.md sidebar layout contract, tests.md compact/sidebar behavior coverage |
| C9 | architecture.md route/service boundary, tests.md endpoint separation coverage |
| C10 | architecture.md Favs overflow/initial display decision, tests.md preview/show-all coverage |
| Edge-1 | architecture.md reconciliation behavior, tests.md deleted fav coverage |
| Edge-2 | architecture.md eligibility behavior, tests.md outside-root coverage |
| Edge-3 | architecture.md ticket-area exclusion behavior, tests.md `docs/CRs` exclusion coverage |
| Edge-4 | architecture.md fallback behavior, tests.md malformed-state coverage |
| Edge-5 | architecture.md project lookup failure behavior, tests.md unknown-project coverage |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Storage owner | Durable project-scoped user state in `CONFIG_DIR/projects/{project.id}/document-favs.json` | Browser-only localStorage or `.mdt-config.toml` | User decision requires CONFIG_DIR durability; favs are not project behavior |
| State file name | `{name}=document-favs`, producing `document-favs.json` | Generic favorites file or document config file | Keeps feature state bounded and avoids coupling to document root configuration |
| Project identity | API lookup may use supported project input, but storage resolves to canonical `project.id` | Store by project code or request string | Project id is stable storage identity in the chosen convention |
| Fav targets | Eligible folders and markdown documents from the document tree | Arbitrary paths, ticket files, or non-markdown files | Favs must reconcile with existing document discovery rules |
| Favs label | Use `Favs` in the sidebar | Use `Favorites` everywhere | Sidebar is tight and research recommends the shorter label |
| Add/remove control | Star controls are visible add/remove affordances on tree and fav rows | Unmanaged shortcut list | Existing navigation spec rejects unmanaged pinned/favorites lists |
| Star visual contract | Document fav controls use project favorite active/inactive states, hover/focus affordance, and accessible label pattern unless architecture documents a specific incompatibility | Soft visual reuse without concrete required states | The constraint must be verifiable |
| Empty state | Hide Favs section entirely when no reconciled favs exist | Show an empty placeholder | Keeps the tight sidebar compact |
| Folder selection | Selecting a folder fav expands ancestors and locates the folder row | Open a document preview or no-op | Folder favs are navigation targets, not document content |
| Document selection | Selecting a document fav opens the markdown document and selects the matching tree row | Only scroll the tree | Document favs should behave like document shortcuts |
| Ordering | Persist complete ordered fav list; initial UI may insert newest at top | Tree order only or unmanaged sort | Array order is explicit and keeps future manual order possible |
| Initial visible favs | Show a five-row preview with `Show all` / `Show less` when six or more favs exist | Show every fav in the sidebar by default or hide extra favs permanently | The sidebar is tight, but every reconciled fav must remain reachable inline |
| Recent boundary | Existing Recent behavior remains unchanged | Merge recents and favs | Recents are automatic; favs are explicit user shortcuts |
| Endpoint boundary | Reads may enrich document tree metadata; writes stay separate from document root configuration and selector state | Overload `/api/documents/configure` or project selector endpoints | Favs are mutable document navigation state, not root configuration or project selector state |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `CONFIG_DIR/projects/{project.id}/document-favs.json` | Project-scoped mutable document fav state | Empty fav list | Documents View loads without Favs and continues to show Recent and All Documents |
| Initial Favs section visible rows | Preview row count before `Show all` | 5 | Show up to five reconciled fav rows; `Show all` appears for six or more favs |

No `.mdt-config.toml` changes are required. Existing document roots and ticket-path exclusion rules remain the eligibility source for fav targets.

## Reference Operations

- `GET /api/documents?projectId=...` remains the read path for the eligible document tree and may include optional fav metadata.
- `PUT /api/documents/favs` is the only fav-state write operation.
- `.mdt-config.toml`, `/api/documents/configure`, `/api/documents/content`, project config routes, and `/api/config/selector` are not fav-state write owners.

## Validation Summary

Scope coverage:
- Endpoints/reference operations found: `GET /api/documents?projectId=...`, `PUT /api/documents/favs`, and explicitly rejected non-owner endpoints. Covered by behavior and constraint records.
- Error/status cases found: unknown project, invalid path, deleted/excluded path, ticket path, malformed state. Covered by edge records.
- User-input fields found: `projectId`, `favItems[].path`, `favItems[].type`, `favItems[].favoritedAt`. Covered by project resolution, schema, eligibility, and path validation constraints.

Quality:
- Requirements validation passed via `spec-trace validate MDT-171 --stage requirements --format json`.
- Behavior requirements route to BDD only; constraints and edge cases route to tests.
- Delivery timing is `In This Ticket` for all canonical records.
- Security/path handling is covered through path normalization and traversal rejection.

## Review Notes

- Canonical requirements are in `requirements.trace.md`.
- BDD should use only `BR-*` behavior records.
- Architecture must carry forward the storage convention exactly: `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- The CR Section 5 reference links were not edited because this run was scoped to `docs/CRs/MDT-171/`.
