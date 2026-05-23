import type { Project } from '@mdt/shared/models/Project'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MARKDOWN_DENSITY_KEY } from '../config/settingsPreferences'
import { TICKET_CARD_BADGE_STORAGE_KEY } from '../config/ticketCardBadges'
import { SettingsModal } from './SettingsModal'

function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mock().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: mock(),
      removeEventListener: mock(),
      addListener: mock(),
      removeListener: mock(),
      dispatchEvent: mock(),
    })),
  })
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'MDT',
    project: {
      id: 'MDT',
      name: 'Markdown Ticket',
      code: 'MDT',
      path: '/tmp/markdown-ticket',
      configFile: '.mdt-config.toml',
      active: true,
      description: '',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-05-23',
      lastAccessed: '2026-05-23',
      version: '1.0.0',
      sharing: { mode: 'private' },
    },
    ...overrides,
  }
}

describe('SettingsModal', () => {
  const onClose = mock()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'theme=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    onClose.mockClear()
    installMatchMedia()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    globalThis.fetch = originalFetch
  })

  it('renders the Settings tabs', () => {
    render(<SettingsModal isOpen={true} onClose={onClose} />)

    expect(screen.getByTestId('settings-modal')).toHaveClass('sm:max-w-5xl')
    expect(screen.getByTestId('settings-tab-appearance')).toHaveTextContent('Appearance')
    expect(screen.getByTestId('settings-tab-board')).toHaveTextContent('Board')
    expect(screen.getByTestId('settings-tab-advanced')).toHaveTextContent('Advanced')
    expect(screen.getByTestId('settings-default-view')).toBeInTheDocument()
    expect(screen.getByTestId('settings-markdown-density')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-card-density')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-event-history')).not.toBeInTheDocument()
  })

  function selectTab(testId: string): void {
    const tab = screen.getByTestId(testId)
    fireEvent.pointerDown(tab, { button: 0, ctrlKey: false })
    fireEvent.click(tab)
  }

  it('persists appearance preferences immediately', async () => {
    render(<SettingsModal isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('settings-theme-light'))
    await waitFor(() => expect(document.documentElement).toHaveClass('light'))

    fireEvent.change(screen.getByTestId('settings-default-view'), {
      target: { value: 'list' },
    })
    fireEvent.change(screen.getByTestId('settings-markdown-density'), {
      target: { value: 'comfortable' },
    })

    expect(localStorage.getItem('mdt-settings-default-view')).toBe('list')
    expect(localStorage.getItem(MARKDOWN_DENSITY_KEY)).toBe('comfortable')
  })

  it('persists board preferences without backend requests', () => {
    const fetchMock = mock(() => Promise.resolve(new Response('{}')))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    render(<SettingsModal isOpen={true} onClose={onClose} />)
    selectTab('settings-tab-board')

    fireEvent.change(screen.getByTestId('settings-card-density'), {
      target: { value: 'compact' },
    })
    fireEvent.click(screen.getByTestId('settings-auto-linking'))
    fireEvent.click(screen.getByTestId('settings-visible-badge-priority'))

    expect(localStorage.getItem('mdt-settings-card-density')).toBe('compact')
    expect(localStorage.getItem('markdown-ticket-link-config')).toBe('{"enableAutoLinking":false}')
    expect(localStorage.getItem(TICKET_CARD_BADGE_STORAGE_KEY)).toBe(
      '["status","type","phase","related","depends","blocks","worktree"]',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('persists event history visibility through the existing storage path', () => {
    render(<SettingsModal isOpen={true} onClose={onClose} />)
    selectTab('settings-tab-advanced')
    fireEvent.click(screen.getByTestId('settings-event-history'))

    expect(localStorage.getItem('mdt-eventHistory-hidden')).toBe('true')
  })

  it('shows project access help for owner sharing settings', () => {
    render(<SettingsModal isOpen={true} onClose={onClose} selectedProject={createProject()} />)
    selectTab('settings-tab-sharing')

    expect(screen.getByTestId('settings-sharing-mode')).toBeInTheDocument()
    expect(screen.getByTestId('settings-sharing-info')).toHaveAccessibleName('Project access mode details')
  })

  it('shows an informative sharing error when the project or endpoint is missing', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(
      JSON.stringify({ error: 'Not Found', message: 'Project not found' }),
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      },
    )))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    render(<SettingsModal isOpen={true} onClose={onClose} selectedProject={createProject()} />)
    selectTab('settings-tab-sharing')

    fireEvent.change(screen.getByTestId('settings-sharing-mode'), {
      target: { value: 'public-readonly' },
    })
    fireEvent.click(screen.getByTestId('settings-save-sharing'))

    await waitFor(() => {
      expect(screen.getByText(/project "MDT" or the sharing endpoint was not found/u)).toBeInTheDocument()
    })
    expect(screen.getByText(/404 Not Found/u)).toBeInTheDocument()
  })
})
