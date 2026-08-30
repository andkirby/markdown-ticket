import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  CARD_DENSITY_CHANGE_EVENT,
  setCardDensityPreference,
  setSpaceDensityPreference,
  SPACE_DENSITY_CHANGE_EVENT,
} from '../config/settingsPreferences'
import { useCardDensity } from './useCardDensity'

function Harness() {
  useCardDensity()
  return null
}

describe('useCardDensity (two-axis density system)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.style.cssText = ''
  })

  it('applies regular size + normal space tokens by default', () => {
    render(<Harness />)
    // SPACE axis
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('10px')
    expect(document.documentElement.style.getPropertyValue('--pad-x')).toBe('12px')
    // SIZE axis
    expect(document.documentElement.style.getPropertyValue('--fs-xs')).toBe('11px')
    expect(document.documentElement.style.getPropertyValue('--fs-md')).toBe('13px')
    expect(document.documentElement.style.getPropertyValue('--radius-card')).toBe('8px')
  })

  it('size axis moves text tokens without touching padding', () => {
    setCardDensityPreference('comfortable')
    render(<Harness />)
    expect(document.documentElement.style.getPropertyValue('--fs-xs')).toBe('12px')
    expect(document.documentElement.style.getPropertyValue('--fs-md')).toBe('14px')
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('10px')
  })

  it('space axis moves padding without touching text tokens', () => {
    setSpaceDensityPreference('tight')
    render(<Harness />)
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('6px')
    expect(document.documentElement.style.getPropertyValue('--pad-x')).toBe('8px')
    expect(document.documentElement.style.getPropertyValue('--fs-md')).toBe('13px')
  })

  it('axes are independent: compact size + relaxed space', () => {
    setCardDensityPreference('compact')
    setSpaceDensityPreference('relaxed')
    render(<Harness />)
    expect(document.documentElement.style.getPropertyValue('--fs-xs')).toBe('10px')
    expect(document.documentElement.style.getPropertyValue('--radius-card')).toBe('4px')
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('14px')
    expect(document.documentElement.style.getPropertyValue('--pad-x')).toBe('16px')
  })

  it('reacts to live change events after mount', () => {
    render(<Harness />)

    setCardDensityPreference('comfortable')
    window.dispatchEvent(new CustomEvent(CARD_DENSITY_CHANGE_EVENT))
    expect(document.documentElement.style.getPropertyValue('--fs-md')).toBe('14px')

    setSpaceDensityPreference('tight')
    window.dispatchEvent(new CustomEvent(SPACE_DENSITY_CHANGE_EVENT))
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('6px')
  })
})
