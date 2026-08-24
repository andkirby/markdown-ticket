# Assessment: MDT-236

## Verdict

**Recommendation**: Option 1 — Integrate As-Is (with one bounded adjustment: vendored shadcn `Table` internals)

## Feature Pressure

### Target Feature Needs
- Every content surface (list rows, documents tree/favs/recent, and other surfaces the classification marks content) must consume density-scaled tokens so SIZE/SPACE axes respond.
- Chrome surfaces must provably stay density-immune (assertable, not hoped).
- Pure-CSS `var()` consumption everywhere — the runtime token-rewrite mechanism forbids JS sizing per component.
- One classification verdict per remaining ambiguous surface, decided by rule.

### Current System Assumptions
- Density tokens (`--fs-xs`/`--fs-md`/`--pad-y`/`--pad-x`/`--radius-card`) are rewritten on `<html>` by `useCardDensity` and consumed by exactly two CSS files today: `TicketCard/ticket.css` and `PinRail/pin-rail.css` (documented card-mimic).
- Chrome already migrated to the static `--fs-ui*` scale (documents-view.css, swimlane, ViewModeSwitcher, Column, PinRail chrome, relative-timestamp, AccentColorPicker).
- List view rows are vendored shadcn `Table` components sized by Tailwind utilities (`text-sm`, `px-4`), not tokens.
- Interaction-state ramp and flush-row menu idiom are established and documented.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Token seam on `<html>` + pure CSS consumption is exactly the extension point; no ownership warping. |
| Extension Fit | Healthy | New surfaces join by changing CSS declarations to `var()` references; no new layers. |
| Dependency Fit | Healthy | Zero new packages, no runtime/tooling/config changes. |
| Verification Fit | Concerning | Density E2E asserts cards only; no computed-style assertions for list rows/documents rows, and no chrome-immunity assertion anywhere. |
| Redesign Scope | Healthy | Additive consumer migration; the only structural work is the token-mapping decision (architecture deliverable, not system redesign). |

## Mismatch Points

### List view (vendored shadcn `Table`)
- Current system assumes: vendored components keep Tailwind utility sizing; they are treated as chrome-adjacent primitives.
- Feature needs: row text/padding to scale with SIZE/SPACE.
- Mismatch: utilities (`text-sm`, `px-4`, `h-10`) are not token-driven; overriding from outside means fighting specificity.
- Adjustment required: since `Table` is vendored in-repo, convert its row/cell sizing to density-aware tokens (bounded, in-CR). This is the single bounded adjustment that keeps the verdict Option 1.
- Scope: local

### Documents view navigation rows
- Current system assumes: rows are chrome (`--fs-ui*`, per the earlier toolbar/lane-title migration).
- Feature needs: rows classified — likely content — and scaled.
- Mismatch: only the classification + token swap; toolbar stays chrome. No structural conflict.
- Adjustment required: architecture decides row classification; CSS token swap either way.
- Scope: local

### Verification surface
- Current system assumes: density verified visually on cards; E2E locks sort-menu behavior, not density.
- Feature needs: per-surface computed-style assertions + chrome-immunity assertions.
- Mismatch: new E2E required; existing selectors (`ticket-row-*`, documents testids) are reusable, so drift risk is low.
- Adjustment required: add density E2E spec in this CR's tests stage.
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none
- Testing/E2E impact: one new density E2E spec (computed styles on representative content elements + chrome invariance); extend `useCardDensity` unit tests only if mapping changes.
- Main risk introduced: a11y floor regression at compact · tight on rows with tight padding (24px target floor) — must be asserted, not eyeballed.

## Verification Gaps

- Preservation tests needed: chrome-immunity assertion (header/toolbar computed font-size unchanged across axis changes) — cheap and high-value.
- E2E/contract drift risks: none structural; `ticket-row-${code}` testids must survive row CSS migration.
- Safe-to-refactor now?: yes (typecheck green; lint baseline repaired this session — `sorting.ts`/`sorting.test.ts` import-order auto-fixed; pre-existing `usePinRailPref` warnings do not block: lint gate uses `--max-warnings 0` only on frontend — warnings are errors? No: warnings reported, gate failed only on errors; after fix, frontend lint passes).

## Recommendation

### Option 1: Integrate As-Is
Use when: token seam, preference layer, and event sync already exist and are proven; the work is consumer migration plus one vendored-component token conversion.
Architecture impact: minimal-to-bounded — architecture stage must deliver (a) the surface inventory with verdicts, (b) the token-mapping decision (reuse card-density tokens vs derived per-family tokens), (c) the shadcn-Table conversion approach, (d) chrome-immunity verification design.

### Option 2: Redesign Inline
Use when: not needed. The Table conversion is local, not a boundary redesign.

### Option 3: Redesign First
Use when: not applicable — no systemic mismatch, no dependency pressure, preservation harness (E2E selectors + bun:test units) is adequate.

**Next**: `mdt:architecture MDT-236`
