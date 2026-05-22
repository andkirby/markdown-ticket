import { beforeEach, describe, expect, it } from 'bun:test'
import {
  addRecentDocument,
  getDocumentNavigationPreferences,
  sanitizeDocumentNavigationPreferences,
  setDocumentNavigationPreferences,
} from './documentNavigation'

function createMockLocalStorage() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    clear: () => store.clear(),
    removeItem: (key: string) => store.delete(key),
    get length() {
      return store.size
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
}

const localStorageMock = createMockLocalStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

describe('documentNavigation preferences (MDT-162)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('excludes docs/CRs from recent document shortcuts (C1)', () => {
    setDocumentNavigationPreferences('MDT', {
      recentDocuments: ['docs/guide.md', 'docs/CRs/MDT-999.md'],
      favsExpanded: true,
      favsShowAll: false,
      recentExpanded: true,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    })

    const preferences = getDocumentNavigationPreferences('MDT')

    expect(preferences.recentDocuments).toEqual(['docs/guide.md'])
  })

  it('keeps recent documents project-scoped and capped at five (BR-4.1)', () => {
    Array.from({ length: 7 }, (_, index) => `docs/doc-${index}.md`).forEach((path) => {
      addRecentDocument('MDT', path)
    })

    const preferences = getDocumentNavigationPreferences('MDT')

    expect(preferences.recentDocuments).toHaveLength(5)
    expect(preferences.recentDocuments[0]).toBe('docs/doc-6.md')
    expect(preferences.recentDocuments).not.toContain('docs/doc-0.md')
    expect(getDocumentNavigationPreferences('OTHER').recentDocuments).toEqual([])
  })

  it('removes deleted or newly excluded shortcuts during tree reconciliation (Edge-1)', () => {
    const preferences = sanitizeDocumentNavigationPreferences({
      recentDocuments: ['docs/design/spec.md', 'docs/missing.md', 'docs/CRs/MDT-001.md'],
      favsExpanded: false,
      favsShowAll: true,
      recentExpanded: false,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    }, ['docs/design', 'docs/design/spec.md'])

    expect(preferences.recentDocuments).toEqual(['docs/design/spec.md'])
    expect(preferences.favsExpanded).toBe(false)
    expect(preferences.favsShowAll).toBe(true)
    expect(preferences.recentExpanded).toBe(false)
  })

  it('persists Favs and Recent section state per project', () => {
    setDocumentNavigationPreferences('MDT', {
      recentDocuments: [],
      favsExpanded: false,
      favsShowAll: true,
      recentExpanded: false,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    })

    expect(getDocumentNavigationPreferences('MDT')).toEqual({
      recentDocuments: [],
      favsExpanded: false,
      favsShowAll: true,
      recentExpanded: false,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    })
    expect(getDocumentNavigationPreferences('OTHER')).toEqual({
      recentDocuments: [],
      favsExpanded: true,
      favsShowAll: false,
      recentExpanded: true,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    })
  })

  it('does not inherit legacy unscoped section state for new projects', () => {
    localStorage.setItem('markdown-ticket:documents-navigation', JSON.stringify({
      recentDocuments: ['docs/legacy.md'],
      favsExpanded: false,
      favsShowAll: true,
      recentExpanded: false,
    }))

    expect(getDocumentNavigationPreferences('MDT')).toEqual({
      recentDocuments: [],
      favsExpanded: true,
      favsShowAll: false,
      recentExpanded: true,
      navigationPanelSize: 33,
      navigationPanelCollapsed: false,
    })
  })

  it('persists and clamps document navigation panel layout', () => {
    setDocumentNavigationPreferences('MDT', {
      recentDocuments: [],
      favsExpanded: true,
      favsShowAll: false,
      recentExpanded: true,
      navigationPanelSize: 60,
      navigationPanelCollapsed: true,
    })

    expect(getDocumentNavigationPreferences('MDT')).toMatchObject({
      navigationPanelSize: 45,
      navigationPanelCollapsed: true,
    })
  })
})
