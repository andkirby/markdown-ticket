# Test Plan

## Test Plans By Kind

### unit

- BoardListToggle Component Unit Tests (`TEST-board-list-toggle`)
  Covers: `BR-2.1`, `BR-2.2`, `BR-3.1`, `C1`, `C2`
  File: `src/components/ViewModeSwitcher/BoardListToggle.test.tsx`
- ButtonGroup Component Unit Tests (`TEST-button-group`)
  Covers: `BR-7.3`
  File: `src/components/UI/button-group.test.tsx`
- HamburgerMenu Component Unit Tests (`TEST-hamburger-menu`)
  Covers: `BR-7.3`
  File: `src/components/HamburgerMenu.test.tsx`
- MobileLogo Component Unit Tests (`TEST-mobile-logo`)
  Covers: `BR-7.2`
  File: `src/components/AppHeader/MobileLogo.test.tsx`
- useViewModePersistence Hook Unit Tests (`TEST-use-view-mode-persistence`)
  Covers: `BR-4`, `BR-5`, `Edge-1`, `Edge-2`
  File: `src/components/ViewModeSwitcher/useViewModePersistence.test.ts`

### integration

- Build and Integration Tests (`TEST-build-integration`)
  Covers: `C4`, `C5`

### e2e

- Mobile Responsive UI E2E Tests (`TEST-mobile-responsive`)
  Covers: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-9.1`, `BR-9.2`
  File: `tests/e2e/navigation/mobile-responsive.spec.ts`
- ViewModeSwitcher Component E2E Tests (`TEST-view-mode-switcher`)
  Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`, `BR-2.2`, `BR-3.1`, `BR-3.2`, `BR-6.1`, `BR-6.2`, `BR-8`, `C3`, `C4`, `C6`, `C7`
  File: `tests/e2e/navigation/view-mode-switcher.spec.ts`

## Requirement Coverage Summary

| Requirement ID | Route Policy | Direct Test Plans | Indirect Test Plans |
|---|---|---|---|
| `C1` | tests | `TEST-board-list-toggle` | - |
| `C2` | tests | `TEST-board-list-toggle` | - |
| `C3` | tests | `TEST-view-mode-switcher` | - |
| `C4` | tests | `TEST-build-integration`, `TEST-view-mode-switcher` | - |
| `C5` | tests | `TEST-build-integration` | - |
| `C6` | tests | `TEST-view-mode-switcher` | - |
| `C7` | tests | `TEST-view-mode-switcher` | - |
| `Edge-1` | tests | `TEST-use-view-mode-persistence` | - |
| `Edge-2` | tests | `TEST-use-view-mode-persistence` | - |
