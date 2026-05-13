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
  })

  it('removes deleted or newly excluded shortcuts during tree reconciliation (Edge-1)', () => {
    const preferences = sanitizeDocumentNavigationPreferences({
      recentDocuments: ['docs/design/spec.md', 'docs/missing.md', 'docs/CRs/MDT-001.md'],
    }, ['docs/design', 'docs/design/spec.md'])

    expect(preferences.recentDocuments).toEqual(['docs/design/spec.md'])
  })
})
