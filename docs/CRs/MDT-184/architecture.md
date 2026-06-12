# Architecture: Centralized Route Patterns

## Overview

Route path strings (`/prj/:projectCode/ticket/:ticketKey`, etc.) are currently duplicated across 8+ files. This refactor introduces a single ownership module (`src/routes.ts`) for route pattern constants and builder functions, then migrates all consumers to delegate. No behavioral change — purely structural.

## Design Decisions

### Single source of truth: `src/routes.ts`

A new module that owns:
1. **Route pattern constants** — the parametric forms with `:projectCode`, `:ticketKey`, `*` — used by `App.tsx` `<Route path={...}>`.
2. **Builder functions** — concrete path generators that substitute params into the patterns.

`linkBuilder.ts` is refactored to import pattern constants from `routes.ts` and re-export its builders. This preserves the existing public API (`buildTicketLink`, `buildDocumentLink`) while eliminating the hardcoded `/prj/` string.

### Why extend rather than replace `linkBuilder.ts`

`linkBuilder.ts` is already imported by `linkProcessor.ts`, `SmartLink`, and other consumers. Keeping its public API stable avoids a large cascading rename. The change is internal: pattern strings come from `routes.ts` instead of being inline.

### `linkNormalization.ts` delegation

`LinkNormalizer.DEFAULT_WEB_BASE` and its `buildTicketWebRoute`/`buildDocumentWebRoute` static methods are removed. Callers (currently within the same file) are pointed to `buildTicketLink`/`buildDocumentLink` from `linkBuilder.ts`. The rest of `linkNormalization.ts` (path resolution, security checks, normalization logic) is unchanged.

### Sub-document path builder

A new `buildTicketSubDocPath(projectCode, ticketKey, subDocPath)` builder handles the `ticket/:key/*` route variant. Consumers:
- `useTicketDocumentNavigation.ts` — navigate + redirect URL construction
- `DirectTicketAccess.tsx` — navigate URL construction
- `subdocPathValidation.ts` — `hashToPathUrl()` and regex pattern construction
- `markdownPreprocessor.ts` — `resolveDocumentRef()` ticket subdoc case

### `subdocPathValidation.ts` regex migration

The hardcoded regex patterns in `extractSubDocPath` are derived from route pattern constants. The function builds its regex from `routes.ts` pattern strings at module load, eliminating the duplicated `/prj/[^/]+/ticket/` fragments.

## Module Boundaries

```
src/routes.ts                    ← NEW: pattern constants + all builders
src/utils/linkBuilder.ts         ← Refactored: imports from routes.ts, re-exports builders
src/utils/linkProcessor.ts       ← Stable: already uses buildTicketLink
src/utils/linkNormalization.ts   ← Slimmed: removes DEFAULT_WEB_BASE + own builders
src/utils/markdownPreprocessor.ts ← Migrated: uses builders from linkBuilder
src/utils/subdocPathValidation.ts ← Migrated: uses builders + derives regex from patterns
src/App.tsx                      ← Route defs use pattern constants
src/components/DirectTicketAccess.tsx      ← Uses buildTicketLink/buildTicketSubDocPath
src/components/TicketViewer/useTicketDocumentNavigation.ts ← Same
src/components/ProjectSelector/index.tsx   ← Uses buildProjectPath
src/components/RedirectToCurrentProject.tsx ← Uses buildProjectPath
```

## Invariants

1. **One string, one owner** — the literal `'/prj'` appears only in `routes.ts`. Every other file uses a builder or constant.
2. **Builder functions are the only way to construct a route path** — no template literals with `/prj/` outside `routes.ts`.
3. **`linkBuilder.ts` public API is preserved** — existing imports continue to work.
4. **Route patterns in `App.tsx` reference the same constants** — if a pattern changes, it changes in one place.

## Extension Rule

When adding a new route shape:
1. Add the pattern constant to `routes.ts`.
2. Add (or extend) a builder function in `routes.ts`.
3. Add the `<Route>` in `App.tsx` using the pattern constant.
4. No other file should contain the path string.

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)
