/**
 * TypeIcon Component Unit Tests
 *
 * Verifies the per-type glyph map (typeIcons.ts) covers every CRType value
 * and the component's fallback behavior. Coverage mirrors TypeBadge tests.
 */

import { CRTypes } from '@mdt/domain-contracts'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { TypeIcon } from './TypeIcon'
import { TYPE_ICON } from './typeIcons'
import { formatDataAttr } from './utils'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('TypeIcon', () => {
  describe('glyph map coverage', () => {
    it.each([...CRTypes])('should map type "%s" to a glyph', (type) => {
      expect(TYPE_ICON[formatDataAttr(type)]).toBeDefined()
    })
  })

  describe('rendering', () => {
    it.each([...CRTypes])('should render an svg with data-type for "%s"', (type) => {
      const { container } = render(<TypeIcon type={type} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg).toHaveAttribute('data-type', formatDataAttr(type))
    })

    it('should fall back to the feature glyph for unknown types (mirrors badge.css)', () => {
      const { container } = render(<TypeIcon type="Nonexistent" />)
      expect(container.querySelector('svg')).toHaveAttribute('data-type', 'nonexistent')
    })

    it('should render nothing when no type is given', () => {
      const { container } = render(<TypeIcon />)
      expect(container.querySelector('svg')).toBeNull()
    })
  })
})
