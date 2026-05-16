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
- `index.tsx` - Export barrel
- `MobileLogo.tsx` - Conditional logo component

**Rationale:**
- **Single Responsibility**: Header components separated
- **Mobile Logo**: Handles conditional rendering of mobile vs desktop logo

### HamburgerMenu Component (Standalone)

**Location:** `src/components/HamburgerMenu.tsx`

**Features:**
- Desktop-only by default (visible on all devices after implementation)
- Contains: Add Project, Edit Project, Clear Cache, Event History, Theme Controls
- Theme controls: ButtonGroup with 3 options (Light, Dark, System)
- Works across all viewports (used in Board, SecondaryHeader)

**Rationale:**
- **Reusability**: Used in multiple places (Board.tsx, SecondaryHeader.tsx)
- **Single Source of Truth**: Theme controls only in hamburger menu
- **Consistency**: Same menu experience across all devices

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

```text
App.tsx (state owner)
├── AppHeader/
│   ├── index.tsx (export barrel)
│   └── MobileLogo.tsx (conditional logo)
├── HamburgerMenu.tsx (standalone, all devices)
│   ├── ButtonGroup (theme controls)
│   └── Menu items (Add/Edit Project, Clear Cache, Event History)
└── ViewModeSwitcher/
    ├── ViewModeSwitcher.tsx (container)
    ├── BoardListToggle.tsx (toggle + overlay)
    └── useViewModePersistence.ts (hook)

Other components using HamburgerMenu:
├── Board.tsx (uses HamburgerMenu for project actions)
└── SecondaryHeader.tsx (uses HamburgerMenu for project actions)
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
| HamburgerMenu | Visible | Visible |
| Theme controls (in menu) | Visible | Visible |
| Theme toggle (top-right nav) | Hidden | Hidden |

### Tailwind Approach
- Use `md:` prefix for desktop-specific styles
- Default styles apply to mobile
- Example: `<div className="md:hidden">` = hidden on desktop, visible on mobile

## Integration Points

### Props Flow

```text
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
- **lucide-react** - Icons (Board, List, FileText, Menu, Sun, Moon, Monitor)
- **shadcn/ui** - ButtonGroup component for theme controls
- **next-themes** - Theme management (useTheme hook with system support)
- **React Router** - Navigation/routing

## Theme Controls Implementation

### Theme Modes

**Supported Modes:**
- `light` - Explicit light mode
- `dark` - Explicit dark mode
- `system` - Follows OS preference

### HamburgerMenu Integration

**Location:** `src/components/HamburgerMenu.tsx`

**Theme Controls:**
- ButtonGroup with 3 icon-only buttons at bottom of menu
- Sun icon → Light mode
- Moon icon → Dark mode
- Monitor icon → System mode
- ButtonGroupSeparator provides visual delimiter
- Active theme highlighted with primary color

**Implementation:**

```typescript
// In HamburgerMenu.tsx
import { ButtonGroup, ButtonGroupSeparator } from './UI/button-group'
import { Sun, Moon, Monitor } from 'lucide-react'

<ButtonGroup orientation="horizontal" className="w-full">
  <button onClick={() => setTheme('light')} className={themeMode === 'light' ? 'bg-primary' : 'bg-muted'}>
    <Sun className="h-4 w-4" />
  </button>
  <button onClick={() => setTheme('dark')} className={themeMode === 'dark' ? 'bg-primary' : 'bg-muted'}>
    <Moon className="h-4 w-4" />
  </button>
  <button onClick={() => setTheme('system')} className={themeMode === 'system' ? 'bg-primary' : 'bg-muted'}>
    <Monitor className="h-4 w-4" />
  </button>
</ButtonGroup>
```

**No Desktop Theme Toggle:**
- Removed desktop theme toggle from main navigation header
- Hamburger menu is the single source of truth for all theme controls
- Works consistently across mobile and desktop

### Theme Hook Enhancement

**Location:** `src/hooks/useTheme.ts`

**Enhancements:**
- Added `system` theme mode
- Returns both `theme` (resolved: 'light' | 'dark') and `themeMode` (user selection)
- Listens to OS preference changes via `matchMedia('(prefers-color-scheme: dark)')`
- Automatic updates when system theme changes

## Implementation Order

1. Create `ViewModeSwitcher/types.ts` (Type-safe enum)
2. Create `ViewModeSwitcher/useViewModePersistence.ts` (Hook)
3. Create `ViewModeSwitcher/BoardListToggle.tsx` (Leaf component)
4. Create `ViewModeSwitcher/ViewModeSwitcher.tsx` (Container)
5. Create `ViewModeSwitcher/index.tsx` (Export barrel)
6. Create `UI/button-group.tsx` (shadcn component)
7. Create `UI/separator.tsx` (shadcn component)
8. Enhance `hooks/useTheme.ts` (Add system mode support)
9. Enhance `components/HamburgerMenu.tsx` (Add ButtonGroup theme controls)
10. Create `AppHeader/MobileLogo.tsx` (New component)
11. Create `AppHeader/index.tsx` (Export barrel)
12. Modify `App.tsx` (Import ViewModeSwitcher, add state, remove desktop theme toggle)
13. Modify `ProjectView.tsx` (Mobile card layout)

## Validation Checklist

- [ ] Component follows Type-Safe Enum pattern
- [ ] Hook is colocated with component that uses it
- [ ] Parent component (App.tsx) owns state
- [ ] Mobile breakpoint uses Tailwind `md:` prefix
- [ ] All components have `data-testid` attributes for E2E
- [ ] Hover animation uses 150ms transition
- [ ] Overlay has `pointer-events-none` CSS property
- [ ] Theme controls use ButtonGroup component
- [ ] Theme modes: Light, Dark, System all functional
- [ ] System theme responds to OS preference changes
- [ ] Desktop theme toggle removed from main navigation
- [ ] Hamburger menu theme controls work on all devices
- [ ] TypeScript compilation succeeds
- [ ] All existing tests pass
