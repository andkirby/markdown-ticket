import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MarkdownViewer from './MarkdownViewer'

mock.module('../MarkdownContent', () => ({
  default: ({ markdown, className, ticketsPath }: { markdown: string, className?: string, ticketsPath?: string }) => (
    <article data-testid="markdown-content" className={className} data-tickets-path={ticketsPath ?? ''}>{markdown}</article>
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
  // URL-aware fetch mock: the viewer issues two API calls (project config for
  // ticketsPath + document content), so queue-based mockImplementationOnce
  // fixtures would be consumed by the wrong request. Route by URL instead.
  let contentResponse = () => new Response('# Document', { status: 200 })
  let configResponse = () => new Response(JSON.stringify({ config: { project: { ticketsPath: 'docs/CRs' } } }), { status: 200 })
  const mockFetch = mock(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input)
    if (url.includes('/api/projects/') && url.includes('/config')) {
      return configResponse()
    }
    return contentResponse()
  })

  beforeEach(() => {
    localStorage.clear()
    setSystemTime(FIXED_NOW)
    contentResponse = () => new Response('# Document', { status: 200 })
    configResponse = () => new Response(JSON.stringify({ config: { project: { ticketsPath: 'docs/CRs' } } }), { status: 200 })
    globalThis.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
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
    expect(screen.getByRole('button')).toHaveTextContent('1 hour ago')
  })

  it('renders markdown with the document prose variant', async () => {
    renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Document')
    })

    expect(screen.getByTestId('markdown-content')).toHaveClass('prose', 'prose--document', 'prose--density-compact', 'dark:prose-invert')
  })

  it('renders markdown with the stored document density class', async () => {
    localStorage.setItem('markdown-ticket:settings:markdown-density', 'comfortable')

    renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Document')
    })

    expect(screen.getByTestId('markdown-content')).toHaveClass('prose--density-comfortable')
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

  it('renders valid leading frontmatter as a collapsed raw disclosure above the markdown body', async () => {
    contentResponse = () => new Response('---\ntitle: API Documentation\nauthor: John Doe\n---\n\n# API Documentation', { status: 200 })

    const { container } = renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# API Documentation')
    })

    const disclosure = container.querySelector('.document-frontmatter')
    expect(disclosure).toBeInTheDocument()
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getByText('Frontmatter')).toHaveClass('document-frontmatter__summary')
    expect(container.querySelector('.document-frontmatter__code')).toHaveTextContent('title: API Documentation')
    expect(container.querySelector('.document-frontmatter__code')).toHaveClass('language-yaml')
    expect(container.querySelector('.document-frontmatter__code code')).toHaveClass('language-yaml')
    expect(container.querySelector('.document-frontmatter .token')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).not.toHaveTextContent('title: API Documentation')
    expect(screen.getByTestId('markdown-content')).not.toHaveTextContent('---')
  })

  it('escapes frontmatter text instead of rendering it as HTML', async () => {
    contentResponse = () => new Response('---\ntitle: <img src=x onerror=alert(1)>\n---\n\n# Safe Body', { status: 200 })

    const { container } = renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Safe Body')
    })

    expect(container.querySelector('.document-frontmatter__code')).toHaveTextContent('title: <img src=x onerror=alert(1)>')
    expect(container.querySelector('.document-frontmatter img')).not.toBeInTheDocument()
  })

  it('keeps non-leading or unterminated frontmatter markers in the markdown body', async () => {
    contentResponse = () => new Response('# Intro\n\n---\ntitle: Not frontmatter\n---', { status: 200 })

    const { container } = renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('title: Not frontmatter')
    })

    expect(container.querySelector('.document-frontmatter')).not.toBeInTheDocument()
  })

  // MDT-237 UAT 2026-09-12 (BR-2.7): the documents view must forward the
  // project's configured ticketsPath to MarkdownContent — without it the
  // preprocessor assumes docs/CRs and misroutes projects like GPDE (.tickets),
  // false-flagging existing tickets as missing documents.
  it('passes the configured ticketsPath to MarkdownContent', async () => {
    configResponse = () => new Response(JSON.stringify({ config: { project: { ticketsPath: '.tickets' } } }), { status: 200 })

    renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveAttribute('data-tickets-path', '.tickets')
    })
  })

  it('falls back to the docs/CRs default when the config request fails', async () => {
    configResponse = () => new Response('unavailable', { status: 500 })

    renderMarkdownViewer()

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('markdown-content')).toHaveAttribute('data-tickets-path', '')
  })
})
