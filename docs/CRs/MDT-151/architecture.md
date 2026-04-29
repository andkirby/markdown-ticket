# Architecture: MDT-151

## Overview

Add a path containment validation layer to the existing service architecture. The change follows the proven `DocumentService` pattern (reject `..`, then check `resolvedPath.startsWith(rootDir)`) and extends it with a whitelist-based subDocName validator and opt-in symlink policy. No structural changes to module boundaries — purely additive validation in existing service methods.

## Design Pattern: Defense-in-Depth Containment

```text
Request → Route → Controller → TicketService → SubdocumentService
                                                    ↓
                                            isSupportedSubdocumentPath()
                                              (whitelist: alphanumeric, hyphens,
                                               underscores, dots, single forward slash,
                                               length ≤255, no null bytes, no '..' segments)
                                                    ↓
                                            resolvePath()
                                              (join + startsWith containment)
                                                    ↓
                                            read()
                                              (lstatSync for symlink check)
                                              (realpathSync if allowSymlinks + containment)
                                                    ↓
                                            readFileSync
```

Three validation layers, each independently safe:
1. **Input whitelist** — reject obviously invalid subDocName before any filesystem ops
2. **Path containment** — after join, verify resolved path starts with ticketDir
3. **Symlink policy** — detect and contain symlink traversal

## Module Boundaries

### SubdocumentService (shared/services/ticket/SubdocumentService.ts)
**Owner**: Path resolution and read for subdocument content  
**Changes**:
- `isSupportedSubdocumentPath()` — add content validation (whitelist chars, reject null bytes, length check, whitespace check)
- `resolvePath()` — add containment check after `join()`: reject if resolved path doesn't start with `ticketDir`
- `read()` — add symlink detection via `lstatSync` before `readFileSync`; if symlink, check policy and containment on resolved target

### ProjectValidator (shared/tools/ProjectValidator.ts)
**Owner**: ticketsPath validation logic  
**Changes**: No structural changes — existing `validateTicketsPath()` already handles `../` rejection. May need minor enhancement for edge cases.

### ProjectConfigService (shared/services/project/ProjectConfigService.ts)
**Owner**: Config loading  
**Changes**: Call `validateTicketsPath()` during `getProjectConfig()` to enforce server-side validation at load time

### path-resolver.ts (shared/utils/path-resolver.ts)
**Owner**: Centralized path utilities  
**Changes**: Add generic `isContainedPath(resolved: string, root: string): boolean` utility (extracts pattern from `isPathWithinProject` in ProjectService)

## Invariants

1. **No path resolution without containment check** — every `join(ticketDir, subDocName)` must be followed by a `startsWith(ticketDir)` check on the resolved result
2. **404 for all rejected paths** — never 403 (avoids information leakage)
3. **Validation after decoding** — Express decodes `%2F` before route params reach handlers; validate the decoded value
4. **Default deny symlinks** — `allowSymlinks` must be explicitly set to `true` for any symlink following
5. **Whitelist over blacklist** — validate subDocName characters against an allowed set, not a blocked set
6. **Synchronous for security** — use sync fs ops (`lstatSync`, `realpathSync`) in validation path to avoid TOCTOU races
7. **Literal dotdot rejected at input** — `..` path segments are rejected during input validation in `isSupportedSubdocumentPath()` before path joining or filesystem access

## Assess Carry-Forward

The assess (Option 1: Integrate As-Is) identified four mismatch points, all resolved locally:

| Mismatch | Architecture Response |
|----------|----------------------|
| SubdocumentService no containment | Add `startsWith` check in `resolvePath()` |
| ticketsPath not validated server-side | Wire `validateTicketsPath()` into config load |
| No symlink awareness | Add `lstatSync` + `realpathSync` with default-deny policy |
| Inconsistent with DocumentService pattern | Follow pattern explicitly, extract shared utility |

## Extension Rule

New path-containing endpoints should use the shared `isContainedPath()` utility from `path-resolver.ts`. Do not create per-endpoint containment logic.
