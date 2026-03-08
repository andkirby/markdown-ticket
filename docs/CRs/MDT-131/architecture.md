# Architecture

## Rationale

## Technologies

- **React 18+** - Functional components with hooks
- **TypeScript** - Type safety
- **TailwindCSS** - Styling with responsive utilities
- **Original design assets** - Icons from `/icon_board_col_64.webp`, `/icon_list_64.webp`, `/icon_docs_64.webp` (NOT lucide-react or other icon libraries)
- **next-themes** - Theme management (useTheme hook)
- **React Router** - Navigation/routing

## Icon Preservation Policy

The Board|List toggle MUST use the original webp image files, not icon library components. This preserves the existing visual design and avoids introducing new dependencies.

## Mobile Theme Toggle (BR-7.3)

### Component: MobileThemeToggle

**Location:** `src/components/MobileThemeToggle.tsx`

**Behavior:**
- **Mobile only**: Renders only when viewport width < 768px
- **Floating positioning**: Fixed position in right corner of screen
- **20% transparency**: `opacity: 0.2` for minimal visual intrusion
- **Hover state**: Opacity increases to 1.0 on hover for better UX
- **Toggle action**: Clicking switches between dark/light theme

**Rationale:**
- Floating button provides immediate access without opening hamburger menu
- 20% transparency is unobtrusive but discoverable
- Right corner placement avoids conflict with other mobile UI elements
- Separate from desktop theme toggle in main navigation

**Integration:**
```typescript
// App.tsx
import { MobileThemeToggle } from './components/MobileThemeToggle'

// Conditionally render based on viewport
<MobileThemeToggle />
```

**Styles:**
- Position: `fixed`
- Right: `16px` or `1rem`
- Top: `80px` (below header) or `16px` from top
- Opacity: `0.2` → `1.0` on hover
- Transition: `opacity 150ms ease-in-out`
- Z-index: High enough to stay above content

## Obligations

- Hamburger Menu Theme Controls (`OBL-hamburger-theme-controls`)
  Derived From: `BR-7.3`
  Artifacts: `ART-button-group`, `ART-button-group-separator`, `ART-hamburger-menu`
- Hover Overlay Implementation (`OBL-hover-overlay`)
  Derived From: `BR-2.1`, `BR-2.2`, `C1`, `C2`
  Artifacts: `ART-board-list-toggle`
- Integration and Quality (`OBL-integration`)
  Derived From: `C4`, `C5`
  Artifacts: `ART-view-mode-switcher-index`, `ART-view-mode-switcher-component`, `ART-board-list-toggle`, `ART-use-view-mode-persistence`, `ART-view-mode-types`, `ART-app-header-index`, `ART-mobile-logo`, `ART-hamburger-menu`, `ART-app-modified`, `ART-project-view-modified`
- Mobile List View Cards (`OBL-mobile-cards`)
  Derived From: `BR-9.1`, `BR-9.2`
  Artifacts: `ART-project-view-modified`
- Mobile Header Components (`OBL-mobile-header`)
  Derived From: `BR-7.1`, `BR-7.2`, `BR-7.3`
  Artifacts: `ART-app-header-index`, `ART-mobile-logo`, `ART-hamburger-menu`, `ART-mobile-logo-asset`, `ART-app-modified`
- View Mode Persistence (`OBL-persistence`)
  Derived From: `BR-4`, `BR-5`, `Edge-1`, `Edge-2`
  Artifacts: `ART-use-view-mode-persistence`, `ART-app-modified`
- Responsive Navigation Buttons (`OBL-responsive-navigation`)
  Derived From: `BR-6.1`, `BR-6.2`, `C6`
  Artifacts: `ART-view-mode-switcher-component`, `ART-app-modified`
- Toggle Navigation Behavior (`OBL-toggle-navigation`)
  Derived From: `BR-3.1`, `BR-3.2`
  Artifacts: `ART-view-mode-switcher-component`, `ART-board-list-toggle`
