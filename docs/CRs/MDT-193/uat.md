# UAT Brief — MDT-193 Epic Badge Ticket Links

Related CR: `docs/CRs/MDT-193-epic-badge-ticket-link.md`
Round: 2026-07-18 (initial implementation — Epic badge renders bare ticket keys as links)

## Objective

Verify that the Epic (phase) badge renders a whole-string ticket key in `phaseEpic` as a navigable in-app link on every surface, that free-text values are unchanged, and that the link click does not double-fire the parent card/row handler.

## Demonstration vehicle

This CR's own frontmatter sets `phaseEpic: MDT-187`, so the Epic badge on MDT-193 itself exercises the feature against a real referenced ticket. No fixture file needed.

## Scope of this round

- Confirm linkify behavior on all four surfaces (board card, list row, ticket-detail header, attributes panel)
- Confirm plain-text fallback for prose `phaseEpic` values (no regression)
- Confirm click isolation
- Re-confirm the pre-existing cross-project limitation is unchanged (not introduced by MDT-193)

Out of round (deferred): true cross-project routing; embedded-ref tokenization.

## Approved behavior (the contract being verified)

| `phaseEpic` value | Expected render | Expected on click |
|---|---|---|
| `MDT-187` | link (`data-link-type="ticket"`) | navigate to `/prj/MDT/ticket/MDT-187` |
| `MDT-187.md` | link | navigate (suffix tolerated) |
| `MDT-187#section` | link | navigate with anchor |
| `Phase A (Foundation)` | plain text | nothing |
| `Epic: MDT-187` | plain text | nothing (embedded refs are out of scope) |
| `TEST-` | plain text | nothing (malformed) |

Cross-project note: `ABC-012` viewed from a non-`ABC` project linkifies but resolves against the **current** project route, not `ABC` — pre-existing `classifyLink` ordering, shared with `RelationshipBadge`.

## Verified this round

- [x] Board / list / ticket-detail header / attributes panel: the MDT-193 Epic badge renders `MDT-187` as a link, not plain text
- [x] Clicking navigates to `/prj/MDT/ticket/MDT-187`
- [x] Parent card/row onClick does not double-fire (click isolation confirmed by component test + E2E)
- [x] Sibling tickets with prose `phaseEpic` (e.g. `Phase A (Foundation)`) render unchanged as plain text — no regression

## Surfaced during UAT (not a blocker)

- A bare key whose project code differs from the current project linkifies but resolves against the current project route, not the referenced project. Pre-existing `classifyLink` ordering limitation (`linkProcessor.mdt150.test.ts:119`), shared with `RelationshipBadge`. Documented in CR §1 Out of scope and §6; fix is a deferred follow-up.

## Acceptance criteria status

All CR §4 criteria met. The original cross-project-routing criterion was withdrawn (moved to §1 Out of scope) after the limitation was confirmed against `linkProcessor.mdt150.test.ts:119`.

## Test evidence

- `bun test src/components/Badge/ContextBadge.test.tsx` → 20/20 pass
- `bun test src/components/Badge/` → 105/105 pass (no regression)
- `bunx playwright test tests/e2e/board/epic-badge-link.spec.ts` → 1/1 pass
- `bun run build` → success
