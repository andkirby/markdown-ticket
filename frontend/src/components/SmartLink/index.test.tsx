/**
 * MDT-237: SmartLink known-missing flagging is coverage-bounded (BR-2.8)
 *
 * UAT 2026-09-12 live case: a documents-view link targeting the tickets area
 * (the document index never covers it) flagged an EXISTING ticket
 * (GPDE-012) as "Document not found". Absence is only knowable inside
 * prefixes the index lists; everything else is unknown — normal link.
 * Also pins BR-2.1: covered-and-missing still flags, existing still links.
 *
 * @tags MDT-237
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { __testResetLinkConfig } from '../../config/linkConfig'
import { __testReset as resetIndex, __testSeed as seedIndex } from '../../utils/documentExistenceCache'
import { LinkType } from '../../utils/linkProcessor'
import SmartLink from './index'

const CURRENT = 'GPDE'

function renderDocumentLink(href: string) {
  render(
    <MemoryRouter>
      <SmartLink
        link={{ type: LinkType.DOCUMENT, href, text: 'GPDE-012' }}
        currentProject={CURRENT}
        showIcon={false}
      >
        GPDE-012
      </SmartLink>
    </MemoryRouter>,
  )
  return screen.getByText('GPDE-012').closest('a, span') as HTMLElement
}

describe('MDT-237: SmartLink coverage-bounded broken flagging', () => {
  afterEach(() => {
    resetIndex()
    __testResetLinkConfig()
    cleanup()
  })

  it('does NOT flag a tickets-area target — the index never covers that area (BR-2.8, live GPDE-012 case)', () => {
    seedIndex(CURRENT, ['research/learning-coverage-matrix-brief.md', 'docs/guide.md'])
    const el = renderDocumentLink('/prj/GPDE/documents?file=.tickets%2FGPDE-012-learning-coverage-matrix.md')
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('data-link-type')).toBe('document')
    expect(el.getAttribute('title')).toBeNull()
  })

  it('flags a covered-directory target that is missing (BR-2.1 preserved)', () => {
    seedIndex(CURRENT, ['research/learning-coverage-matrix-brief.md'])
    const el = renderDocumentLink('/prj/GPDE/documents?file=research%2Fmissing.md')
    expect(el.tagName).toBe('SPAN')
    expect(el.getAttribute('data-link-type')).toBe('broken')
    expect(el.getAttribute('title')).toBe('Document not found')
  })

  it('links normally to an existing covered target', () => {
    seedIndex(CURRENT, ['research/learning-coverage-matrix-brief.md'])
    const el = renderDocumentLink('/prj/GPDE/documents?file=research%2Flearning-coverage-matrix-brief.md')
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('data-link-type')).toBe('document')
  })

  it('renders a normal link while the index is unknown (no signal)', () => {
    const el = renderDocumentLink('/prj/GPDE/documents?file=research%2Fmissing.md')
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('data-link-type')).toBe('document')
  })

  it('unconfigured directory targets are unknown, not missing (BR-2.8)', () => {
    seedIndex(CURRENT, ['research/brief.md'])
    const el = renderDocumentLink('/prj/GPDE/documents?file=unconfigured%2Fdoc.md')
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('data-link-type')).toBe('document')
  })
})

describe('MDT-246: ticket links carry ?view= inside a ticket modal (BR-1.7)', () => {
  afterEach(() => {
    __testResetLinkConfig()
    cleanup()
  })

  function renderTicketLinkAt(path: string) {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <SmartLink
          link={{ type: LinkType.TICKET, href: '/prj/GPDE/ticket/GPDE-012', text: 'GPDE-012' }}
          currentProject={CURRENT}
          showIcon={false}
        >
          GPDE-012
        </SmartLink>
      </MemoryRouter>,
    )
    return container.querySelector('a[data-link-type="ticket"]') as HTMLAnchorElement
  }

  it('appends the current ?view= to a ticket link opened inside a ticket modal', () => {
    const link = renderTicketLinkAt('/prj/GPDE/ticket/GPDE-001?view=epics')
    expect(link.getAttribute('href')).toBe('/prj/GPDE/ticket/GPDE-012?view=epics')
  })

  it('leaves the href untouched outside ticket routes', () => {
    const link = renderTicketLinkAt('/prj/GPDE?view=epics')
    expect(link.getAttribute('href')).toBe('/prj/GPDE/ticket/GPDE-012')
  })

  it('leaves the href untouched on ticket routes without ?view=', () => {
    const link = renderTicketLinkAt('/prj/GPDE/ticket/GPDE-001')
    expect(link.getAttribute('href')).toBe('/prj/GPDE/ticket/GPDE-012')
  })
})
