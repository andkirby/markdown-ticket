/**
 * MDT-247: StatusIcon lookup component tests.
 *
 * Registry exhaustiveness (7 CRStatus → 7 distinct glyphs), rendering
 * contract (data-status kebab, aria-hidden, native title), and graceful
 * absence for unmapped values.
 * Coverage: BR-1.2, BR-1.9, C2, C5, C6
 */

import { CRStatuses } from '@mdt/domain-contracts'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { StatusIcon } from './StatusIcon'

afterEach(() => {
  cleanup()
})

describe('StatusIcon — registry exhaustiveness (MDT-247)', () => {
  it('renders a distinct glyph for each of the 7 CRStatus values', () => {
    const shapes = new Set<string>()
    for (const status of CRStatuses) {
      const { container } = render(<StatusIcon status={status} className="x" />)
      const kebab = status.toLowerCase().replace(/\s+/g, '-')
      const svg = container.querySelector(`svg[data-status="${kebab}"]`)
      expect(svg).not.toBeNull()
      shapes.add(svg!.innerHTML)
    }
    // 7 statuses → 7 distinct glyph shapes (no two statuses share a glyph).
    expect(shapes.size).toBe(CRStatuses.length)
  })

  it('maps In Progress to the play glyph', () => {
    const { container } = render(<StatusIcon status="In Progress" />)
    const svg = container.querySelector('svg[data-status="in-progress"]')
    expect(svg).not.toBeNull()
    // The play glyph is a filled/stroked triangle path.
    expect(svg!.innerHTML).toContain('path')
  })
})

describe('StatusIcon — rendering contract', () => {
  it('is aria-hidden decorative (C2)', () => {
    const { container } = render(<StatusIcon status="Proposed" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders a native title child when title is passed (C2)', () => {
    const { container } = render(<StatusIcon status="On Hold" title="On Hold" />)
    const svg = container.querySelector('svg[data-status="on-hold"]')
    expect(svg?.querySelector('title')?.textContent).toBe('On Hold')
  })

  it('renders no title when title is absent (badge context)', () => {
    const { container } = render(<StatusIcon status="On Hold" />)
    expect(container.querySelector('title')).toBeNull()
  })
})

describe('StatusIcon — graceful absence (BR-1.9, C6)', () => {
  it('renders nothing for statuses outside the 7 CRStatus values', () => {
    for (const unmapped of ['In Review', 'Deferred', 'Some Future Status']) {
      const { container } = render(<StatusIcon status={unmapped} />)
      expect(container.querySelector('svg')).toBeNull()
    }
  })

  it('renders nothing for missing status', () => {
    const { container } = render(<StatusIcon status={undefined} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
