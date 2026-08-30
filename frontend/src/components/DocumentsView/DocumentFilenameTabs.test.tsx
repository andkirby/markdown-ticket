import type { DocumentFilenameTab } from './documentFilenameTabModel'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import DocumentFilenameTabs from './DocumentFilenameTabs'

const tabs: DocumentFilenameTab[] = [
  { key: 'main', label: 'main', filePath: 'docs/some-name.md' },
  { key: 'one', label: 'one', filePath: 'docs/some-name.one.md' },
  { key: 'two', label: 'two', filePath: 'docs/some-name.two.md' },
]

describe('DocumentFilenameTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders filename tabs with existing tab UI classes and active state', () => {
    render(
      <DocumentFilenameTabs
        tabs={tabs}
        activeTabKey="two"
        onSelectTab={mock()}
      />,
    )

    expect(screen.getByTestId('document-filename-tabs')).toHaveClass('tab__list')
    expect(screen.getByRole('tab', { name: 'one' })).toHaveClass('tab')
    expect(screen.getByRole('tab', { name: 'two' })).toHaveAttribute('aria-selected', 'true')
  })

  it('selects the active physical file path when a tab is clicked', () => {
    const onSelectTab = mock()

    render(
      <DocumentFilenameTabs
        tabs={tabs}
        activeTabKey="main"
        onSelectTab={onSelectTab}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'two' }))

    expect(onSelectTab).toHaveBeenCalledWith('docs/some-name.two.md')
  })
})
