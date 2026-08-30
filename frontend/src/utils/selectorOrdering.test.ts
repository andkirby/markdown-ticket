/**
 * Selector Ordering Tests (MDT-129)
 *
 * Pure function tests for project selector ordering logic.
 * Tests cover BR-6 ordering requirements:
 * - Active project always first
 * - Favorites before non-favorites
 * - Favorites sorted by count desc, lastUsedAt desc
 * - Non-favorites sorted by lastUsedAt desc, count desc
 *
 * RED phase: Tests will fail until selectorOrdering.ts is implemented.
 */

import type {
  ProjectWithSelectorState,
  SelectorPreferences,
} from './selectorOrdering'
import { describe, expect, it } from 'bun:test'
import {
  computePanelOrder,
  computeRailOrder,
} from './selectorOrdering'

describe('selectorOrdering - BR-6.1: Active project appears first', () => {
  it('places active project at position 0 regardless of favorite status', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'PROJ-A',
        name: 'Project A',
        code: 'PROJ-A',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'PROJ-B',
        name: 'Project B',
        code: 'PROJ-B',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'PROJ-A', preferences)

    expect(result[0].key).toBe('PROJ-A')
  })

  it('ensures active project is visible even when it would not rank in top N', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active Project',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      // Create many high-ranking favorites that would push active out of visible range
      ...Array.from({ length: 10 }, (_, i) => ({
        key: `FAV-${i}`,
        name: `Favorite ${i}`,
        code: `FAV-${i}`,
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100 - i,
      })),
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 5,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    // Active project should be first despite having 0 usage
    expect(result[0].key).toBe('ACTIVE')
    // And it should be visible (within visibleCount)
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(p => p.key === 'ACTIVE')).toBe(true)
  })
})

describe('selectorOrdering - BR-6.2: Favorites before non-favorites', () => {
  it('orders all favorites before any non-favorite (after active)', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active Project',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 50,
      },
      {
        key: 'FAV-1',
        name: 'Favorite 1',
        code: 'FAV-1',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 10,
      },
      {
        key: 'NON-FAV-1',
        name: 'Non-Favorite 1',
        code: 'NON-FAV-1',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 100,
      },
      {
        key: 'FAV-2',
        name: 'Favorite 2',
        code: 'FAV-2',
        favorite: true,
        lastUsedAt: '2026-03-02T00:00:00Z',
        count: 5,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    const activeIndex = result.findIndex(p => p.key === 'ACTIVE')
    const fav1Index = result.findIndex(p => p.key === 'FAV-1')
    const fav2Index = result.findIndex(p => p.key === 'FAV-2')
    const nonFav1Index = result.findIndex(p => p.key === 'NON-FAV-1')

    // Active is first
    expect(activeIndex).toBe(0)

    // All favorites come before any non-favorites
    expect(fav1Index).toBeGreaterThan(-1)
    expect(fav2Index).toBeGreaterThan(-1)
    expect(nonFav1Index).toBeGreaterThan(-1)

    if (fav1Index > -1 && nonFav1Index > -1) {
      expect(fav1Index).toBeLessThan(nonFav1Index)
    }
    if (fav2Index > -1 && nonFav1Index > -1) {
      expect(fav2Index).toBeLessThan(nonFav1Index)
    }
  })
})

describe('selectorOrdering - BR-6.3: Favorite ordering by count desc, lastUsedAt desc', () => {
  it('sorts favorites by count descending as primary sort key', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'LOW-COUNT',
        name: 'Low Count',
        code: 'LOW-COUNT',
        favorite: true,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 5,
      },
      {
        key: 'HIGH-COUNT',
        name: 'High Count',
        code: 'HIGH-COUNT',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100,
      },
      {
        key: 'MED-COUNT',
        name: 'Med Count',
        code: 'MED-COUNT',
        favorite: true,
        lastUsedAt: '2026-03-03T00:00:00Z',
        count: 50,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    const favorites = result.filter(p => p.favorite && p.key !== 'ACTIVE')
    const favoriteKeys = favorites.map(p => p.key)

    // Should be ordered by count: HIGH-COUNT (100), MED-COUNT (50), LOW-COUNT (5)
    expect(favoriteKeys[0]).toBe('HIGH-COUNT')
    expect(favoriteKeys[1]).toBe('MED-COUNT')
    expect(favoriteKeys[2]).toBe('LOW-COUNT')
  })

  it('uses lastUsedAt descending as tie-breaker when counts are equal', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'OLD-TIE',
        name: 'Old Tie',
        code: 'OLD-TIE',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 50,
      },
      {
        key: 'NEW-TIE',
        name: 'New Tie',
        code: 'NEW-TIE',
        favorite: true,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 50,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    const favorites = result.filter(p => p.favorite)
    expect(favorites[0].key).toBe('NEW-TIE')
    expect(favorites[1].key).toBe('OLD-TIE')
  })

  it('handles null lastUsedAt (treats as never used, sorts last)', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'NEVER-USED',
        name: 'Never Used',
        code: 'NEVER-USED',
        favorite: true,
        lastUsedAt: null,
        count: 50,
      },
      {
        key: 'RECENTLY-USED',
        name: 'Recently Used',
        code: 'RECENTLY-USED',
        favorite: true,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 50,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    const favorites = result.filter(p => p.favorite)
    expect(favorites[0].key).toBe('RECENTLY-USED')
    expect(favorites[1].key).toBe('NEVER-USED')
  })
})

