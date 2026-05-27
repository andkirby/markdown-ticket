# Path Selection Tree Architecture

## Context

The **Select Document Paths** modal lets project owners choose folders or Markdown files for the Documents view.

The modal should show selectable project paths, not just already configured document paths.

## Current Shape

- Frontend `PathSelector` calls `/api/filesystem?projectId=...`.
- Backend `TreeService.getPathSelectionTree()` delegates to `TreeBuilder` with `PathSelectionStrategy`.
- Document navigation uses the same general tree-building pipeline.

This is mostly good: the frontend stays thin, and backend owns filesystem rules such as ignored folders, ticket-path exclusion, and depth limits.

## Issue Found

The old path-selection tree was derived from `**/*.md` results.

That made the selector document-centric instead of path-centric:

- folders with Markdown files appeared,
- folders without Markdown files disappeared,
- selectable paths like `src` could be configured but not selected from the modal.

## Architectural Concern

`TreeBuilder` is still document-oriented. It gathers Markdown files first, then hands them to a strategy.

For path selection, that input is the wrong abstraction. A path selector needs directory traversal and optional Markdown file leaves. Passing Markdown file paths into `PathSelectionStrategy` is now vestigial.

## Recommendation

Keep these responsibilities separate:

- **Document navigation tree**: document metadata, configured document paths, Markdown files only.
- **Path selection tree**: project filesystem browser, folders plus Markdown files, no metadata.

If this area changes again, introduce a dedicated service such as `PathSelectionTreeService` or `FilesystemSelectionService` and move path-selection traversal out of the document `TreeBuilder` pipeline.

The route should also become more explicit eventually:

```text
GET /api/projects/:projectId/path-selection-tree
```

That name describes the behavior better than the broad `/api/filesystem`.

## Current Fix

The current implementation is acceptable as a scoped fix:

- path selection now walks folders directly,
- Markdown files still appear as selectable leaves,
- ignored folders, ticket paths, and `maxDepth` remain enforced,
- regression coverage verifies folders without Markdown files are included.

