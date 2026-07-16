# Tasks

Related CR: `MDT-187-relationship-badge-overflow.md`
Architecture: `MDT-187/architecture.md`
Test plan: `MDT-187/tests.md`

## Task List

- [x] 1. Add Popover primitive (`TASK-popover`)
  Owns: `src/components/ui/popover.tsx`, `@radix-ui/react-popover` dependency
  Makes Green: prerequisite for TASK-overflow
  Notes: shadcn wrapper over Radix, mirrors `dropdown-menu.tsx` convention.

- [x] 2. Add elision helper + tests (`TASK-elide`)
  Owns: `src/components/Badge/relationshipLink.ts`, `src/components/Badge/relationshipLink.test.ts`
  Makes Green: TEST-elide-link-key
  Notes: pure function; parses key prefix, compares to project code, preserves digit width.

- [x] 3. Update RelationshipBadge: displayMode + elision + per-link title (`TASK-compact`)
  Owns: `src/components/Badge/RelationshipBadge.tsx` (elision path)
  Makes Green: TEST-compact-inline, TEST-per-link-title, TEST-full-mode, TEST-baseline-preserved
  Notes: add `displayMode?: 'compact' | 'full'` prop (default `'full'`); wrap inline SmartLinks in stopPropagation span.

- [x] 4. Add overflow trigger + popover to RelationshipBadge (`TASK-overflow`)
  Owns: `src/components/Badge/RelationshipBadge.tsx` (overflow path)
  Makes Green: TEST-overflow-closed, TEST-popover, TEST-click-stop-propagation
  Notes: `INLINE_MAX = 3`; `+N` button with aria-haspopup/aria-expanded; Radix Popover lists overflow links as full codes.

- [x] 5. Wire board to compact mode (`TASK-wire-board`)
  Owns: `src/components/TicketAttributeTags.tsx`
  Makes Green: end-to-end board behavior
  Notes: pass `displayMode="compact"` to the three RelationshipBadge instances. TicketViewer unchanged.

- [x] 6. Update RelationshipBadge tests for new contract (`TASK-tests`)
  Owns: `src/components/Badge/RelationshipBadge.test.tsx`
  Makes Green: all TEST-* IDs above
  Notes: update title-attribute assertion (now per-link); add elision/overflow/popover/stopPropagation cases.

- [x] 7. Verify gates (`TASK-verify`)
  Owns: —
  Makes Green: `bun run validate:ts` (changed files), `bun run lint:all`, `bun test --isolate ./src/components/Badge`
  Notes: confirm the pre-existing `setupTests.ts:92` TS error is unchanged (not introduced by this work).

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `src/components/ui/popover.tsx` | TASK-popover |
| `@radix-ui/react-popover` | TASK-popover |
| `src/components/Badge/relationshipLink.ts` | TASK-elide |
| `src/components/Badge/relationshipLink.test.ts` | TASK-elide |
| `src/components/Badge/RelationshipBadge.tsx` (elision) | TASK-compact |
| `src/components/Badge/RelationshipBadge.tsx` (overflow) | TASK-overflow |
| `src/components/TicketAttributeTags.tsx` | TASK-wire-board |
| `src/components/Badge/RelationshipBadge.test.tsx` | TASK-tests |

## Ordering

1 → 2 → (3, 4 can be done together on the same file) → 5 → 6 → 7. Tasks 3 and 4 both edit `RelationshipBadge.tsx` and should be committed together to avoid a broken intermediate state.
