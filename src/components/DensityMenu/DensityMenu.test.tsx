import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { getCardDensity, getSpaceDensity } from '../../config/settingsPreferences'
import { DensityMenu } from './index'

describe('DensityMenu', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('opens the panel and offers both axes with three steps each', () => {
    render(<DensityMenu />)
    fireEvent.click(screen.getByTestId('density-menu-trigger'))
    for (const v of ['compact', 'regular', 'comfortable']) {
      expect(screen.getByTestId(`density-menu-size-${v}`)).toBeTruthy()
    }
    for (const v of ['tight', 'normal', 'relaxed']) {
      expect(screen.getByTestId(`density-menu-space-${v}`)).toBeTruthy()
    }
  })

  it('defaults show regular · normal and mark them pressed', () => {
    render(<DensityMenu />)
    fireEvent.click(screen.getByTestId('density-menu-trigger'))
    expect(screen.getByTestId('density-menu-size-regular').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('density-menu-space-normal').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('regular · normal')).toBeTruthy()
  })

  it('picking tiles persists both axes independently', () => {
    render(<DensityMenu />)
    fireEvent.click(screen.getByTestId('density-menu-trigger'))
    fireEvent.click(screen.getByTestId('density-menu-size-compact'))
    expect(getCardDensity()).toBe('compact')
    expect(getSpaceDensity()).toBe('normal') // untouched

    fireEvent.click(screen.getByTestId('density-menu-space-relaxed'))
    expect(getSpaceDensity()).toBe('relaxed')
    expect(getCardDensity()).toBe('compact') // untouched
    expect(screen.getByText('compact · relaxed')).toBeTruthy()
  })

  it('reset returns to regular · normal', () => {
    render(<DensityMenu />)
    fireEvent.click(screen.getByTestId('density-menu-trigger'))
    fireEvent.click(screen.getByTestId('density-menu-size-compact'))
    fireEvent.click(screen.getByTestId('density-menu-space-tight'))
    fireEvent.click(screen.getByTestId('density-menu-reset'))
    expect(getCardDensity()).toBe('regular')
    expect(getSpaceDensity()).toBe('normal')
  })

  it('closes on Escape', () => {
    render(<DensityMenu />)
    fireEvent.click(screen.getByTestId('density-menu-trigger'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('density-menu-reset')).toBeNull()
  })
})
