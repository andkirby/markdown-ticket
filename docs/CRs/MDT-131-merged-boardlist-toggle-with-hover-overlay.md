---
code: MDT-131
status: Implemented
dateCreated: 2026-03-08T05:09:34.879Z
type: Feature Enhancement
priority: Medium
---

# Merged Board|List Toggle with Hover Overlay
## 1. Description


## Requirements Scope
`full` — New UX pattern with specified behavior and implementation


## Problem
- Current view switcher has 3 separate buttons (Board, List, Documents) taking up significant navigation space
- No visual preview of what alternate view looks like before clicking
- Board and List views are tightly coupled as alternatives but presented as separate options
- Navigation area becomes cluttered with multiple view options
- **Mobile**: Navigation takes too much space on small screens, no responsive design
- **Mobile**: List view ticket cards not optimized for mobile width


## Affected Artifacts
- `src/App.tsx` (lines 27-119) — Current ViewModeSwitcher implementation
- `designs/logo-mdt-m-dark_64x64.png` — Mobile logo (new asset)
- Navigation header components — Mobile responsive changes


## Scope
- **Changes**: Implement merged Board|List toggle with hover overlay + separate Documents button + mobile-responsive design
- **New UX (Desktop)**: Single button shows current view, hover reveals alternate view, click toggles, Documents button visible
- **New UX (Mobile < 768px)**: Only Board|List toggle visible (Documents hidden), mobile logo, no project title, theme toggle in hamburger menu, 2-line list view cards
- **Unchanged**: localStorage persistence logic, routing logic

## Mobile Requirements (< 768px viewport)

- **Navigation**: Only Board|List toggle button visible (Documents button hidden)
- **Logo**: Use `designs/logo-mdt-m-dark_64x64.png` instead of default logo
- **Header**: Remove project title from navigation
- **Theme Toggle**: Move dark/light toggle button into hamburger menu
- **List View Cards**: 2-line layout (line 1: CR-key + badges, line 2: title at 100% width)
- **Breakpoint**: 768px (Tailwind `md:` breakpoint)

# 2. Decision

## Chosen Approach
Create merged Board|List toggle button with hover overlay that shows alternate view icon, extracted into dedicated component folder structure

## Rationale
- Reduces navigation space from 3 buttons to 2 buttons (Board|List merged + Documents)
- Provides visual preview of alternate view before committing to click
- Clearer UX: Board and List are presented as paired alternatives
- Maintains discoverability: hover action is intuitive and reveals functionality
- Preserves existing localStorage behavior for returning to last-used board/list view
- Enables cleaner component architecture with extracted sub-components
- **Mobile**: Optimizes navigation for small screens (single button vs. two)
- **Mobile**: Improves list view readability on mobile with 2-line card layout

# 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Merged Board|List toggle with hover overlay | **ACCEPTED** - Space-efficient, provides visual preview, clear UX |
| Keep 3 separate buttons | No change to current UI | Takes more navigation space, no preview before click |
| Dropdown select | Board|List in dropdown, Documents separate | Requires extra click, less discoverable, no hover preview |
| Radio button group | Traditional radio-style toggle | More space than merged button, less modern UX |

# 4. Artifact Specifications

## New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/ViewModeSwitcher/index.tsx` | Export barrel | Main component export |
| `src/components/ViewModeSwitcher/ViewModeSwitcher.tsx` | Component | Main view mode switcher composes BoardListToggle and Documents button with mobile responsiveness |
| `src/components/ViewModeSwitcher/BoardListToggle.tsx` | Component | Merged Board|List toggle with hover overlay, click-to-toggle, visual state management |
| `src/components/ViewModeSwitcher/useViewModePersistence.ts` | Hook | localStorage management for lastBoardListMode persistence |
| `src/components/ViewModeSwitcher/types.ts` | Types | ViewMode type following Type-Safe Enum pattern (docs/PRE_IMPLEMENT.md) |
| `designs/logo-mdt-m-dark_64x64.png` | Asset | Mobile-specific logo (64x64px) |
| `src/components/ProjectView.tsx` | Modified | Mobile list view card layout (2-line: badges + title) |

## Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/App.tsx` | Import added | Add `import { ViewModeSwitcher } from './components/ViewModeSwitcher'` |
| `src/App.tsx` | Code removed | Delete lines 27-119 (inline ViewModeSwitcher) |
| `src/App.tsx` | Mobile responsive | Hide Documents button on mobile, use mobile logo, move theme toggle to hamburger menu |
| `src/components/ProjectView.tsx` | Mobile layout | Update list view cards for 2-line layout on mobile (CR-key + badges, title) |

