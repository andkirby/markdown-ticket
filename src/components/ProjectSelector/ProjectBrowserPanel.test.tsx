import type { Project } from '@mdt/shared/models/Project'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ProjectBrowserPanel } from './ProjectBrowserPanel'

function makeProject(code: string, name: string, description: string): Project {
  return {
    id: code.toLowerCase(),
    project: {
      id: code.toLowerCase(),
      code,
      name,
      path: `/tmp/${code.toLowerCase()}`,
      configFile: `/tmp/${code.toLowerCase()}/.mdt-config.toml`,
      active: true,
      description,
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2025-01-01',
      lastAccessed: '2025-01-01',
      version: '1.0.0',
    },
  }
}

const projects = [
  makeProject('MDT', 'Markdown Ticket', 'Current project'),
  makeProject('API', 'Service Gateway', 'Internal platform'),
  makeProject('OPS', 'Operations Console', 'Deployment workflows'),
  makeProject('FIN', 'Ledger', 'Billing and revenue tools'),
]

function renderPanel(selectorState: Record<string, any> = {}) {
  return render(
    <ProjectBrowserPanel
      projects={projects}
      activeProjectKey="MDT"
      preferences={{ visibleCount: 7, compactInactive: true }}
      selectorState={selectorState}
      onProjectSelect={mock()}
      isOpen={true}
      onClose={mock()}
    />,
  )
}

describe('ProjectBrowserPanel search', () => {
  afterEach(() => {
    cleanup()
  })

  it('matches projects by code, title, and description', () => {
    renderPanel()
    const searchInput = screen.getByTestId('project-browser-search-input')

    fireEvent.change(searchInput, { target: { value: 'api' } })
    expect(screen.getByTestId('project-browser-card-API')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-OPS')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'operations' } })
    expect(screen.getByTestId('project-browser-card-OPS')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-API')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'billing' } })
    expect(screen.getByTestId('project-browser-card-FIN')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-OPS')).not.toBeInTheDocument()
  })
})

describe('ProjectBrowserPanel accent rendering - MDT-181', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a filled identity area for a configured browser-card accent', () => {
    renderPanel({
      API: {
        favorite: false,
        lastUsedAt: '2026-06-07T12:00:00.000Z',
        count: 1,
        accent: '#2563eb',
      },
    })

    const card = screen.getByTestId('project-browser-card-API')
    expect(card).toBeInTheDocument()
    expect(card.querySelector('.project-card__identity')).toBeInTheDocument()
  })

  it('renders identity fill without auto-discovering project-folder images when no accent is configured', () => {
    renderPanel()

    const card = screen.getByTestId('project-browser-card-API')
    expect(card).toBeInTheDocument()
    expect(card.querySelector('.project-card__identity')).toBeInTheDocument()
    expect(card.querySelector('img')).toBeNull()
  })
})
