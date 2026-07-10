---
code: MDT-154
status: Approved
dateCreated: 2026-04-30T20:55:28.150Z
type: Technical Debt
priority: Medium
---

# Centralize URL construction in linkBuilder

## Problem

- Ticket URL pattern `/prj/{code}/ticket/{key}` is built inline in **9 locations** across 6 files — any route change requires updating all of them
- `linkBuilder.ts` exists as the canonical URL builder but is bypassed by `markdownPreprocessor.ts`, `subdocPathValidation.ts`, `useTicketDocumentNavigation.ts`, `DirectTicketAccess.tsx`, and `App.tsx`
- MDT-150 added 4 more inline URL constructions in `resolveDocumentRef()` without using `linkBuilder`

## Affected Artifacts

- `src/utils/linkBuilder.ts` — canonical builder, only covers ticket + document + project links (missing subdoc, anchor variants)
- `src/utils/markdownPreprocessor.ts` — 5 inline URL constructions in `resolveDocumentRef()` + `convertTicketReferences()`
- `src/utils/subdocPathValidation.ts` — `hashToPathUrl()` builds ticket URLs inline
- `src/components/TicketViewer/useTicketDocumentNavigation.ts` — navigates to ticket URLs inline
- `src/components/DirectTicketAccess.tsx` — builds ticket URLs inline
- `src/App.tsx` — builds ticket URLs in navigation handlers

## Scope

- **Changes**: Expand `linkBuilder.ts` with missing URL patterns, migrate all 9 inline locations to use it
- **Unchanged**: No behavioral changes — same URLs, same routes, just centralized construction

## Decision

### Chosen Approach

Expand `linkBuilder.ts` to cover all URL patterns, then migrate inline builders to import from it.

### Rationale

- `linkBuilder.ts` already has input validation and is the documented canonical location
- Centralized construction means route format changes touch one file
- Reduces duplication from 9 locations to 1 source of truth

## Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Expand linkBuilder.ts** | Add missing patterns, migrate callers | **ACCEPTED** — canonical location already exists |
| URL constants file | Export string templates, interpolate elsewhere | Still scattered, just shared strings |
| Move to shared/ | Backend could also build frontend URLs | Backend never generates `/prj/` URLs — unnecessary coupling |

## Artifact Specifications

### New Artifacts

None

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/utils/linkBuilder.ts` | Functions added | `buildTicketSubdocLink()`, `buildTicketAnchorLink()`, update `buildDocumentLink()` for path-style |
| `src/utils/markdownPreprocessor.ts` | Import changed | Replace inline URL strings with `linkBuilder` calls |
| `src/utils/subdocPathValidation.ts` | Import changed | Replace `hashToPathUrl()` internals with `linkBuilder` calls |
| `src/components/TicketViewer/useTicketDocumentNavigation.ts` | Import changed | Replace inline URL with `linkBuilder` call |
| `src/components/DirectTicketAccess.tsx` | Import changed | Replace inline URLs with `linkBuilder` calls |
| `src/App.tsx` | Import changed | Replace inline ticket URL with `linkBuilder` call |

### Missing URL Patterns to Add

| Pattern | Example | Currently Built In |
|---------|---------|-------------------|
| Ticket subdoc | `/prj/MDT/ticket/MDT-150/architecture.md` | preprocessor, subdocPathValidation, navigation, DirectTicketAccess |
| Ticket + anchor | `/prj/MDT/ticket/MDT-150#overview` | preprocessor |
| Ticket subdoc + anchor | `/prj/MDT/ticket/MDT-150/architecture.md#overview` | preprocessor |
| Documents path-style | `/prj/MDT/documents/docs/README.md` | App.tsx route exists, no builder |

## Acceptance Criteria

### Functional

- [ ] `linkBuilder.ts` exports functions for all URL patterns used in the app
- [ ] `markdownPreprocessor.ts` imports from `linkBuilder` instead of inline template strings
- [ ] `subdocPathValidation.ts` imports from `linkBuilder` instead of inline template strings
- [ ] `useTicketDocumentNavigation.ts` imports from `linkBuilder`
- [ ] `DirectTicketAccess.tsx` imports from `linkBuilder`
- [ ] `App.tsx` imports from `linkBuilder`
- [ ] Zero inline `/prj/` URL constructions outside `linkBuilder.ts` (verified by grep)

### Non-Functional

- [ ] All existing tests pass (no behavioral change)
- [ ] `linkBuilder.mdt154.test.ts` covers all new URL patterns

### Testing

- Unit: `linkBuilder.ts` — all URL patterns produce correct output
- Unit: `markdownPreprocessor.mdt150.test.ts` — still GREEN after migration
- Grep: `grep -rn '/prj/' src/ --include='*.ts' --include='*.tsx' | grep -v linkBuilder | grep -v '.test.'` returns empty

## Verification

- All existing unit tests pass (behavior unchanged)
- Grep confirms zero inline `/prj/` URL constructions outside `linkBuilder.ts`

## Deployment

- Standard deployment, no configuration changes