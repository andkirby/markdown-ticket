# MDT-129 Test Plan

## Overview

**Ticket**: MDT-129 - Redesign project selector launcher panel
**Test Type**: E2E + Unit Tests
**Rationale**: Frontend UI covered by E2E, backend logic covered by unit tests

## Test Strategy

### E2E Tests (Frontend UI)

MDT-129 frontend is a **presentation layer** tested via Playwright E2E:
- Visual rendering (active card, inactive cards, launcher)
- User interactions (click to select, open panel, close panel)
- Responsive behavior (mobile viewport)
- Edge cases (long titles, missing descriptions, single project)

### Unit Tests (Backend Logic)

Backend logic requires unit tests for:
- **Ordering functions** - Pure sorting logic for rail/panel
- **API endpoint** - `/api/config/selector` config delivery
- **Config parsing** - TOML and JSON validation with fallbacks
- **State validation** - Graceful handling of invalid data

## E2E Test Coverage

### Files

| File | Scenarios | Status |
|------|-----------|--------|
| `MDT-129-rail.spec.ts` | 8 | ✅ Complete |
| `MDT-129-panel.spec.ts` | 8 | ✅ Complete |
| `MDT-129-edge-cases.spec.ts` | 6 | ✅ Complete |
| **Total** | **22** | ✅ |

### Coverage by Requirement

| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| BR-1.1 Active larger card | rail.spec.ts | ✅ |
| BR-1.2 Favorite indicator | rail.spec.ts | ✅ |
| BR-1.3 Active always visible | rail.spec.ts | ✅ |
| BR-2.1 Compact inactive cards | rail.spec.ts | ✅ |
| BR-3.1 Single launcher | rail.spec.ts | ✅ |
| BR-3.2 Panel opens below | panel.spec.ts | ✅ |
| BR-3.3 Acclaim icon | rail.spec.ts | ✅ |
| BR-4.1 Panel shows all projects | panel.spec.ts | ✅ |
| BR-4.2 Favorite in panel | panel.spec.ts | ✅ |
| BR-4.3 Favorites first | panel.spec.ts | ✅ |
| BR-5.1 Select from rail | panel.spec.ts | ✅ |
| BR-5.2 Select from panel | panel.spec.ts | ✅ |
| BR-6.1 Active first | rail.spec.ts | ✅ |
| BR-6.2 Favorites before non-favorites | rail.spec.ts | ✅ |
| BR-7.3 Config fallback | edge-cases.spec.ts | ✅ |
| BR-9.1 Mobile active + launcher | edge-cases.spec.ts | ✅ |
| BR-9.2 Mobile panel access | edge-cases.spec.ts | ✅ |
| Edge-1 Long titles | edge-cases.spec.ts | ✅ |
| Edge-2 Fewer projects than visible | edge-cases.spec.ts | ✅ |
| Edge-3 No favorite spacing | edge-cases.spec.ts | ✅ |

## Unit Test Coverage

### Files

| File | Tests | Focus |
|------|-------|-------|
| `src/utils/selectorOrdering.test.ts` | 15 | BR-6 ordering logic |
| `server/tests/api/selector.test.ts` | 20 | BR-7, BR-8, BR-10 API + validation |
| **Total** | **35** | |

### Coverage by Requirement

| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| BR-6.1 Active project first | selectorOrdering.test.ts | ✅ |
| BR-6.2 Favorites before non-favorites | selectorOrdering.test.ts | ✅ |
| BR-6.3 Favorite ordering by count | selectorOrdering.test.ts | ✅ |
| BR-6.4 Non-favorite ordering by recency | selectorOrdering.test.ts | ✅ |
| BR-7.1 visibleCount from config | selector.test.ts | ✅ |
| BR-7.2 compactInactive from config | selector.test.ts | ✅ |
| BR-7.3 Config fallback defaults | selector.test.ts | ✅ |
| BR-7.4 Invalid visibleCount fallback | selector.test.ts | ✅ |
| BR-7.5 Invalid compactInactive fallback | selector.test.ts | ✅ |
| BR-8.5 Missing state initializes empty | selector.test.ts | ✅ |
| BR-8.6 Invalid JSON fallback | selector.test.ts | ✅ |
| BR-8.7 Partially malformed entries | selector.test.ts | ✅ |
| BR-10.1 Invalid visibleCount validation | selector.test.ts | ✅ |
| BR-10.2 Invalid compactInactive validation | selector.test.ts | ✅ |
| BR-10.3 Invalid favorite field | selector.test.ts | ✅ |
| BR-10.4 Invalid lastUsedAt field | selector.test.ts | ✅ |
| BR-10.5 Invalid count field | selector.test.ts | ✅ |
| BR-10.6 Unknown fields ignored | selector.test.ts | ✅ |
| BR-10.7 Invalid entries dropped | selector.test.ts | ✅ |

