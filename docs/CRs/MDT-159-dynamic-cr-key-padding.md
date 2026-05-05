---
code: MDT-159
status: Implemented
dateCreated: 2026-05-04T17:34:57.984Z
type: Technical Debt
priority: Medium
---

# Centralize CR key padding for 4-5 digit ticket numbers

## Problem

- `padStart(3, '0')` is hardcoded in 7 locations across shared, frontend, and test code
- At ticket 1000+, keys would format inconsistently — explicit `padStart(3)` suggests 3-digit intent
- No single source of truth for CR key number formatting — any change requires updating 7 files independently

## Affected Areas

- `shared/` — TicketService, keyNormalizer, test helpers
- `src/` — routing, quick search

## Scope

- **In scope**: Create centralized `formatCrKey()` utility, replace all 7 hardcoded sites, ensure 4-5 digit numbers format correctly
- **Out of scope**: Folder restructuring, archive functionality, counter file changes

## Desired Outcome

- A single `formatCrKey(projectCode, number)` function in `shared/utils/` produces correct keys for any ticket number (3-digit through 5-digit+)
- All 7 locations use this function instead of inline `padStart`
- `MDT-999` stays 3-digit, `MDT-1000` becomes 4-digit, `MDT-10000` becomes 5-digit
- Existing tickets (MDT-001 through MDT-157) are completely unaffected

### Constraints

- Must not change filenames of existing tickets on disk
- Must maintain backward compatibility with existing key formats
- Dynamic padding: `Math.max(3, String(num).length)`

### Non-Goals

- Not restructuring `docs/CRs/` into bucket folders
- Not adding archive functionality
- Not changing how `getNextCRNumber()` works (already uses `\d+` regex)

## Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Naming | `formatCrKey` or `formatTicketKey`? | Follow existing naming in `keyNormalizer.ts` |
| Location | Place in existing `keyNormalizer.ts` or new file? | Single responsibility vs. file bloat |

## Acceptance Criteria

### Functional

- [ ] `formatCrKey('MDT', 1)` returns `MDT-001`
- [ ] `formatCrKey('MDT', 999)` returns `MDT-999`
- [ ] `formatCrKey('MDT', 1000)` returns `MDT-1000`
- [ ] `formatCrKey('MDT', 10000)` returns `MDT-10000`
- [ ] All 7 hardcoded `padStart(3, '0')` sites replaced with `formatCrKey()` call
- [ ] `keyNormalizer.ts` uses dynamic padding instead of hardcoded 3
- [ ] Frontend routing (`routing.ts`) uses centralized function
- [ ] Quick search (`useQuickSearch.ts`) uses centralized function

### Non-Functional

- [ ] No performance regression (function is a simple string operation)
- [ ] Zero migration — no existing ticket files renamed or moved

## Verification

- `bun run validate:ts` passes with no new errors
- `bun run --cwd server jest` passes (shared unit tests)
- `bun run lint` passes
- Manual: create a test ticket at number 1000+ and verify key format

## References

- Research: `research/ticket-numbering-scale.md`

> Requirements trace projection: [requirements.trace.md](./MDT-159/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-159/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-159/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-159/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-159/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-159/architecture.md)
>
> Tests trace projection: [tests.trace.md](./MDT-159/tests.trace.md)
>
> Tests notes: [tests.md](./MDT-159/tests.md)
>
> Tasks trace projection: [tasks.trace.md](./MDT-159/tasks.trace.md)
>
> Tasks notes: [tasks.md](./MDT-159/tasks.md)