import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import {
  formatDocumentPageTitle,
  formatRootViewPageTitle,
  formatTicketPageTitle,
  PageTitlePriority,
  resetPageTitleForTests,
  usePageTitle,
} from './usePageTitle'

function PageTitleSource({
  title,
  priority,
}: {
  title: string | null
  priority: typeof PageTitlePriority[keyof typeof PageTitlePriority]
}) {
  usePageTitle(title, priority)
  return null
}

describe('usePageTitle', () => {
  afterEach(() => {
    cleanup()
    resetPageTitleForTests()
  })

  it('formats deterministic root ticket and document titles', () => {
    expect(formatRootViewPageTitle('ABC', 'Board')).toBe('ABC Board')
    expect(formatRootViewPageTitle('ABC', 'Listing')).toBe('ABC Listing')
    expect(formatRootViewPageTitle('ABC', 'Documents')).toBe('ABC Documents')
    expect(formatTicketPageTitle('ABC-175', 'Set browser page titles')).toBe('ABC-175 - Set browser page titles')
    expect(formatTicketPageTitle('ABC-175', 'Set browser page titles', 'Architecture')).toBe('ABC-175 - Set browser page titles - Architecture')
    expect(formatDocumentPageTitle('ABC', 'Navigation Specification')).toBe('ABC - Navigation Specification')
  })

  it('normalizes whitespace and omits empty title parts', () => {
    expect(formatTicketPageTitle(' ABC-175 ', '  Set   browser   page titles  ', '')).toBe('ABC-175 - Set browser page titles')
    expect(formatDocumentPageTitle('ABC', '')).toBe('ABC')
  })

  it('uses the highest priority registered title', () => {
    render(
      <>
        <PageTitleSource title="ABC Board" priority={PageTitlePriority.ROOT_VIEW} />
        <PageTitleSource title="ABC-175 - Set browser page titles" priority={PageTitlePriority.TICKET} />
      </>,
    )

    expect(document.title).toBe('ABC-175 - Set browser page titles')
  })

  it('restores the next registered title when a higher priority title unmounts', () => {
    const { rerender } = render(
      <>
        <PageTitleSource title="ABC Board" priority={PageTitlePriority.ROOT_VIEW} />
        <PageTitleSource title="ABC-175 - Set browser page titles" priority={PageTitlePriority.TICKET} />
      </>,
    )

    rerender(<PageTitleSource title="ABC Board" priority={PageTitlePriority.ROOT_VIEW} />)

    expect(document.title).toBe('ABC Board')
  })
})