## Integration Points

| From | To | Interface |
|------|----|-----------|
| App.tsx | ViewModeSwitcher | Props: viewMode, onViewModeChange |
| ViewModeSwitcher | BoardListToggle | Props: currentMode, onModeChange, isDocumentsView |
| ViewModeSwitcher | useViewModePersistence | Returns: getLastBoardListMode, saveBoardListMode |

## Key Patterns
- Type-Safe Enum Pattern: ViewMode type definition (types.ts) following docs/PRE_IMPLEMENT.md
- Custom Hook Pattern: useViewModePersistence for localStorage side effects
- Component Composition: ViewModeSwitcher composes BoardListToggle
- Colocation: Hook lives with component that uses it

# 5. Acceptance Criteria
## Requirements Projection

> **Requirements specification**: [requirements.md](./MDT-131/requirements.md) (rendered from canonical spec-trace state)

This feature has **17 behavioral requirements**, **6 constraints**, and **2 edge cases** specified in the canonical requirements store (includes 8 mobile-specific requirements).

## Functional
- [ ] `src/components/ViewModeSwitcher/index.tsx` exports ViewModeSwitcher component
- [ ] `src/App.tsx` imports ViewModeSwitcher from new location
- [ ] `src/App.tsx` lines 27-119 are removed
- [ ] Only 2 buttons visible in desktop navigation (merged Board|List + Documents)
- [ ] Only 1 button visible in mobile navigation (merged Board|List only, Documents hidden at < 768px)
- [ ] Mobile breakpoint: 768px (Tailwind `md:`)
- [ ] Board|List button shows icon of current view (Board or List)
- [ ] Hovering Board|List button shows overlay with alternate view icon
- [ ] Hover overlay appears with fade-in animation (150ms)
- [ ] Hover overlay has `pointer-events-none` to allow clicks through
- [ ] Clicking Board|List button toggles between Board and List views
- [ ] In documents view, Board|List button shows last-used view with dimmed border
- [ ] In documents view, clicking Board|List returns to last board/list mode
- [ ] Documents button functions identically to current implementation
- [ ] localStorage persists lastBoardListMode across browser sessions
- [ ] Mobile: Project title hidden in navigation header
- [ ] Mobile: Logo switches to `designs/logo-mdt-m-dark_64x64.png`
- [ ] Mobile: Theme toggle button moved to hamburger menu
- [ ] Mobile list view: Ticket cards display in 2-line layout (line 1: CR-key + badges, line 2: title at 100% width)

## Non-Functional
- [ ] Hover animation is smooth (no jank)
- [ ] Overlay does not block click events (verified with pointer-events-none)
- [ ] Component follows project Type-Safe Enum pattern
- [ ] All existing tests pass
- [ ] TypeScript compilation succeeds without errors

## Testing
- Unit: Test ViewModeSwitcher with different viewMode props (board, list, documents)
- Unit: Test BoardListToggle hover state and click handling
- Unit: Test useViewModePersistence localStorage read/write
- Integration: Test App.tsx renders ViewModeSwitcher correctly
- Manual: Verify Board|List toggle works in all three views
- Manual: Verify localStorage persists across browser refresh
- Manual: Verify hover overlay appears/disappears correctly
- Manual: Mobile: Verify only Board|List button visible (< 768px viewport)
- Manual: Mobile: Verify Documents button hidden (< 768px viewport)
- Manual: Mobile: Verify mobile logo appears (< 768px viewport)
- Manual: Mobile: Verify project title hidden (< 768px viewport)
- Manual: Mobile: Verify theme toggle in hamburger menu (< 768px viewport)
- Manual: Mobile: Verify list view cards use 2-line layout (< 768px viewport)
# 6. Verification

## By CR Type
**Feature Enhancement**: New merged Board|List toggle component exists and functions correctly

## Metrics
- Desktop navigation: 3 buttons → 2 buttons (verified visually)
- Mobile navigation: 3 buttons → 1 button (verified visually at < 768px)
- Component files created: 5 files in src/components/ViewModeSwitcher/ (verified by file existence)
- Hover animation duration: 150ms (specified in CSS)
- Mobile breakpoint: 768px (Tailwind md: breakpoint)
- TypeScript compilation: No errors (verified by build)

# 7. Deployment

## Simple Changes
- No configuration changes required
- No database migrations required
- Deploy as part of normal frontend deployment
- No feature flags needed

## Deployment Steps
1. Build frontend: `bun run build`
2. Deploy built artifacts
3. Verify in production: Test Board|List toggle and Documents button functionality