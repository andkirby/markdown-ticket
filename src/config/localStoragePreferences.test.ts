import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  getDocumentSortPreferences,
  setDocumentSortPreferences,
} from './documentSorting'
import {
  readLocalStoragePreference,
  writeLocalStoragePreference,
} from './localStoragePreferences'
import { getTocState } from './tocConfig'

function createMockLocalStorage() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

const localStorageMock = createMockLocalStorage()
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalConsoleWarn = console.warn

function installMockLocalStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}

describe('localStoragePreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    console.warn = () => {}
    installMockLocalStorage()
  })

  afterEach(() => {
    console.warn = originalConsoleWarn

    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    }
    else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('returns the default value when the key is missing', () => {
    const result = readLocalStoragePreference('missing-key', { enabled: true })

    expect(result).toEqual({ enabled: true })
  })

  it('returns the default value when stored JSON is invalid', () => {
    localStorageMock.setItem('bad-json', '{')

    const result = readLocalStoragePreference('bad-json', { enabled: true })

    expect(result).toEqual({ enabled: true })
  })

  it('returns the default value when localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('localStorage unavailable')
      },
    })

    const result = readLocalStoragePreference('any-key', { enabled: true })

    expect(result).toEqual({ enabled: true })
  })

  it('writes JSON values to localStorage', () => {
    writeLocalStoragePreference('stored-key', { enabled: false })

    expect(localStorageMock.getItem('stored-key')).toBe('{"enabled":false}')
  })
})

describe('migrated browser preference config', () => {
  beforeEach(() => {
    localStorageMock.clear()
    console.warn = () => {}
    installMockLocalStorage()
  })

  afterEach(() => {
    console.warn = originalConsoleWarn

    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    }
    else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('tocConfig reads existing markdown-ticket-toc-document values', () => {
    localStorageMock.setItem('markdown-ticket-toc-document', '{"isExpanded":false}')

    expect(getTocState('document')).toEqual({ isExpanded: false })
  })

  it('documentSorting keeps preferences isolated by project id', () => {
    setDocumentSortPreferences('project-a', {
      sortBy: 'modified',
      sortDirection: 'desc',
    })
    setDocumentSortPreferences('project-b', {
      sortBy: 'title',
      sortDirection: 'asc',
    })

    expect(getDocumentSortPreferences('project-a')).toEqual({
      sortBy: 'modified',
      sortDirection: 'desc',
    })
    expect(getDocumentSortPreferences('project-b')).toEqual({
      sortBy: 'title',
      sortDirection: 'asc',
    })
  })
})
