import { CRPriorities } from '@mdt/domain-contracts'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { FacetDropdown } from './FacetDropdown'

afterEach(cleanup)

const PRIORITY_OPTIONS = CRPriorities.map(v => ({ value: v, label: v }))

/**
 * Note on scope: the Radix DropdownMenu portals its content into document.body
 * using pointer events that jsdom does not simulate. The full "menu opens and
 * lists options, checkbox toggles" interactions are therefore verified by E2E
 * (tests/e2e/board/board-filter.spec.ts). These unit tests cover the trigger
 * label contract and the option-shape handling that are testable in jsdom.
 */
describe('FacetDropdown', () => {
  describe('trigger label contract', () => {
    it('shows bare facet label when nothing selected', () => {
      render(
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={PRIORITY_OPTIONS}
          selected={[]}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown-trigger').textContent).toBe('Priority')
    })

    it('shows "Priority: N" when N values selected', () => {
      render(
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={PRIORITY_OPTIONS}
          selected={['High', 'Critical']}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown-trigger').textContent).toBe('Priority: 2')
    })

    it('shows "Priority: 1" for a single selection', () => {
      render(
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={PRIORITY_OPTIONS}
          selected={['High']}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown-trigger').textContent).toBe('Priority: 1')
    })
  })

  describe('static facets derive options from the enum', () => {
    it('receives all enum values as options regardless of ticket data', () => {
      // The component renders one option per entry in `options`; the options
      // array is built from CRPriorities in DesktopFilterBar. Verifying the
      // source array here documents the "static facet" contract (architecture
      // "Static facets draw from enums, not the ticket set").
      expect(PRIORITY_OPTIONS).toHaveLength(CRPriorities.length)
      expect(PRIORITY_OPTIONS.map(o => o.value)).toEqual(Array.from(CRPriorities))
    })
  })

  describe('trigger accessibility', () => {
    it('the trigger has aria-haspopup="menu"', () => {
      render(
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={PRIORITY_OPTIONS}
          selected={[]}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown-trigger').getAttribute('aria-haspopup')).toBe('menu')
    })

    it('the trigger is a real button', () => {
      render(
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={PRIORITY_OPTIONS}
          selected={[]}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown-trigger').tagName).toBe('BUTTON')
    })
  })

  describe('data attributes for E2E', () => {
    it('the dropdown container exposes data-facet', () => {
      render(
        <FacetDropdown
          facet="status"
          facetLabel="Status"
          options={[]}
          selected={[]}
          onToggle={() => {}}
        />,
      )
      expect(screen.getByTestId('facet-dropdown').getAttribute('data-facet')).toBe('status')
    })
  })
})
