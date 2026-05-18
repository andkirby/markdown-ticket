import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import RecentDocuments from './RecentDocuments'

describe('RecentDocuments', () => {
  afterEach(() => {
    cleanup()
  })

  it('collapses and expands recent document shortcuts', () => {
    const onExpandedChange = mock()
    const { rerender } = render(
      <RecentDocuments
        documents={[{ path: 'docs/design/navigation.md', name: 'navigation.md', title: 'Navigation Spec' }]}
        isExpanded={true}
        onSelectDocument={mock()}
        onExpandedChange={onExpandedChange}
      />,
    )

    const toggle = screen.getByTestId('document-recent-toggle')

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('document-recent-item')).toBeInTheDocument()
    expect(screen.getByText('Navigation Spec')).toBeInTheDocument()
    expect(screen.getByText('navigation.md')).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(onExpandedChange).toHaveBeenCalledWith(false)

    rerender(
      <RecentDocuments
        documents={[{ path: 'docs/design/navigation.md', name: 'navigation.md', title: 'Navigation Spec' }]}
        isExpanded={false}
        onSelectDocument={mock()}
        onExpandedChange={onExpandedChange}
      />,
    )

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('document-recent-item')).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
  })

  it('renders expanded again when controlled state is restored', () => {
    render(
      <RecentDocuments
        documents={[{ path: 'docs/design/navigation.md', name: 'navigation.md', title: 'Navigation Spec' }]}
        isExpanded={true}
        onSelectDocument={mock()}
        onExpandedChange={mock()}
      />,
    )

    const toggle = screen.getByTestId('document-recent-toggle')

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('document-recent-item')).toBeInTheDocument()
  })
})
