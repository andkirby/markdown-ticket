# Architecture

## Rationale

# Architecture Design: MDT-131

## Component Structure

### ViewModeSwitcher Component Folder

**Location:** `src/components/ViewModeSwitcher/`

**Files:**
- `index.tsx` - Export barrel for clean imports
- `ViewModeSwitcher.tsx` - Container component composing BoardListToggle and Documents button
- `BoardListToggle.tsx` - Pure toggle with hover overlay
- `useViewModePersistence.ts` - Custom hook for localStorage management
- `types.ts` - Type-safe enum for ViewMode

**Rationale:**
- **Justifies folder promotion**: 5 files exceeds 1-3 file single-file threshold
- **Flat structure**: No unnecessary nesting (hooks/ or utils/ subfolders not needed yet)
- **Ownership**: Deleting this folder breaks nothing outside
- **Colocation**: Hook lives with component that uses it

### AppHeader Component Folder (New)

**Location:** `src/components/AppHeader/`

**Files:**
- `index.tsx` - Main AppHeader component
- `MobileLogo.tsx` - Conditional logo component
- `HamburgerMenu.tsx` - Mobile menu with theme toggle

**Rationale:**
- **Single Responsibility**: Toggle logic ≠ header layout ≠ card layout
- **Reusability**: `HamburgerMenu` may be used elsewhere
- **Testing**: Can test mobile header independently

## State Management

### Controlled Component Pattern

**Decision:** App.tsx owns `viewMode` state. ViewModeSwitcher is a controlled component.

**Rationale:**

| Approach | Testability | Reusability | Data Flow |
|----------|-------------|-------------|-----------|
| **Parent controls state** (App.tsx) | ✅ Easy to test state transitions in isolation | ✅ ViewModeSwitcher stays dumb/presentational | ✅ Single source of truth |
| Local state in ViewModeSwitcher | ❌ Hard to test edge cases (localStorage sync) | ❌ Couples component to persistence | ⚠️ State hidden from parent |

**Implementation:**
```typescript
// App.tsx
const [viewMode, setViewMode] = useState<ViewMode>('board')
const handleModeChange = (newMode: ViewMode) => {
  setViewMode(newMode)
  if (newMode !== 'documents') {
    localStorage.setItem('lastBoardListMode', newMode)
  }
}
```

## Component Composition Hierarchy

```
App.tsx (state owner)
├── AppHeader/
│   ├── AppHeader.tsx (container)
│   ├── MobileLogo.tsx (conditional)
│   └── HamburgerMenu.tsx (mobile-only)
└── ViewModeSwitcher/
    ├── ViewModeSwitcher.tsx (container)
    ├── BoardListToggle.tsx (toggle + overlay)
    └── useViewModePersistence.ts (hook)
```

## Type-Safe Enum Pattern

**Following:** `docs/PRE_IMPLEMENT.md`

```typescript
// types.ts
export const ViewMode = {
  BOARD: 'board',
  LIST: 'list',
  DOCUMENTS: 'documents',
} as const

export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode]
export const ViewModeValues = Object.values(ViewMode)
```

**Rationale:**
- Type-safe named access
- Array of values for iteration/validation
- Shared between ViewModeSwitcher and BoardListToggle

## Mobile Responsive Strategy

### Breakpoint
- **Mobile:** `< 768px` (Tailwind `md:` breakpoint)
- **Desktop:** `≥ 768px`

### Component Behavior

| Component | Desktop | Mobile |
|-----------|---------|--------|
| BoardListToggle | Visible | Visible |
| Documents button | Visible | Hidden |
| Project title | Visible | Hidden |
| Default logo | Visible | Hidden |
| Mobile logo | Hidden | Visible |
| Theme toggle (nav) | Visible | Hidden |
| Theme toggle (menu) | Hidden | Visible |

### Tailwind Approach
- Use `md:` prefix for desktop-specific styles
- Default styles apply to mobile
- Example: `<div className="md:hidden">` = hidden on desktop, visible on mobile

## Integration Points

### Props Flow

```
App.tsx → ViewModeSwitcher
  Props: { currentMode: ViewMode, onModeChange: (mode) => void }

ViewModeSwitcher → BoardListToggle
  Props: { currentMode: ViewMode, onModeChange: (mode) => void, isDocumentsView: boolean }

ViewModeSwitcher → useViewModePersistence
  Returns: { getLastBoardListMode, saveBoardListMode }
```

### Data Flow

1. **Initial Load:**
   - App.tsx reads localStorage → sets initial viewMode
   - If missing/invalid, defaults to 'board'

2. **Toggle Click:**
   - User clicks BoardListToggle
   - onModeChange called with new mode
   - App.tsx updates state
   - App.tsx saves to localStorage (if not 'documents')

3. **Navigation:**
   - URL changes handled by React Router
   - viewMode state kept in sync via useEffect

## Testing Strategy

### Unit Tests
- ViewModeSwitcher: Test with different viewMode props
- BoardListToggle: Test hover state and click handling
- useViewModePersistence: Test localStorage read/write

### Integration Tests
- App.tsx renders ViewModeSwitcher correctly
- State changes propagate through component tree

### E2E Tests
- Already written in `tests/e2e/navigation/view-mode-switcher.spec.ts`
- Already written in `tests/e2e/navigation/mobile-responsive.spec.ts`

## Technologies

- **React 18+** - Functional components with hooks
- **TypeScript** - Type safety
- **TailwindCSS** - Styling with responsive utilities
- **lucide-react** - Icons (Board, List, FileText, Menu, Sun, Moon)
- **next-themes** - Theme management (useTheme hook)
- **React Router** - Navigation/routing

## Implementation Order

1. Create `ViewModeSwitcher/types.ts` (Type-safe enum)
2. Create `ViewModeSwitcher/useViewModePersistence.ts` (Hook)
3. Create `ViewModeSwitcher/BoardListToggle.tsx` (Leaf component)
4. Create `ViewModeSwitcher/ViewModeSwitcher.tsx` (Container)
5. Create `ViewModeSwitcher/index.tsx` (Export barrel)
6. Create `AppHeader/MobileLogo.tsx` (New component)
7. Create `AppHeader/HamburgerMenu.tsx` (New component)
8. Create `AppHeader/AppHeader.tsx` (New container)
9. Create `AppHeader/index.tsx` (Export barrel)
10. Modify `App.tsx` (Import ViewModeSwitcher, add state)
11. Modify `ProjectView.tsx` (Mobile card layout)

## Validation Checklist

- [ ] Component follows Type-Safe Enum pattern
- [ ] Hook is colocated with component that uses it
- [ ] Parent component (App.tsx) owns state
- [ ] Mobile breakpoint uses Tailwind `md:` prefix
- [ ] All components have `data-testid` attributes for E2E
- [ ] Hover animation uses 150ms transition
- [ ] Overlay has `pointer-events-none` CSS property
- [ ] TypeScript compilation succeeds
- [ ] All existing tests pass

## Obligations

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
| `ART-hamburger-menu` | `src/components/AppHeader/HamburgerMenu.tsx` | runtime | `OBL-integration`, `OBL-mobile-header` |
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
| `BR-7.3` | 1 | `OBL-mobile-header` |
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
