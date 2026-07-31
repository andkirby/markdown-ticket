import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  CARD_DENSITY_CHANGE_EVENT,
  getCardDensity,
  setCardDensityPreference,
} from '../config/settingsPreferences'
import { useCardDensity } from './useCardDensity'

function Harness() {
  useCardDensity()
  return null
}

describe('useCardDensity', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.style.cssText = ''
  })

  it('applies comfortable density tokens by default', () => {
    render(<Harness />)
    expect(getCardDensity()).toBe('comfortable')
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('10px')
    expect(document.documentElement.style.getPropertyValue('--pad-x')).toBe('12px')
    expect(document.documentElement.style.getPropertyValue('--fs-md')).toBe('13px')
    expect(document.documentElement.style.getPropertyValue('--radius-card')).toBe('8px')
  })

  it('applies compact tokens when CardDensity preference is compact', () => {
    setCardDensityPreference('compact')
    render(<Harness />)
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('6px')
    expect(document.documentElement.style.getPropertyValue('--fs-xs')).toBe('10px')
    expect(document.documentElement.style.getPropertyValue('--radius-card')).toBe('4px')
  })

  it('reacts to live CARD_DENSITY_CHANGE_EVENT after mount', () => {
    render(<Harness />)
    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('10px')

    // setCardDensityPreference persists + dispatches the change event; the
    // mounted hook's listener must re-apply the compact tokens.
    setCardDensityPreference('compact')
    window.dispatchEvent(new CustomEvent(CARD_DENSITY_CHANGE_EVENT))

    expect(document.documentElement.style.getPropertyValue('--pad-y')).toBe('6px')
  })
})
