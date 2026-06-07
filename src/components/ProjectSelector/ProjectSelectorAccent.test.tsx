import type { ProjectWithSelectorState } from './types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ProjectSelectorCard } from './ProjectSelectorCard'
import { ProjectSelectorChip } from './ProjectSelectorChip'

function makeProject(code: string, name: string, description: string, accent?: string): ProjectWithSelectorState {
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
    selectorState: {
      favorite: false,
      lastUsedAt: null,
      count: 0,
      accent,
    } as ProjectWithSelectorState['selectorState'],
    favorite: false,
    lastUsedAt: null,
    count: 0,
  }
}

afterEach(() => {
  cleanup()
})

describe('Project selector accent rendering', () => {
  it('renders a compact chip accent mark without changing chip height', () => {
    render(
      <ProjectSelectorChip
        project={makeProject('MDT', 'Markdown Ticket', 'Accent-enabled selector chip', '#2563eb')}
        onSelect={mock()}
      />,
    )

    const chip = screen.getByTestId('project-selector-chip-MDT')

    expect(chip).toHaveClass('project-chip')
    expect(chip).toHaveClass('h-12')
    expect(chip.style.getPropertyValue('--project-accent')).toBe('#2563eb')
    expect(chip.querySelector('.project-chip__accent-mark')).toBeInTheDocument()
  })

  it('renders a filled browser-card identity area with no image fallback by default', () => {
    render(
      <ProjectSelectorCard
        project={makeProject('API', 'Service Gateway', 'Project browser accent treatment', '#dc2626')}
        isActive={false}
        onSelect={mock()}
        showDescription={true}
        testIdPrefix="project-browser-card"
      />,
    )

    const card = screen.getByTestId('project-browser-card-API')
    const identity = card.querySelector('.project-card__identity') as HTMLElement | null

    expect(card).toHaveClass('project-card')
    expect(card).toHaveClass('min-h-12')
    expect(card.style.getPropertyValue('--project-accent')).toBe('#dc2626')
    expect(identity).toBeInTheDocument()
    expect(identity?.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders repeated accents and long project labels without dropping identity marks', () => {
    render(
      <div>
        <ProjectSelectorChip
          project={makeProject('OPS', 'Operations Console', 'Shared accent one', '#0d9488')}
          onSelect={mock()}
        />
        <ProjectSelectorCard
          project={makeProject(
            'BILLING-LONG',
            'Billing and revenue workspace with a long descriptive project name',
            'Shared accent two',
            '#0d9488',
          )}
          isActive={false}
          onSelect={mock()}
          showDescription={true}
          testIdPrefix="project-browser-card"
        />
      </div>,
    )

    const chip = screen.getByTestId('project-selector-chip-OPS')
    const card = screen.getByTestId('project-browser-card-BILLING-LONG')

    expect(chip.style.getPropertyValue('--project-accent')).toBe('#0d9488')
    expect(card.style.getPropertyValue('--project-accent')).toBe('#0d9488')
    expect(chip.querySelector('.project-chip__accent-mark')).toBeInTheDocument()
    expect(card.querySelector('.project-card__identity')).toBeInTheDocument()
    expect(screen.getByText('Billing and revenue workspace with a long descriptive project name')).toBeInTheDocument()
  })
})
