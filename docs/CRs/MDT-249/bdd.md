# BDD

**Source**: [MDT-249](../MDT-249-list-view-column-sorting.md)
**Generated**: 2026-09-30

## Overview

One user journey family: sorting the ticket list where the data lives. Nine scenarios across five journeys (header-click sorting, header↔dropdown sync with label alignment, columns/timestamps, status lifecycle order, view-scoped options and persistence). Canonical scenarios live in `spec-trace`; see `bdd.trace.md`.

## Acceptance Strategy

- Executable gate: `tests/e2e/list/view.spec.ts` (Playwright) — extended at the tests stage with header-click, dropdown-sync, Created-column, and status-order specs; expected RED until implementation.
- E2E file trace link (`TEST-list-view-column-sorting`) is registered by the tests stage, which owns grouping and coverage refinement — this stage registers no provisional file because no E2E file is generated here.
- Unit gates (tests stage scope): `sortTickets` status case (lifecycle order + unknown-last) and `config/sorting` per-scope read/write with stale-shape fallback (`Edge-1`, `C1`, `C4`).
- Storage assertions use the real localStorage key `markdown-ticket-sort-preferences` — never a test-only key — so the stale-flat fallback and per-scope persistence are exercised against the actual contract.

## Test-Facing Contract Notes

- Header interaction targets are the `th` cells inside `[data-testid="ticket-table"]`; the direction indicator and `aria-sort` (C3) live on those headers — `aria-sort="ascending|descending"` on the active one, absent on inactive ones.
- Existing selector contract must survive the header rewrite (C2): `ticket-table`, `ticket-row-${code}`, `sort-controls`, `sort-menu-trigger`, `sort-menu-option[data-value]`, `sort-menu-direction`.
- Dropdown sync asserts read the collapsed SortMenu state (`sort-menu-trigger` label) rather than internal component state.
- The unknown-status fixture needs a ticket whose `status` is outside the lifecycle order; the existing `simple`/`medium` scenario datasets may not include one — the tests stage must extend the fixture factory rather than mutate shared datasets for other suites.
- Mobile sort list coverage (Status in list scope) runs below `sm` where `sort-controls` is hidden and the hamburger list is the surface.
- Per-view persistence scenarios reload the page and assert both scopes from one `Record` under the single localStorage key (C1).

## Execution Notes

- Run: `bun run test:e2e -- tests/e2e/list/view.spec.ts`
- New header-click tests expected RED pre-implementation; the existing "sort changes ticket order" dropdown test must stay GREEN throughout (preservation contract, C2/C6).
- Status lifecycle assertions depend on ticket creation order in fixtures only through status values, not dates — no clock control needed; relative-time assertions for Created/Updated cells should use the fixture "now" (buildScenario) rather than wall-clock expectations.
