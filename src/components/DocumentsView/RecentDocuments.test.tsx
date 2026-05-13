import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import RecentDocuments from './RecentDocuments'

describe('RecentDocuments', () => {
  afterEach(() => {
    cleanup()
  })

  it('collapses and expands recent document shortcuts', () => {
    render(
      <RecentDocuments
        documents={[{ path: 'docs/design/navigation.md', name: 'navigation.md', title: 'Navigation Spec' }]}
        onSelectDocument={mock()}
      />,
    )

    const toggle = screen.getByTestId('document-recent-toggle')

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('document-recent-item')).toBeInTheDocument()
    expect(screen.getByText('Navigation Spec')).toBeInTheDocument()
    expect(screen.getByText('navigation.md')).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('document-recent-item')).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('document-recent-item')).toBeInTheDocument()
  })
})