- View Mode Switcher UI Implementation (`OBL-view-mode-switcher-ui`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-8`, `C3`
  Artifacts: `ART-view-mode-switcher-index`, `ART-view-mode-switcher-component`, `ART-view-mode-types`, `ART-app-modified`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-app-header-index` | `src/components/AppHeader/index.tsx` | runtime | `OBL-integration`, `OBL-mobile-header` |
| `ART-app-modified` | `src/App.tsx` | runtime | `OBL-integration`, `OBL-mobile-header`, `OBL-persistence`, `OBL-responsive-navigation`, `OBL-view-mode-switcher-ui` |
| `ART-board-list-toggle` | `src/components/ViewModeSwitcher/BoardListToggle.tsx` | runtime | `OBL-hover-overlay`, `OBL-integration`, `OBL-toggle-navigation` |
| `ART-button-group` | `src/components/UI/button-group.tsx` | runtime | `OBL-hamburger-theme-controls` |
| `ART-button-group-separator` | `src/components/UI/separator.tsx` | runtime | `OBL-hamburger-theme-controls` |
| `ART-hamburger-menu` | `src/components/AppHeader/HamburgerMenu.tsx` | runtime | `OBL-hamburger-theme-controls`, `OBL-integration`, `OBL-mobile-header` |
| `ART-mobile-logo` | `src/components/AppHeader/MobileLogo.tsx` | runtime | `OBL-integration`, `OBL-mobile-header` |
| `ART-mobile-logo-asset` | `designs/logo-mdt-m-dark_64x64.png` | runtime | `OBL-mobile-header` |
| `ART-project-view-modified` | `src/components/ProjectView.tsx` | runtime | `OBL-integration`, `OBL-mobile-cards` |
| `ART-use-view-mode-persistence` | `src/components/ViewModeSwitcher/useViewModePersistence.ts` | runtime | `OBL-integration`, `OBL-persistence` |
| `ART-view-mode-switcher-component` | `src/components/ViewModeSwitcher/ViewModeSwitcher.tsx` | runtime | `OBL-integration`, `OBL-responsive-navigation`, `OBL-toggle-navigation`, `OBL-view-mode-switcher-ui` |
| `ART-view-mode-switcher-index` | `src/components/ViewModeSwitcher/index.tsx` | runtime | `OBL-integration`, `OBL-view-mode-switcher-ui` |
| `ART-view-mode-types` | `src/components/ViewModeSwitcher/types.ts` | runtime | `OBL-integration`, `OBL-view-mode-switcher-ui` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1.1` | 1 | `OBL-view-mode-switcher-ui` |
| `BR-1.2` | 1 | `OBL-view-mode-switcher-ui` |
| `BR-1.3` | 1 | `OBL-view-mode-switcher-ui` |
| `BR-2.1` | 1 | `OBL-hover-overlay` |
| `BR-2.2` | 1 | `OBL-hover-overlay` |
| `BR-3.1` | 1 | `OBL-toggle-navigation` |
| `BR-3.2` | 1 | `OBL-toggle-navigation` |
| `BR-4` | 1 | `OBL-persistence` |
| `BR-5` | 1 | `OBL-persistence` |
| `BR-6.1` | 1 | `OBL-responsive-navigation` |
| `BR-6.2` | 1 | `OBL-responsive-navigation` |
| `BR-7.1` | 1 | `OBL-mobile-header` |
| `BR-7.2` | 1 | `OBL-mobile-header` |
| `BR-7.3` | 2 | `OBL-hamburger-theme-controls`, `OBL-mobile-header` |
| `BR-8` | 1 | `OBL-view-mode-switcher-ui` |
| `BR-9.1` | 1 | `OBL-mobile-cards` |
| `BR-9.2` | 1 | `OBL-mobile-cards` |
| `C1` | 1 | `OBL-hover-overlay` |
| `C2` | 1 | `OBL-hover-overlay` |
| `C3` | 1 | `OBL-view-mode-switcher-ui` |
| `C4` | 1 | `OBL-integration` |
| `C5` | 1 | `OBL-integration` |
| `C6` | 1 | `OBL-responsive-navigation` |
| `Edge-1` | 1 | `OBL-persistence` |
| `Edge-2` | 1 | `OBL-persistence` |
