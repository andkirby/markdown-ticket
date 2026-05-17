import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MarkdownViewer from './MarkdownViewer'

mock.module('../MarkdownContent', () => ({
  default: ({ markdown }: { markdown: string }) => (
    <article data-testid="markdown-content">{markdown}</article>
  ),
}))

mock.module('@/components/shared/TableOfContents', () => ({
  default: () => <nav data-testid="table-of-contents" />,
}))

const REAL_NOW = new Date()
const FIXED_NOW = new Date('2026-05-17T18:00:00Z')

function renderMarkdownViewer(props: Partial<React.ComponentProps<typeof MarkdownViewer>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/projects/MDT/documents']}>
      <Routes>
        <Route
          path="/projects/:projectCode/documents"
          element={(
            <MarkdownViewer
              projectId="project-1"
              filePath="docs/notes.md"
              fileInfo={{
                name: 'notes.md',
                path: 'docs/notes.md',
                type: 'file',
                dateCreated: '2026-05-17T15:00:00Z',
                lastModified: '2026-05-17T17:00:00Z',
              }}
              {...props}
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MarkdownViewer', () => {
  const mockFetch = mock(async () => new Response('# Document', { status: 200 }))

  beforeEach(() => {
    setSystemTime(FIXED_NOW)
    globalThis.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
    setSystemTime(REAL_NOW)
    mock.restore()
  })

  it('renders document metadata with the shared floating timestamp class', async () => {
    const { container } = renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Document')
    })

    const viewer = screen.getByTestId('file-viewer')
    expect(viewer).toHaveClass('document-viewer')
    expect(container.querySelector('.relative-timestamp__floating')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('relative-timestamp', 'relative-timestamp--interactive')
    expect(screen.getByRole('button')).toHaveTextContent('Updated 1 hour ago')
  })

  it('renders document sync state with the extracted timestamp sync class', async () => {
    const { container } = renderMarkdownViewer({ updateState: 'updated' })

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })

    const syncState = screen.getByText('Updated')
    expect(syncState).toHaveClass('relative-timestamp__sync-state')
    expect(container.querySelector('.relative-timestamp__floating')).toContainElement(syncState)
  })
})
