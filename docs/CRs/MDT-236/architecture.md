# Architecture: MDT-236 — Extend density system to all surfaces

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)

## Overview

One two-axis density system, one token set, every content surface. The existing runtime token rewrite on `<html>` (`useCardDensity`) is the single mechanism; this change extends **consumers only** — no new layers, no parallel tokens, no JS sizing. The architecture work is (a) a rule-derived classification of every remaining surface, (b) converting the vendored list `Table` to token-driven sizing, and (c) an E2E contract that makes chrome immunity and the a11y floor assertable instead of hoped.

Pattern: **token-slot consumer migration** (same pattern as the chrome type-scale migration, inverted direction).

## Decisions

### D1 — Token mapping: consume the existing slots directly; derive with `calc()`, don't fork
The axis tokens (`--fs-xs`, `--fs-md`, `--pad-y`, `--pad-x`, `--radius-card`) are **density slots**, not "card" tokens — the card prefix is historical. Every content surface consumes them directly. A surface needing different proportions (list row height, attribute-row gaps) computes from the slots in its own CSS: `padding: calc(var(--pad-y) * 0.75) var(--pad-x)`.

Rejected: per-surface-family derived token sets (`--fs-list-md`, `--pad-docs-y`, …). That is the drift machine this CR exists to kill — N families × M surfaces of decisions, and misclassification fixes (Edge Case: token-consumption-only) stop being cheap. `calc()` keeps the derivation local to the one surface that needs it.

Naming: no token renames in this CR (backward compat, C4). THEME.md records that the density slots are surface-agnostic; a cosmetic rename is separate tech-debt.

### D2 — Surface classification inventory (the ticket's deliverable)

Rule: **content = a surface whose primary job is presenting ticket/document data; chrome = controls, navigation furniture, and containers.** Chrome verdicts are density-immune by rule, not taste.

| Surface | Verdict | Scales | Rationale |
|---------|---------|--------|-----------|
| Ticket cards (board, swimlane lanes) | content | SIZE+SPACE | already shipped |
| PinRail card-mimics | content | SIZE+SPACE | card-mimic rule, already shipped |
| List view rows (desktop table + mobile list) | content | SIZE+SPACE | primary ticket data |
| List view header row | content-following | SIZE | part of the row grid; scales with rows to preserve alignment (C3) |
| Documents nav rows (tree/favs/recent) | content | SIZE+SPACE | file/data browsing |
| Documents toolbar | chrome | — | already `--fs-ui*` |
| Ticket viewer prose (markdown) | excluded | — | separate reading-density setting (CR non-goal) |
| Ticket detail attributes (`TicketAttributes`) | content | SIZE+SPACE | ticket metadata presentation |
| QuickSearch result rows | content | SIZE+SPACE | ticket/document data |
| QuickSearch scope bar / hints / modal chrome | chrome | — | controls |
| Project selector cards/chips (browser, rail) | content | SIZE+SPACE | card-mimic rule (same as PinRail) |
| Project selector launcher/dropdown chrome | chrome | — | control |
| Settings modal rows & form controls | chrome | — | forms are chrome; vendored primitives already on chrome scale |
| Modals/dialogs as containers | chrome | — | containers; their content classifies individually |
| AppHeader, SecondaryHeader, toolbars, menus, popovers, swimlane lane headers | chrome | — | already migrated, immunity now asserted (D5) |

Modals/viewer open question (ticket §3): resolved — **reader prose stays excluded** (it has its own setting and changing it would fight that setting); **modal-contained ticket data** (e.g., attributes inside a dialog) inherits its element's classification, not the modal's.

### D3 — Vendored `ui/table.tsx`: utilities → tokens
`Table`, `TableHead`, `TableRow`, `TableCell` are vendored in-repo; convert `text-sm`/`px-4`/`h-12` sizing to density tokens (`font-size: var(--fs-md)`, `padding: … var(--pad-x)`). Because the file is ours, no specificity fight. Row testids live in `ProjectView.tsx` and don't change (C3).

### D4 — Persistence: reuse verbatim
`settingsPreferences` + `useCardDensity` + storage/events already do everything (C4). Legacy pre-two-axis mapping already shipped in `01dc2ec5`. No changes; the E2E spec pins reload persistence.

### D5 — Verification contract
New `tests/e2e/density/surfaces.spec.ts`:
- For each content surface (representative element): set SIZE compact → computed `font-size` shrinks; set SPACE tight → computed padding shrinks; axes independent (SIZE change leaves padding untouched).
- Chrome invariance: AppHeader/toolbar/menu computed `font-size` byte-identical across all axis states.
- A11y floor at compact · tight: content text ≥ 11px computed, interactive targets ≥ 24px.
- Reset returns all probes to regular · normal values.

## Module Boundaries

- `useCardDensity` (runtime driver): **unchanged** — still the only writer of axis tokens.
- `settingsPreferences` (persistence): **unchanged**.
- Surface CSS files: own their `calc()` derivations; no cross-file token reads beyond the slots.
- `THEME.md` + `styleguide.html`: own the classification inventory and live contract.

## Invariants

1. Axis tokens are written only by the density driver on the document root.
2. Content surfaces reference slots via `var()`/`calc()` only — zero raw px/rem font sizes (token-greppable).
3. Chrome references only the static `--fs-ui*` scale — never axis tokens.
4. A11y floor (C1) holds at every one of the nine combinations; it is a floor on derived values, so surface `calc()` factors must keep compact·tight ≥ 11px text and ≥ 24px targets.
5. One density control point — the header DensityMenu owns the prefs exclusively; no per-surface toggles, no Settings duplicate (removed in MDT-236 review on user direction).

## Extension Rule

A new surface classifies by the D2 rule in one line, then consumes the slots. If a verdict turns out wrong, the fix is editing that surface's CSS token references — nothing else moves (Edge Case in CR §4).

## Trade-offs & Least-Confident Decisions

- **Header row = content-following** (SIZE only): keeps grid alignment trivially; alternative (chrome header) would desynchronize header/cell padding at SPACE extremes. Low risk.
- **Settings rows = chrome**: densest setting rows at compact could be desired, but forms-on-chrome-scale matches every other dialog and keeps vendored form primitives untouched. If users ask, the fix is one CSS file (D2 rule's reversibility).
- Least confident overall: QuickSearch result **meta** rows (`text-xs` → `var(--fs-xs)` at compact = 10px) would breach the 11px floor. Resolution: meta text consumes `max(11px, var(--fs-xs))`-equivalent via `clamp()` — the floor is a CSS constraint, not a test-only wish. Same guard applies anywhere `--fs-xs` would land under 11px... note `--fs-xs` at compact is exactly 10px, which is **below** the sanctioned 11px floor. This is a real conflict: cards today already render 10px text at compact. Escalated as **Decision Needed** (see below).

## Resolved Decision (user-approved)

**Compact SIZE floor (was Decision Needed).** `--fs-xs` compact = 10px vs the 11px floor conflicted. **Approved: clamp guard everywhere** — all content text consuming `--fs-xs` uses `clamp(11px, var(--fs-xs), 2rem)` (upper bound irrelevant, only the floor bites). Compact ticket cards also become 11px (one rule, no exceptions, slight change to shipped card rendering — accepted). This is invariant 4's enforcement mechanism: the floor is CSS, not a test-only wish.
