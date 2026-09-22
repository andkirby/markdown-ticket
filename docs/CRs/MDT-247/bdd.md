# BDD: MDT-247

**Source**: [MDT-247](../MDT-247-status-icon-integration.md) · [requirements.md](./requirements.md)
**Generated**: 2026-09-22 · Stage: `mdt:bdd` · Mode: normal (canonical)

## Overview

Five journeys, ten scenarios, all `route=bdd` behaviors covered: key-strip status scanning (quick search, pin tooltip), badge glyph encoding (leading icon + suppression), list-view Status column (desktop + mobile), status registry coverage (one glyph per status, cross-project hits), and graceful states (unknown status absence, invalid-status rejected glyph). Status is always scannable with exactly one encoding per surface.

## Acceptance Strategy

- **Executable**: Playwright E2E — `tests/e2e/ticket/status-icons.spec.ts` (`TEST-e2e-status-icons`, 6 tests), written RED against the planned DOM contract and expected to fail until implementation. Command: `bun run test:e2e -- tests/e2e/ticket/status-icons.spec.ts`
- **Unit-closed at `mdt:tests`**: registry exhaustiveness (7 statuses → 7 distinct glyphs, BR-1.2), cross-project hit rendering with contract-shaped data (BR-1.8), Edge-1 (pin metadata absent), and the `C*` constraints (aria/title, tokens, normalization, unmapped assets, unchanged invariants, additive schema)
- Budget: 10/12 scenarios; max 2 per journey — within gate

## Test-Facing Contract Notes

The E2E suite locks this DOM contract (mirrors MDT-244's `svg[data-type]` pattern):

- strip glyph: `svg.ticket-code__status-icon[data-status="{kebab}"]` as a child of `[data-testid="ticket-code"]`, positioned between the priority glyph and the key text; absent on badge-co-rendering surfaces
- badge glyph: `svg.badge__icon[data-status="{kebab}"]` inside `.badge[data-status]`, before the label text; invalid status renders `data-status="rejected"` glyph inside `data-status="invalid"` badge colors
- kebab normalization via `formatDataAttr` (`"In Progress"` → `"in-progress"`), the same mapping badge.css already styles
- pin tooltip: `.pin-tooltip__status` block removed entirely; status rides the strip glyph

Fixtures: `simple` scenario (`crCodes[0]`= Implemented, `[1]`= In Progress, `[2]`= Proposed); invalid status seeded via `modifyTicketFile` → `status: 'In Review'`; pins seeded via `PUT /api/pins`.

## Execution Notes

- RED expectation: all 6 E2E tests fail at the two svg selectors until the registry + slots land
- Mobile suite nested under `test.describe('mobile')` with 375×667 viewport (matches `navigation/mobile-responsive.spec.ts`)
- Cross-project glyph behavior is unit-tested (contract-shaped hits) rather than E2E — the cross-project E2E harness is slower and the rendering path is shared with current-project hits through `TicketCode`

---
*Rendered by mdt:bdd via spec-trace 0.4.0*
