import { afterEach, describe, expect, it } from 'bun:test'
import { clearStoredSplitPercent, getStoredSplitPercent, storeSplitPercent } from './sidePaneLayout'

const KEY = 'mdt-settings-ticket-side-pane-split-ratio'

afterEach(() => {
  localStorage.clear()
})

describe('sidePaneLayout (persisted split-wall position)', () => {
  it('round-trips a percent', () => {
    storeSplitPercent(46.4)
    expect(getStoredSplitPercent()).toBe(46.4)
    expect(localStorage.getItem(KEY)).toBe('46.400')
  })

  it('returns null when nothing is stored', () => {
    expect(getStoredSplitPercent()).toBeNull()
  })

  it('clears the stored value', () => {
    storeSplitPercent(60)
    clearStoredSplitPercent()
    expect(getStoredSplitPercent()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('rejects stored garbage and out-of-range values', () => {
    localStorage.setItem(KEY, 'not-a-number')
    expect(getStoredSplitPercent()).toBeNull()
    localStorage.setItem(KEY, '0')
    expect(getStoredSplitPercent()).toBeNull()
    localStorage.setItem(KEY, '100')
    expect(getStoredSplitPercent()).toBeNull()
    localStorage.setItem(KEY, '-5')
    expect(getStoredSplitPercent()).toBeNull()
  })
})
