# Debt: MDT-206

## Non-Blocking

- `docs/design/surfaces/swimlane-board.spec.md` should be reconciled in a follow-up durable-doc pass. Current implementation follows MDT-206 ticket scope, not the older peer-view-switcher language.
- Full frontend lint is blocked by unrelated existing sorting lint errors:
  - `src/utils/sorting.ts`
  - `src/utils/sorting.test.ts`
- Build emits the existing large chunk warning for `index-*.js`; this is not introduced by MDT-206.

## Blocking Debt

None found.
