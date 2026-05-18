# BDD

> BDD trace projection: [bdd.trace.md](./bdd.trace.md)

## Overview

MDT-171 behavior is organized around three user journeys: adding/removing favs from Documents View, using favs as document and folder shortcuts, and preserving existing document navigation while durable project-scoped fav state is saved and restored.

The canonical BDD scenarios are stored in spec-trace and rendered in `bdd.trace.md`.

## Acceptance Strategy

The BDD set covers all behavior-routed requirements (`BR-1.1` through `BR-3.3`) with eight scenarios. Constraints and edge cases remain routed to tests and architecture rather than scenario coverage.

Browser E2E support exists through Playwright under `tests/e2e/`, with the project command `bun run test:e2e`. No executable E2E files were generated in this BDD run because the requested write scope is limited to MDT-171 CR artifacts and trace state.

## Test-Facing Contract Notes

- Persist document fav state under `CONFIG_DIR/projects/{project.id}/document-favs.json`.
- Do not store fav state in `.mdt-config.toml`.
- Keep star controls verifiable against the existing project favorite active/inactive, hover/focus, and accessible-label pattern.
- Keep the initial Favs section as a five-row preview and expose `Show all` / `Show less` when six or more favs exist.
- Keep Favs above Recent and outside the document tree scroll area.
- Preserve existing Recent and All Documents behavior while adding fav state and metadata.

## Execution Notes

Validation passed with:

```bash
spec-trace validate MDT-171 --stage bdd --format json
```

Trace projection was rendered with:

```bash
spec-trace render bdd MDT-171
```
