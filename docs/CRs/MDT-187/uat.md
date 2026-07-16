# UAT Refinement Brief

Related CR: `MDT-187-relationship-badge-overflow.md`
Round: 2026-07-16 (global elision + no separator)

## Objective

Apply post-implementation UAT feedback to the relationship badge: make elision global (all surfaces), remove the inline comma separator, and introduce code-level configuration ahead of a future settings UI item.

## Approved Changes

1. **Remove inline comma separator.** Relationship links render adjacently with no separator by default (`🔗 030 005 035`).
2. **Global elision.** Same-project links render as bare numbers on the board **and** in the TicketViewer. Reverses the earlier "board-only" decision.
3. **Code-level configuration.** New `src/config/relationshipBadge.ts` exports `RELATIONSHIP_LINK_SEPARATOR` and `ELIDE_EVERYWHERE`. A settings UI item is explicitly deferred.

## Changed Requirement IDs

- In-place refinement of the MDT-187 elision contract. Acceptance criterion #8 ("viewer shows full codes") is reversed: the viewer now elides.

## Affected Downstream Trace

| Stage | Change |
|-------|--------|
| requirements | AC #8 reversed (viewer elides) |
| bdd | S11 reversed (viewer elides + collapses) |
| architecture | D5/displayMode note: `ELIDE_EVERYWHERE` supersedes `displayMode`; separator config added |
| tests | unit + E2E updated for no-comma + global elision |

## Execution Slices

### Slice 1 — Config module (done)

- Objective: single source of truth for separator + global elision flag.
- Direct artifacts: `src/config/relationshipBadge.ts` (new).
- GREEN targets: none (constants only).

### Slice 2 — Global elision + no separator (done)

- Objective: `RelationshipBadge` elides on all surfaces and renders no separator.
- Direct artifacts: `src/components/Badge/RelationshipBadge.tsx`.
- GREEN targets: `RelationshipBadge.test.tsx`, `TicketAttributeTags.test.tsx`, `tests/e2e/board/relationship-badge.spec.ts`.

## Validation

- `bun test --isolate ./src/components/Badge/ ./src/components/TicketAttributeTags.test.tsx` → 97/97 pass
- `bunx playwright test tests/e2e/board/relationship-badge.spec.ts` → 2/2 pass
- `npx tsc --noEmit --project tsconfig.json` → clean (src)
- `bun run lint:frontend` → clean

## Watchlist

- Settings UI item to expose `RELATIONSHIP_LINK_SEPARATOR` and `ELIDE_EVERYWHERE` (deferred, separate ticket).
- `displayMode` prop is now a no-op while `ELIDE_EVERYWHERE` is on; retained for the future per-surface override. Remove or wire up when settings land.

## Open Decisions

None — all three changes approved and implemented.
