# UAT Refinement Brief

## Objective

Give the swimlane board a deep-linkable `/epics` URL (like List has `/list`), fix the orphaned "Default View" setting and add Epics to it, and standardize the ViewModeSwitcher button/icon sizing via tokens + the styleguide.

## Approved Changes

1. **`/epics` deep-link route**: swimlanes gets its own URL segment (`/prj/:code/epics`), mirroring `/list`. The board layout is derived from the URL at render time (no racing effect). Toggling Epics navigates to `/epics`; toggling Board returns to the bare path.
2. **Epics label**: the ViewModeSwitcher swimlanes button is labeled "Epics" (matches the route + domain noun).
3. **Default View fix + Epics option**: the previously orphaned `getDefaultView()` preference now drives the bare-project-path landing redirect. Settings → Default View offers Board, Epics, List. The switcher keeps it in sync (last-used view = landing view).
4. **Control-size token**: new `--sz-control: 32px` token for square icon-button hit targets; ViewModeSwitcher buttons now use `var(--sz-control)` (was hardcoded 30×28px).
5. **Icon-size token adoption**: ViewModeSwitcher glyphs now use `var(--sz-icon)` = 16px (was hardcoded 14px). The CSS rule on `.view-mode-switcher__button svg` is the token source of truth.
6. **Styleguide**: `--sz-control` documented in the density-slots section.

## Changed Requirement IDs

- `BR-1.1` — refined: Epics selection navigates to the deep-linkable `/epics` route.
- `BR-1.3` — **new** behavior: the bare project path redirects to the chosen Default View.
- `C7` — **new** constraint: icon-button controls use `--sz-control` + `--sz-icon` tokens, not hardcoded px.
- `epics_route_is_deep_linkable`, `default_view_drives_landing` — **new** BDD scenarios.

## Affected Downstream Trace

- **requirements** — BR-1.1 refined; BR-1.3 + C7 added; validated + rendered.
- **bdd** — two new scenarios; validated + rendered.
- **architecture** — new artifacts (ART-routes, ART-settings-preferences, ART-settings-modal, ART-design-tokens); OBL-board-mode-owner refined; OBL-default-view added; OBL-semantic-css covers C7; validated + rendered.
- **tests** — TEST-swimlane-board-e2e extended to cover BR-1.1/BR-1.3/C7; validated + rendered.
- **tasks** — TASK-2 owns the new artifacts + scenarios; validated + rendered.

## Execution Slices

### Slice 1: `/epics` route + Default View fix + switcher standardization (TDD)

- **Objective**: URL-back the swimlane layout, make Default View authoritative, tokenize control sizing.
- **Direct artifacts/files**:
  - `src/routes.ts` (ROUTE_PROJECT_EPICS + buildProjectPath 'epics')
  - `src/App.tsx` (route registration, URL-derived `effectiveBoardLayoutMode`, handleViewModeChange → /epics, landing redirect via getDefaultView, ticket round-trip ?view=epics)
  - `src/config/settingsPreferences.ts` (DefaultView += 'epics')
  - `src/components/SettingsModal.tsx` (Epics option)
  - `src/components/ViewModeSwitcher/ViewModeSwitcher.tsx` (Epics label, --sz-icon glyph)
  - `src/components/ViewModeSwitcher/view-mode-switcher.css` (--sz-control box, --sz-icon glyph, tray height)
  - `src/styles/design-tokens.css` (--sz-control: 32px)
  - `src/styleguide.html` (--sz-control slot)
  - tests: routes.test.ts, ViewModeSwitcher.test.tsx, SettingsModal.test.tsx, swimlane-board.spec.ts
- **Direct GREEN targets**:
  - routes.test.ts (buildProjectPath 'epics'), ViewModeSwitcher.test.tsx (Epics label), SettingsModal.test.tsx (Epics option)
  - `epics_route_is_deep_linkable`, `default_view_drives_landing` → swimlane-board.spec.ts
- **Impacted canonical task IDs**: `TASK-2`.
- **Why**: swimlanes was a localStorage-only layout with no URL; Default View was write-only; switcher sizing was magic numbers.

## Validation

```bash
bun run fe:test
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run validate:ts src/App.tsx src/routes.ts
spec-trace validate MDT-206 --stage all
```

All green at completion: 868/868 frontend, 9/9 swimlane E2E, all trace stages valid.

## Watchlist

- The stale `tests/e2e/navigation/view-mode-switcher.spec.ts` references the old single-toggle (`board-list-toggle`) that no longer exists — pre-existing breakage, flagged but not fixed in this round.
- `effectiveBoardLayoutMode` is derived at render time (URL-driven for /epics, persisted pref otherwise). The `boardLayoutMode` state + `setBoardLayoutMode` are still used for the flat/swimlanes toggle writes; the render-time derivation is the single read path into Board/switcher.

## Prior rounds

- Round 1 (lane-label restructure + scroll model) and round 2 (collapse approach) are recorded in CR §8.

## Open Decisions

None.