describe('selectorOrdering - BR-6.4: Non-favorite ordering by lastUsedAt desc, count desc', () => {
  it('sorts non-favorites by lastUsedAt descending as primary sort key', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'OLD',
        name: 'Old',
        code: 'OLD',
        favorite: false,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100,
      },
      {
        key: 'RECENT',
        name: 'Recent',
        code: 'RECENT',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 10,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)
    const nonFavorites = result.filter(p => !p.favorite && p.key !== 'ACTIVE')

    // Recent should come before Old despite lower count
    expect(nonFavorites[0].key).toBe('RECENT')
    expect(nonFavorites[1].key).toBe('OLD')
  })

  it('uses count descending as tie-breaker when lastUsedAt is equal', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'LOW-COUNT',
        name: 'Low Count',
        code: 'LOW-COUNT',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 10,
      },
      {
        key: 'HIGH-COUNT',
        name: 'High Count',
        code: 'HIGH-COUNT',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 50,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)
    const nonFavorites = result.filter(p => !p.favorite && p.key !== 'ACTIVE')

    expect(nonFavorites[0].key).toBe('HIGH-COUNT')
    expect(nonFavorites[1].key).toBe('LOW-COUNT')
  })

  it('handles null lastUsedAt (treats as never used, sorts last)', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'NEVER-USED',
        name: 'Never Used',
        code: 'NEVER-USED',
        favorite: false,
        lastUsedAt: null,
        count: 100,
      },
      {
        key: 'USED',
        name: 'Used',
        code: 'USED',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 10,
      },
    ]

    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)
    const nonFavorites = result.filter(p => !p.favorite && p.key !== 'ACTIVE')

    expect(nonFavorites[0].key).toBe('USED')
    expect(nonFavorites[1].key).toBe('NEVER-USED')
  })
})

describe('selectorOrdering - Edge cases', () => {
  it('handles empty projects array', () => {
    const projects: ProjectWithSelectorState[] = []
    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    expect(result).toEqual([])
  })

  it('handles single project (which is active)', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ONLY',
        name: 'Only Project',
        code: 'ONLY',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
    ]
    const preferences: SelectorPreferences = {
      visibleCount: 7,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ONLY', preferences)

    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('ONLY')
  })

  it('handles visibleCount larger than project count', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'OTHER',
        name: 'Other',
        code: 'OTHER',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 10,
      },
    ]
    const preferences: SelectorPreferences = {
      visibleCount: 10,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    // Should return all projects, not error or duplicate
    expect(result).toHaveLength(2)
  })

  it('handles visibleCount of 1 (only active visible)', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'FAV-1',
        name: 'Favorite 1',
        code: 'FAV-1',
        favorite: true,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 100,
      },
    ]
    const preferences: SelectorPreferences = {
      visibleCount: 1,
      compactInactive: true,
    }

    const result = computeRailOrder(projects, 'ACTIVE', preferences)

    // Active project should still be visible
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('ACTIVE')
  })
})

describe('selectorOrdering - Panel ordering (BR-4.3, BR-4.4)', () => {
  it('orders panel with favorites first, then non-favorites', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 50,
      },
      {
        key: 'FAV-1',
        name: 'Favorite 1',
        code: 'FAV-1',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 10,
      },
      {
        key: 'NON-FAV-1',
        name: 'Non-Favorite 1',
        code: 'NON-FAV-1',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 100,
      },
      {
        key: 'FAV-2',
        name: 'Favorite 2',
        code: 'FAV-2',
        favorite: true,
        lastUsedAt: '2026-03-02T00:00:00Z',
        count: 5,
      },
    ]

    const result = computePanelOrder(projects, 'ACTIVE')

    // All favorites should come before non-favorites
    const lastFavoriteIndex = result.map(p => p.favorite).lastIndexOf(true)
    const firstNonFavoriteIndex = result.findIndex(p => !p.favorite && p.key !== 'ACTIVE')

    if (lastFavoriteIndex > -1 && firstNonFavoriteIndex > -1) {
      expect(lastFavoriteIndex).toBeLessThan(firstNonFavoriteIndex)
    }
  })

  it('sorts favorites in panel by count desc, lastUsedAt desc', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'LOW-COUNT',
        name: 'Low Count',
        code: 'LOW-COUNT',
        favorite: true,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 5,
      },
      {
        key: 'HIGH-COUNT',
        name: 'High Count',
        code: 'HIGH-COUNT',
        favorite: true,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100,
      },
    ]

    const result = computePanelOrder(projects, 'ACTIVE')
    const favorites = result.filter(p => p.favorite)

    expect(favorites[0].key).toBe('HIGH-COUNT')
    expect(favorites[1].key).toBe('LOW-COUNT')
  })

  it('sorts non-favorites in panel by lastUsedAt desc, count desc', () => {
    const projects: ProjectWithSelectorState[] = [
      {
        key: 'ACTIVE',
        name: 'Active',
        code: 'ACTIVE',
        favorite: false,
        lastUsedAt: null,
        count: 0,
      },
      {
        key: 'OLD',
        name: 'Old',
        code: 'OLD',
        favorite: false,
        lastUsedAt: '2026-03-01T00:00:00Z',
        count: 100,
      },
      {
        key: 'RECENT',
        name: 'Recent',
        code: 'RECENT',
        favorite: false,
        lastUsedAt: '2026-03-05T00:00:00Z',
        count: 10,
      },
    ]

    const result = computePanelOrder(projects, 'ACTIVE')
    const nonFavorites = result.filter(p => !p.favorite && p.key !== 'ACTIVE')

    expect(nonFavorites[0].key).toBe('RECENT')
    expect(nonFavorites[1].key).toBe('OLD')
  })
})
