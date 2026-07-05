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
- [x] User can add a folder to Favs from the document tree star control.
- [x] User can add a markdown document to Favs from the document tree star control.
- [x] Active star state is visible in tree rows and fav rows.
- [x] User can remove a fav by selecting the active star.
- [x] Favs section is hidden when empty.
- [x] Favs section appears above Recent when at least one fav exists.
- [x] Selecting a document fav opens that document.
- [x] Selecting a folder fav expands and locates that folder in the tree.

### Non-Functional
- [x] Existing document loading behavior remains backward compatible.
- [x] Existing Recent behavior remains unchanged.
- [x] Document tree rows remain compact and do not increase sidebar clutter.

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

## 6. UAT

### UAT Session 2026-07-05 — Favs section scrollable

**Source:** Follow-up to MDT-171. With many document favs, `Show all` expanded
the Favs section inline and pushed Recent and the file tree down indefinitely,
consuming the sidebar. Canonical design updated in
`docs/design/surfaces/documents-view-navigation.spec.md` (+ `.mockups.md`).

**Approved changes (frontend only):**
- Favs list body is an independently scrollable region, borrowing the board
  column scroll pattern (shared shadcn `ScrollArea` with `min-h-0` and an
  auto-hiding scrollbar). The section header (toggle + `Show all` / `Show less`)
  stays fixed above the scroll area.
- The scroll region height is relative to the navigation column
  (`--documents-favs-max-height`, default ~one third), not a fixed pixel value,
  so it scales with the viewport and never starves Recent or the file tree.
- The five-row cap and `Show all` / `Show less` are retained and stay independent
  of the scroll bound: the cap controls how many rows render; the bound controls
  region height. Scroll engages only when rendered rows exceed the bound
  (typically after `Show all`, or on short viewports).
- No backend, persistence, or API changes. `document-favs.json` shape unchanged.

**Acceptance checks:**
- [x] With more than five favs and `Show all` active, the Favs list scrolls
  within roughly one third of the column; Recent and the tree keep their positions.
- [x] Favs header and `Show all` / `Show less` remain visible while the list body
  scrolls.
- [x] With five or fewer favs (capped), Favs does not scroll and behaves as before.
- [x] Resizing the sidebar scales the Favs region; it never consumes the whole
  column or hides the file tree.

**Updated documents:** `docs/design/surfaces/documents-view-navigation.spec.md`,
`docs/design/surfaces/documents-view-navigation.mockups.md`.

**Affected code:** `src/components/DocumentsView/FavDocuments.tsx`,
`src/components/DocumentsView/DocumentsLayout.tsx`.

**Affected tests:** `src/components/DocumentsView/FavDocuments.test.tsx`.
