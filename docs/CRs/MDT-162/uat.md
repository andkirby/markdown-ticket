# UAT Note: prune folders without Markdown

Ticket: `MDT-162`
Round: 2026-07-09

## Objective

UAT feedback: the document path selector (Documents View → Settings → Configure
paths) suggested folders that contain no Markdown files, cluttering the list
with empty directories. Both the navigation tree and the selector should show
only folders whose subtree contains at least one Markdown document.

## Approved Change

Folder pruning (no Markdown anywhere beneath) now lives in the shared
`PathSelectionStrategy.buildTree`, so it applies uniformly to:

- the **path selector** tree (`GET /api/filesystem` → `getPathSelectionTree`), and
- the **document navigation** tree (`GET /api/documents` → `getDocumentTree`).

`DocumentNavigationStrategy` no longer carries its own pruning override; it
inherits the shared rule and adds only file metadata via `processFile`.

## Verification

- `server/tests/api/system.test.ts` — selector regression test flipped: folders
  without Markdown (`src/`, `docs/empty-section`) are excluded from
  `/api/filesystem`; `docs` (has `overview.md`) remains selectable.
- `server/tests/api/documents.test.ts` — navigation tree still prunes the same
  folders from `/api/documents`.
- Server suite: **70/70** (documents, system, document-favs).
- Documents E2E: **36/36**, including the Settings → path-selector modal
  (`navigation.spec.ts` "path configuration shows collapsed selector tree").
- TS clean (only the pre-existing unrelated `setupTests` error remains).

## Manual UAT

1. Open a project with a mix of folders — some with `.md`, some with only
   assets/code, some empty.
2. Documents View sidebar tree: only folders containing `.md` appear.
3. Settings → Configure paths: the selector lists only folders containing `.md`;
   empty/asset-only folders are no longer suggested.

## Spec

- `docs/design/surfaces/documents-view-navigation.spec.md`
- `docs/design/surfaces/documents-path-selector.spec.md`

Both now state the shared rule: only folders with at least one Markdown file are
shown or selectable.
