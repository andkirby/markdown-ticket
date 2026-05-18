import type { Ticket } from '../../types'
import type React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketViewer from './index'

mock.module('../../services/dataLayer', () => ({
  dataLayer: {
    fetchTicket: mock(async () => null),
  },
}))

mock.module('../../services/eventBus', () => ({
  useEventBus: mock(() => undefined),
}))

mock.module('../MarkdownContent', () => ({
  default: ({
    markdown,
    className,
    headerLevelStart,
  }: {
    markdown: string
    className?: string
    headerLevelStart?: number
  }) => (
    <article
      data-testid="markdown-content"
      data-header-level-start={headerLevelStart}
      className={className}
    >
      {markdown}
    </article>
  ),
}))

mock.module('../shared/TableOfContents', () => ({
  default: () => <nav data-testid="table-of-contents" />,
}))

mock.module('../ui/Modal', () => ({
  Modal: ({ isOpen, children, 'data-testid': dataTestId }: { isOpen: boolean, children: React.ReactNode, 'data-testid'?: string }) =>
    isOpen ? <div data-testid={dataTestId}>{children}</div> : null,
  ModalBody: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <section className={className}>{children}</section>
  ),
}))

mock.module('./CompactTicketHeader', () => ({
  CompactTicketHeader: () => <header data-testid="compact-ticket-header" />,
}))

mock.module('./TicketDocumentTabs', () => ({
  TicketDocumentTabs: () => <div data-testid="ticket-document-tabs" />,
}))

mock.module('./useTicketDocumentNavigation', () => ({
  useTicketDocumentNavigation: () => ({
    selectedPath: 'main',
    folderStack: [],
    selectPath: mock(() => undefined),
    pendingPath: null,
    confirmPathSwitch: mock(() => undefined),
  }),
}))

mock.module('./useTicketDocumentRealtime', () => ({
  useTicketDocumentRealtime: () => ({
    subdocuments: [],
    handleSSEUpdate: mock(() => undefined),
  }),
}))

mock.module('./useTicketDocumentContent', () => ({
  useTicketDocumentContent: ({ mainContent }: { mainContent: string }) => ({
    content: mainContent,
    loading: false,
    error: null,
    invalidateCache: mock(() => undefined),
    invalidateAndRefetch: mock(() => undefined),
  }),
}))

const ticket = {
  code: 'MDT-173',
  title: 'Markdown typography variants',
  content: '# Markdown typography variants\n\n## Details\n\nBody text',
  status: 'In Progress',
  priority: 'High',
  type: 'Feature Enhancement',
  dateCreated: '2026-05-18T10:00:00Z',
  lastModified: '2026-05-18T12:00:00Z',
} as Ticket

function renderTicketViewer() {
  return render(
    <MemoryRouter initialEntries={['/projects/MDT']}>
      <Routes>
        <Route
          path="/projects/:projectCode"
          element={(
            <TicketViewer
              ticket={ticket}
              isOpen={true}
              onClose={mock(() => undefined)}
              ticketsPath="docs/CRs"
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TicketViewer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  afterAll(() => {
    mock.restore()
  })

  it('renders markdown with the ticket prose variant and preserved heading level start', () => {
    renderTicketViewer()

    const markdown = screen.getByTestId('markdown-content')
    expect(markdown).toHaveClass('prose', 'prose--ticket', 'prose--density-compact', 'max-w-none', 'dark:prose-invert')
    expect(markdown).toHaveAttribute('data-header-level-start', '3')
  })

  it('renders markdown with the stored ticket density class', () => {
    localStorage.setItem('markdown-ticket:settings:markdown-density', 'default')

    renderTicketViewer()

    expect(screen.getByTestId('markdown-content')).toHaveClass('prose--density-default')
  })

  it('keeps timestamp spacing outside the prose block', () => {
    renderTicketViewer()

    const markdown = screen.getByTestId('markdown-content')
    expect(markdown).not.toHaveStyle('padding-top: 2.25rem')
    expect(markdown.parentElement).not.toHaveAttribute('style')
    expect(screen.getByRole('button', { name: /toggle timestamp display/i }).parentElement).toHaveClass('static', 'sm:absolute')
  })
})
