# Assessment: MDT-244

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

## Feature Pressure

### Target Feature Needs
- Optional `<TypeIcon>` slot in `TicketCode.tsx` between `{code}` and the epic Zap, gated by a config flag
- Optional leading glyph inside `TypeBadge.tsx`, gated by a second config flag
- Badge-suppression precedence on surfaces where key row and badge co-render (viewer header)
- Two user-scope app-configuration selectors (`ui.ticketKey.*` in `user.toml`) registered in the declarative config model and delivered via the existing config API
- No visual/layout change when both options are off

### Current System Assumptions
- `TicketCode.tsx` is the single key-composition point (STYLING.md § Stable Scanning Patterns); every surface routes through it, so one slot addition propagates everywhere
- `TypeIcon.tsx`/`typeIcons.ts` already exist, built to the `PriorityIcon` pattern (map module + data-attribute coloring, Fast-Refresh-clean)
- Config selectors are registered in `domain-contracts/src/config-management/selectors.ts` with exposure metadata (MDT-238/MDT-168), served by the existing config API, edited through settings-owned surfaces
- User-scope selector consumers refresh via `useBackendConfig` + narrow same-browser window events; server-side SSE `config:changed` is the documented target architecture (follow-up CR, not this one)
- Badge styling keys off `data-type` attributes in `badge.css`; components carry no colors

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | The key slot is the designed seam; `TypeIcon` mirrors the established `PriorityIcon` component pattern exactly |
| Extension Fit | Healthy | Selector registration is a known extension point with two live precedents (`ui.projectSelector.*`); no new seam needed |
| Dependency Fit | Healthy | No new packages, runtimes, or endpoints; uses the existing config API and lucide-react (already shipped for the glyph set) |
| Verification Fit | Healthy | `bun:test` + testing-library harness exists for Badge components; suppression is unit-testable; layout-only assertions belong to manual/E2E per happy-dom CSS limits |
| Redesign Scope | Healthy | Local only — slot addition + two selectors; no boundary moves |

## Mismatch Points

### Config consumption inside `TicketCode`
- Current system assumes: components that need backend config use `useBackendConfig` at a page/settings level, with narrow window-event refresh for live updates
- Feature needs: a cheap shared read available to a component rendered once per card/row/search hit
- Mismatch: per-instance hook fetches would multiply config reads; no existing selector is consumed at this frequency
- Adjustment required: architecture picks the consumption seam (single hook instantiation above the render tree or an existing shared store) — bounded, inside this CR
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: two new user-scope selectors in `user.toml` (absent keys → defaults, no migration)
- Testing/E2E impact: none new; existing Badge unit harness covers the components; manual pass per ticket testing plan
- Main risk introduced: config-refresh staleness (settings change while board is open) — same limitation `ui.projectSelector.*` has today; acceptable, noted for the SSE follow-up CR

## Verification Gaps

- Preservation tests needed: none beyond the ticket's planned unit tests (current off-behavior is locked by existing Badge/TicketCode-rendering tests)
- E2E/contract drift risks: none — no API or route changes
- Safe-to-refactor now?: yes

## Recommendation

### Option 1: Integrate As-Is
Use when: structure, seams, and config model already provide every insertion point — which they do
Architecture impact: minimal; only decision needed is the config-consumption seam for `TicketCode`

### Option 2: Redesign Inline
Use when: n/a — no bounded redesign required

### Option 3: Redesign First
Use when: n/a — no systemic mismatch
Reason redesign cannot wait: n/a
Preferred path: n/a
