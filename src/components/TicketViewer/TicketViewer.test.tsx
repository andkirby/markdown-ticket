/* eslint-disable react/no-unnecessary-use-prefix -- This file mocks hook exports by their real names. */
import type * as React from 'react'
import type { Ticket } from '../../types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketViewer from './index'

const fetchTicket = mock(async () => null)
const fetchTraceStoreMetadata = mock(async () => ({
  exists: false,
  ticketCode: 'MDT-173',
  label: 'MDT-173/store.json',
}))

mock.module('../../services/dataLayer', () => ({
  dataLayer: {
    fetchTicket,
    fetchTraceStoreMetadata,
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
  Modal: ({
    isOpen,
    children,
    closeOnOverlayClick,
    'data-testid': dataTestId,
  }: {
    'isOpen': boolean
    'children': React.ReactNode
    'closeOnOverlayClick'?: boolean
    'data-testid'?: string
  }) =>
    isOpen
      ? (
          <div data-close-on-overlay-click={closeOnOverlayClick} data-testid={dataTestId}>
            {children}
          </div>
        )
      : null,
  ModalBody: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <section className={className}>{children}</section>
  ),
}))

mock.module('./CompactTicketHeader', () => ({
  CompactTicketHeader: ({ action }: { action?: React.ReactNode }) => (
    <header data-testid="compact-ticket-header">
      {action}
    </header>
  ),
}))

mock.module('./TicketDocumentTabs', () => ({
  TicketDocumentTabs: () => <div data-testid="ticket-document-tabs" />,
}))

let selectedPath = 'main'
let liveSubdocuments: Array<{
  name: string
  kind: 'file' | 'folder'
  filePath?: string
  children: unknown[]
}> = []

mock.module('./useTicketDocumentNavigation', () => ({
  useTicketDocumentNavigation: () => ({
    selectedPath,
    folderStack: [],
    selectPath: mock(() => undefined),
    pendingPath: null,
    confirmPathSwitch: mock(() => undefined),
  }),
}))

mock.module('./useTicketDocumentRealtime', () => ({
  useTicketDocumentRealtime: () => ({
    subdocuments: liveSubdocuments,
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

function renderTicketViewer(props: { ticket?: Ticket, isOpen?: boolean, onClose?: () => void } = {}) {
  const onClose = props.onClose ?? mock(() => undefined)
  const rendered = render(
    <MemoryRouter initialEntries={['/projects/MDT']}>
      <Routes>
        <Route
          path="/projects/:projectCode"
          element={(
            <TicketViewer
              ticket={props.ticket ?? ticket}
              isOpen={props.isOpen ?? true}
              onClose={onClose}
              ticketsPath="docs/CRs"
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  )

  return { ...rendered, onClose }
}

describe('TicketViewer', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchTicket.mockClear()
    fetchTraceStoreMetadata.mockReset()
    fetchTraceStoreMetadata.mockResolvedValue({
      exists: false,
      ticketCode: 'MDT-173',
      label: 'MDT-173/store.json',
    })
    selectedPath = 'main'
    liveSubdocuments = []
    document.title = 'CR Task Board'
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.title = 'CR Task Board'
  })

  afterAll(() => {
    mock.restore()
  })

  it('renders markdown with the ticket prose variant and preserved heading level start', async () => {
    renderTicketViewer()

    const markdown = screen.getByTestId('markdown-content')
    expect(markdown).toHaveClass('prose', 'prose--ticket', 'prose--density-compact', 'max-w-none', 'dark:prose-invert')
    expect(markdown).toHaveAttribute('data-header-level-start', '3')
    expect(markdown.closest('.ticket-viewer-content')).toHaveStyle('--prose-anchor-offset: 0px')
    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())
  })

  it('sets the browser title from the active ticket code and title', async () => {
    renderTicketViewer()

    expect(document.title).toBe('MDT-173 - Markdown typography variants')
    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())
  })

  it('appends the active ticket subdocument label to the browser title', async () => {
    selectedPath = 'architecture'
    liveSubdocuments = [{
      name: 'architecture',
      kind: 'file',
      filePath: 'docs/CRs/MDT-173/architecture.md',
      children: [],
    }]

    renderTicketViewer()

    expect(document.title).toBe('MDT-173 - Markdown typography variants - Architecture')
    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())
  })

  it('renders markdown with the stored ticket density class', async () => {
    localStorage.setItem('markdown-ticket:settings:markdown-density', 'default')

    renderTicketViewer()

    expect(screen.getByTestId('markdown-content')).toHaveClass('prose--density-default')
    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())
  })

  it('keeps timestamp spacing outside the prose block', async () => {
    renderTicketViewer()

    const markdown = screen.getByTestId('markdown-content')
    expect(markdown).not.toHaveStyle('padding-top: 2.25rem')
    expect(markdown.parentElement).not.toHaveAttribute('style')
    expect(screen.getByRole('button', { name: /toggle timestamp display/i }).parentElement).toHaveClass('static', 'sm:absolute')
    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())
  })

  it('shows Trace Graph action when trace store metadata exists', async () => {
    fetchTraceStoreMetadata.mockResolvedValueOnce({
      exists: true,
      ticketCode: 'MDT-173',
      label: 'MDT-173/store.json',
    })

    renderTicketViewer()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Trace Graph' })).toBeInTheDocument()
    })
  })

  it('hides Trace Graph action when trace store metadata is absent', async () => {
    renderTicketViewer()

    await waitFor(() => expect(fetchTraceStoreMetadata).toHaveBeenCalled())

    expect(screen.queryByRole('button', { name: 'Trace Graph' })).toBeNull()
  })

  it('closes only the trace graph shell when Back is clicked', async () => {
    fetchTraceStoreMetadata.mockResolvedValueOnce({
      exists: true,
      ticketCode: 'MDT-173',
      label: 'MDT-173/store.json',
    })
    const onClose = mock(() => undefined)

    renderTicketViewer({ onClose })

    fireEvent.click(await screen.findByRole('button', { name: 'Trace Graph' }))

    expect(screen.getByTestId('ticket-detail')).toHaveAttribute('data-close-on-overlay-click', 'false')
    expect(screen.getByTestId('trace-graph-shell')).toBeInTheDocument()
    expect(document.title).toBe('MDT-173 - Markdown typography variants - Trace Graph')

    fireEvent.click(screen.getByRole('button', { name: 'Back to ticket' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('trace-graph-shell')).toBeNull()
    expect(screen.getByTestId('ticket-detail')).toBeInTheDocument()
    expect(document.title).toBe('MDT-173 - Markdown typography variants')
  })

  it('does not carry an open trace graph to the next ticket', async () => {
    fetchTraceStoreMetadata.mockResolvedValue({
      exists: true,
      ticketCode: 'MDT-173',
      label: 'MDT-173/store.json',
    })
    const nextTicket = {
      ...ticket,
      code: 'MDT-174',
      title: 'Trace graph viewer',
    } as Ticket

    const { rerender } = renderTicketViewer()

    fireEvent.click(await screen.findByRole('button', { name: 'Trace Graph' }))
    expect(screen.getByTestId('trace-graph-shell')).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/projects/MDT']}>
        <Routes>
          <Route
            path="/projects/:projectCode"
            element={(
              <TicketViewer
                ticket={nextTicket}
                isOpen={true}
                onClose={mock(() => undefined)}
                ticketsPath="docs/CRs"
              />
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('trace-graph-shell')).toBeNull()
    })
    expect(screen.getByTestId('ticket-detail')).toBeInTheDocument()
  })
})
