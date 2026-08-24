# Review: MDT-236

## Changed code
- `src/components/ui/table.tsx` — vendored Table: `text-sm`→`var(--fs-md)`, `px-4`/`p-4`→`var(--pad-x)`/`var(--pad-y)`; header content-following (`calc(var(--pad-y)*0.6)`, SIZE text).
- `src/components/DocumentsView/FileTree.tsx` — tree rows: density text + `calc(var(--pad-y)*0.6)` padding (24px floor at tight·compact); meta line clamped to 11px floor.
- `src/components/QuickSearch/quick-search.css` — result rows: `var(--fs-md)` text, `calc(var(--pad-y)*0.6) var(--pad-x)` padding; meta clamped. Scope bar/hints (chrome) untouched.
- `src/components/ProjectSelector/project-selector.css` — browser-panel cards (content): density padding + SIZE text (code `--fs-md`, title/desc clamped `--fs-xs`); rail card + chips (chrome) explicitly reset to static chrome sizing (`--fs-ui-sm`/`--fs-ui-xs`, fixed padding) — corrected from architecture draft after reading the code (rail is fixed `h-9` header furniture).
- `src/components/TicketAttributes.tsx` — dt/dd/h4 → `var(--fs-md)`; xs meta → clamped `--fs-xs`.
- `src/components/TicketCard/ticket.css`, `src/components/PinRail/pin-rail.css` — `--fs-xs` consumers wrapped in `clamp(11px, …, 2rem)` (user-approved floor; compact cards now 11px, was 10px).
- `src/styles/design-tokens.css` — density slots documented surface-agnostic + clamp-floor rule (no value changes).
- `src/THEME.md`, `src/styleguide.html` — surface inventory, floor rule, density-aware surface list.
- Tests: `tests/e2e/density/surfaces.spec.ts` (new, 7 tests), `tests/e2e/utils/selectors.ts` (densitySelectors).
- Baseline repairs (pre-existing failures): `src/utils/sorting(.test).ts` eslint --fix; `src/hooks/usePinRailPref.ts` state-var rename (naming-convention lint).

## Gates
- Build/typecheck: PASS (`bun run build` 7.4s; `validate:ts` 1/1 projects pass; density utilities verified present in built CSS)
- Tests: density spec 7/7 PASS; list/board 28 passed, 4 failed = pre-existing board flake (verified identical on stashed pre-change tree); frontend units: 834 pass / 85 fail — identical count on pre-change tree (environment-wide, not this CR)
- Lint/static: frontend PASS; `lint:domain` FAILS pre-existing on committed `domain-contracts` test files (no local changes; out of scope)
- Docs/other: token purity grep — one raw hit `documents-view.css:335` (`1.25rem` path-selector modal title) = chrome, pre-existing, not a newly density-aware surface; recorded as deferred debt

## Post-review amendment (user direction)
- Cut the duplicate density selects ("Card Size"/"Card Space") from Settings — the header DensityMenu now solely owns the two-axis prefs (one concept, one owner). SettingsModal test updated to assert absence; density spec still 7/7.
- Reaffirmed chrome immunity as the principle: density is a content-reading preference; scaling chrome = zoom (browser zoom already exists) and breaks h-9 header alignment + the chrome type scale. Documents left panel (tree/favs/recent) is content and DOES scale; its toolbar does not. A global "UI scale" axis would be the honest mechanism if full-app scaling is ever wanted — separate feature.

## Known trade-offs / deferred
- Path-selector modal title raw `1.25rem` (chrome heading; needs a chrome heading token — separate debt).
- FileTree indent uses inline `${level*16+8}px` (pre-existing; layout depth, not density).
- Mobile list cards inherit via TicketCard tokens (not separately probed in E2E).
- Pre-existing failures inherited, not caused: domain-contracts lint, 85 unit failures, board badge-spec flake.
- Token naming (`--fs-xs` "card" legacy names) intentionally untouched (C4 backward compat).
