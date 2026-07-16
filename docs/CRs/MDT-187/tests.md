# Test Plan

Related CR: `MDT-187-relationship-badge-overflow.md`
Architecture: `MDT-187/architecture.md`
BDD scenarios: `MDT-187/bdd.md`

## Strategy

Extend the existing `RelationshipBadge.test.tsx` (currently 13 tests, all passing) with elision, overflow, and click-isolation coverage. Add a focused unit test for the pure elision helper. No E2E changes required for correctness, but one smoke E2E is updated to reflect new board rendering.

MemoryRouter harness pattern (already in `RelationshipBadge.test.tsx:21-35`) is reused for all component tests.

## Test Plans By Kind

### unit

- Elision helper purity (`TEST-elide-link-key`)
  Covers: S1, S2, S3, S4, S13
  File: `src/components/Badge/relationshipLink.test.ts`
  Cases: same-project → bare number; cross-project → full; multi-digit preserved; malformed → full key fallback; number-segment extraction respects original width.

- Compact-mode inline rendering (`TEST-compact-inline`)
  Covers: S1, S3, S5
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: single same-project link renders bare number; 3 links render all inline with no trigger; mixed same/cross renders elided + full together.

- Per-link title carries full key (`TEST-per-link-title`)
  Covers: S1, S2
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: each inline link element's `title` is its full CR key regardless of elision.

- Overflow trigger and badge title (`TEST-overflow-closed`)
  Covers: S6
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: 5 links → "030, 005, 035 +2"; `+N` is a `<button>` with `aria-haspopup`; badge-level `title` lists all 5 full keys.

- Popover open/close behavior (`TEST-popover`)
  Covers: S7, S8
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: clicking `+N` opens popover; popover lists hidden links as full codes; trigger `aria-expanded` toggles; Escape closes popover.

- Click isolation (`TEST-click-stop-propagation`)
  Covers: S9, S10
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: clicking an inline link does not call a parent `onClick`; clicking `+N` does not call a parent `onClick`. Use a spy `onClick` on a wrapping div.

- Full-mode (viewer) no elision/no overflow (`TEST-full-mode`)
  Covers: S11
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: `displayMode="full"` (or default) with 5 links renders all 5 full codes inline, no `+N`, no popover.

- Existing baseline preserved (`TEST-baseline-preserved`)
  Covers: data-relationship attribute; icon rendering; SmartLink href resolution; cross-project full rendering
  File: `src/components/Badge/RelationshipBadge.test.tsx`
  Cases: the non-elision assertions from the current suite (data-relationship, icons, href `/prj/TEST/ticket/TEST-100`, cross-project full code) remain green.

### e2e

- Board relationship badge smoke (`TEST-board-relationship-e2e`)
  Covers: visual confirmation on the board
  File: existing board E2E (grep for relationship badge selectors)
  Note: only update selectors/assertions if a current test asserts the old `VOC-030, VOC-005,...` inline form. If none exists, add a minimal smoke test that a card with >3 related tickets renders a `+N` trigger.

### manual

- Open a board card with 5+ same-project related tickets; confirm `🔗 030, 005, 035 +2`, popover contents, and per-link hover tooltips.
- Confirm cross-project link keeps full code in both board and viewer.
- Confirm viewer shows full codes with no `+N`.
- Confirm keyboard: Tab to `+N`, Enter opens, Tab cycles popover links, Escape closes and returns focus.

## Coverage Matrix

| Scenario | Test ID |
|---|---|
| S1 same-project elision | TEST-elide-link-key, TEST-compact-inline, TEST-per-link-title |
| S2 cross-project full | TEST-elide-link-key, TEST-per-link-title, TEST-baseline-preserved |
| S3 mixed | TEST-elide-link-key, TEST-compact-inline |
| S4 multi-digit | TEST-elide-link-key |
| S5 at-limit no trigger | TEST-compact-inline |
| S6 over-limit collapse | TEST-overflow-closed |
| S7 popover reveals | TEST-popover |
| S8 popover closes | TEST-popover |
| S9 link click isolated | TEST-click-stop-propagation |
| S10 trigger click isolated | TEST-click-stop-propagation |
| S11 viewer full mode | TEST-full-mode |
| S12 empty array | TEST-baseline-preserved (no render when empty — already covered by TicketAttributeTags gating) |
| S13 malformed fallback | TEST-elide-link-key |
