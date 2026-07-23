import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { MobileChipStrip } from './MobileChipStrip'

afterEach(cleanup)

describe('MobileChipStrip', () => {
  describe('S19 — absent when no filters active', () => {
    it('renders nothing for an empty filter', () => {
      const { container } = render(<MobileChipStrip filters={{}} onRemove={() => {}} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('S18 — renders chips when filters active', () => {
    it('renders one chip per active value', () => {
      render(
        <MobileChipStrip
          filters={{ priority: ['High'], type: ['Bug Fix'] }}
          onRemove={() => {}}
        />,
      )
      expect(screen.getAllByTestId('mobile-filter-chip')).toHaveLength(2)
    })

    it('maps the assignee sentinel to "Unassigned" in display', () => {
      render(
        <MobileChipStrip
          filters={{ assignee: ['__none__'] }}
          onRemove={() => {}}
        />,
      )
      const chip = screen.getByTestId('mobile-filter-chip')
      expect(chip.textContent).toContain('Unassigned')
    })
  })

  describe('S20 — chip remove updates shared state', () => {
    it('tapping a chip remove calls onRemove with facet+value', () => {
      const onRemove = mock()
      render(
        <MobileChipStrip
          filters={{ priority: ['High', 'Critical'] }}
          onRemove={onRemove}
        />,
      )
      const chips = screen.getAllByTestId('mobile-filter-chip')
      const firstRemove = chips[0].querySelector('[data-testid="mobile-filter-chip-remove"]')!
      fireEvent.click(firstRemove)
      expect(onRemove).toHaveBeenCalledWith('priority', 'High')
    })
  })

  describe('layout', () => {
    it('strip is horizontally scrollable', () => {
      render(
        <MobileChipStrip
          filters={{ priority: ['High'] }}
          onRemove={() => {}}
        />,
      )
      const strip = screen.getByTestId('mobile-chip-strip')
      expect(strip.className).toContain('overflow-x-auto')
    })
  })
})
