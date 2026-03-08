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
