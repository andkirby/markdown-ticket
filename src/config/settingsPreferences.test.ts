import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  getMarkdownDensity,
  getMarkdownDensityClass,
  MARKDOWN_DENSITY_KEY,
  setMarkdownDensityPreference,
} from './settingsPreferences'

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

describe('settingsPreferences markdown density', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    }

    localStorage.clear()
  })

  it('defaults to compact when storage is missing', () => {
    expect(getMarkdownDensity()).toBe('compact')
    expect(getMarkdownDensityClass()).toBe('prose--density-compact')
  })

  it('persists valid markdown density values', () => {
    setMarkdownDensityPreference('comfortable')

    expect(localStorage.getItem(MARKDOWN_DENSITY_KEY)).toBe('comfortable')
    expect(getMarkdownDensity()).toBe('comfortable')
    expect(getMarkdownDensityClass()).toBe('prose--density-comfortable')
  })

  it('falls back to compact when storage has an invalid value', () => {
    localStorage.setItem(MARKDOWN_DENSITY_KEY, 'huge')

    expect(getMarkdownDensity()).toBe('compact')
  })

  it('falls back to compact when localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('localStorage unavailable')
      },
    })

    expect(getMarkdownDensity()).toBe('compact')
  })
})
