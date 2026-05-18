---
code: MDT-171
status: Implemented
dateCreated: 2026-05-17T22:04:28.240Z
type: Feature Enhancement
priority: Medium
---

# Add document favs

## 1. Description

### Requirements Scope
full

### Problem
- Documents View has a tight left navigation column and large document trees are slow to scan.
- Users cannot mark important folders or documents for quick return.
- Recent documents are automatic, but users need explicit control over stable shortcuts.

### Affected Areas
- Frontend: Documents View sidebar and file tree interactions.
- Backend: document fav state persistence, read enrichment, and write route ownership.
- Configuration: per-user mutable state under CONFIG_DIR.

### Scope
- In scope: fav section in Documents View, star toggle on folders and markdown documents, persistence of fav state, reconciliation with eligible document paths, and the document fav read/write API boundary.
- Out of scope: full-text document search, ticket navigation changes, and document root configuration changes.

## 2. Desired Outcome

### Success Conditions
- Users can star a folder or markdown document in the document tree.
- Starred items appear in a compact Favs section above Recent.
- Selecting a fav opens the document or scrolls/expands to the folder in the tree.
- Active stars visibly match the existing project favorite star pattern.
- Deleted or excluded paths do not remain as usable favs.

### Constraints
- Use the existing project favorite star active/inactive states, hover/focus affordance, and accessible label pattern for document fav controls.
- Do not store favs in `.mdt-config.toml`; this is user state, not project behavior.
- Store favs at `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- Read fav metadata by enriching `GET /api/documents`.
- Write fav state only through `PUT /api/documents/favs`.
- Preserve existing Recent and All Documents behavior.
- Keep Documents View tree eligibility governed by existing document discovery rules.

### Non-Goals
- Do not add unmanaged shortcut lists without visible add/remove controls.
- Do not include ticket files from `docs/CRs` in document favs.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Naming | Should UI label remain Favs or use Favorites in wider layouts? | Left column is tight; current proposal recommends Favs. |
| Ordering | Should favs keep manual order, newest-first order, or tree order? | Initial proposal allows array order, shows a five-row preview, and keeps overflow reachable through `Show all`. |

### Known Constraints
- Existing research lives in `research/document-favs-proposal.md`.
- Document fav writes must not go through `.mdt-config.toml`, `/api/documents/configure`, `/api/documents/content`, project config routes, or `/api/config/selector`.
- Existing Documents View navigation spec rejects unmanaged pinned/favorites lists.

### Decisions Deferred
- Exact backend service and schema names.
- Final test breakdown and implementation tasks.

## 4. Acceptance Criteria

### Functional
- [ ] User can add a folder to Favs from the document tree star control.
- [ ] User can add a markdown document to Favs from the document tree star control.
- [ ] Active star state is visible in tree rows and fav rows.
- [ ] User can remove a fav by selecting the active star.
- [ ] Favs section is hidden when empty.
- [ ] Favs section appears above Recent when at least one fav exists.
- [ ] Selecting a document fav opens that document.
- [ ] Selecting a folder fav expands and locates that folder in the tree.

### Non-Functional
- [ ] Existing document loading behavior remains backward compatible.
- [ ] Existing Recent behavior remains unchanged.
- [ ] Document tree rows remain compact and do not increase sidebar clutter.

### Edge Cases
- Deleted fav paths are removed or ignored on refresh.
- Paths outside configured document roots cannot be favorited.
- Ticket paths under `docs/CRs` cannot be favorited as documents.
- Invalid stored fav state falls back without breaking Documents View.

## 5. Verification

### How to Verify Success
- Manual: star a folder and document, reload the app, then verify Favs behavior.
- Automated: component tests for star state and Favs rendering.
- Automated: API/state tests for invalid, deleted, excluded fav paths, persistence, and route boundary.
- E2E: verify fav add, remove, reload, document open, and folder locate flows.