### Unit Test Details

#### `src/utils/selectorOrdering.test.ts`

Pure function tests for ordering logic:

```typescript
// Test structure (placeholder until implementation)
describe('BR-6.1: Active project appears first', () => {
  it('places active project at position 0 regardless of favorite status')
  it('ensures active project is visible even when it would not rank in top N')
})

describe('BR-6.2: Favorites before non-favorites', () => {
  it('orders all favorites before any non-favorite (after active)')
})

describe('BR-6.3: Favorite ordering by count desc, lastUsedAt desc', () => {
  it('sorts favorites by count descending as primary sort key')
  it('uses lastUsedAt descending as tie-breaker when counts are equal')
  it('handles null lastUsedAt (treats as never used, sorts last)')
})

describe('BR-6.4: Non-favorite ordering by lastUsedAt desc, count desc', () => {
  it('sorts non-favorites by lastUsedAt descending as primary sort key')
  it('uses count descending as tie-breaker when lastUsedAt is equal')
  it('handles null lastUsedAt (treats as never used, sorts last)')
})

describe('Edge cases', () => {
  it('handles empty projects array')
  it('handles single project (which is active)')
  it('handles visibleCount larger than project count')
  it('handles visibleCount of 1 (only active visible)')
})
```

#### `server/tests/api/selector.test.ts`

Integration tests for `/api/config/selector` endpoint:

```typescript
describe('BR-7.3: Fallback to defaults when config missing', () => {
  it('returns default preferences when user.toml does not exist')
})

describe('BR-7.1, BR-7.2: Load preferences from user.toml', () => {
  it('returns visibleCount from user.toml')
  it('returns compactInactive from user.toml')
  it('returns both preferences when both are set')
})

describe('BR-7.4, BR-7.5: Invalid config fallbacks', () => {
  it('falls back to default visibleCount when value is not integer')
  it('falls back to default visibleCount when value is negative')
  it('falls back to default visibleCount when value is zero')
  it('falls back to default compactInactive when value is not boolean')
})

describe('BR-8.5, BR-8.6: Selector state loading', () => {
  it('returns empty state when project-selector.json does not exist')
  it('returns selector state from project-selector.json')
  it('falls back to empty state when JSON is invalid')
})

describe('BR-10.x: Validation and error handling', () => {
  it('drops invalid entries but keeps valid ones')
  it('handles non-boolean favorite field (treats as false)')
  it('handles invalid lastUsedAt (drops field)')
  it('handles non-integer count (treats as 0)')
  it('handles negative count (treats as 0)')
  it('ignores unknown fields in user.toml')
  it('ignores unknown fields in project-selector.json')
})
```

## Running Tests

### E2E Tests

```bash
# Run all MDT-129 E2E tests
npm run test:e2e -- tests/e2e/selector/MDT-129*.spec.ts

# Run specific test file
npm run test:e2e -- tests/e2e/selector/MDT-129-rail.spec.ts
npm run test:e2e -- tests/e2e/selector/MDT-129-panel.spec.ts
npm run test:e2e -- tests/e2e/selector/MDT-129-edge-cases.spec.ts

# Run with visible browser
npx playwright test tests/e2e/selector/MDT-129*.spec.ts --headed
```

### Unit Tests

```bash
# Run ordering logic tests
npm test -- src/utils/selectorOrdering.test.ts

# Run API tests
cd server && npm test -- tests/api/selector.test.ts

# Run all MDT-129 unit tests
npm test -- --testPathPattern="selectorOrdering|selector.test"
```

## Test Status

### E2E Tests
- **Phase**: RED (tests fail until implementation exists)
- **Expected**: All 22 tests fail (components don't exist yet)
- **After Implementation**: All 22 tests should pass

### Unit Tests
- **Phase**: RED (tests fail until implementation exists)
- **Expected**: All 35 tests fail (functions don't exist yet)
- **After Implementation**: All 35 tests should pass

## Required data-testid Attributes

Implementation must add these test IDs:

| Component | testid |
|-----------|--------|
| SelectorRail | `selector-rail` |
| ActiveProjectCard | `selector-active-project-card` |
| ActiveProjectCode | `active-project-code` |
| ActiveProjectTitle | `active-project-title` |
| InactiveProjectCard | `selector-inactive-project-card-{CODE}` |
| InactiveProjectCode | `inactive-project-code` |
| Launcher | `selector-launcher` |
| LauncherIcon | `launcher-acclaim-icon` |
| SelectorPanel | `selector-panel` |
| PanelProjectCard | `panel-project-card` |
| PanelProjectCard (specific) | `panel-project-card-{CODE}` |
| PanelProjectCode | `panel-project-code` |
| PanelProjectTitle | `panel-project-title` |
| PanelProjectDescription | `panel-project-description` |
| KanbanBoard | `kanban-board` |
| ProjectName | `project-name` |
