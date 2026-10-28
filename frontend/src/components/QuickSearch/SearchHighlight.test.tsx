import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { SearchHighlight } from './SearchHighlight'

afterEach(cleanup)

describe('MDT-136 literal query highlights', () => {
  it('keeps exact text and marks each matching substring case-insensitively', () => {
    const { container } = render(<SearchHighlight text="Login 95 and login 195" query="95 LOGIN" />)
    expect(container.textContent).toBe('Login 95 and login 195')
    expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['Login', '95', 'login', '95'])
  })
  it('treats markup and regular-expression punctuation literally', () => {
    const { container } = render(<SearchHighlight text="[safe] <img src=x> .*" query="[safe] <img .*" />)
    expect(container.querySelector('img')).toBeNull()
    expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['[safe]', '<img', '.*'])
  })
  it('merges overlapping matches without duplicating content', () => {
    const { container } = render(<SearchHighlight text="banana" query="ana nan" />)
    expect(container.textContent).toBe('banana')
    expect(container.querySelector('mark')?.textContent).toBe('anana')
  })
  it('does not mark empty queries or unrelated labels', () => {
    for (const query of ['', '   ', '95']) {
      const { container, unmount } = render(<SearchHighlight text="68" query={query} />)
      expect(container.querySelector('mark')).toBeNull()
      unmount()
    }
  })
})
