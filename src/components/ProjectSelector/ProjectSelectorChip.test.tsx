import type { ProjectWithSelectorState } from './types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ProjectSelectorChip } from './ProjectSelectorChip'

function makeProject(accent?: string): ProjectWithSelectorState {
  return {
    id: 'mdt',
    project: {
      id: 'mdt',
      code: 'MDT',
      name: 'Markdown Ticket',
      path: '/tmp/mdt',
      configFile: '/tmp/mdt/.mdt-config.toml',
      active: true,
      description: 'Current project',
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
      ...(accent ? { accent } : {}),
    } as any,
    favorite: false,
    lastUsedAt: null,
    count: 0,
  }
}

describe('ProjectSelectorChip accent rendering - MDT-181', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a compact accent identity mark for a configured accent', () => {
    render(<ProjectSelectorChip project={makeProject('#2563eb')} onSelect={mock()} />)

    const chip = screen.getByTestId('project-selector-chip-MDT')
    expect(chip.querySelector('.project-chip__accent-mark')).toBeInTheDocument()
    expect(chip.getAttribute('style') || '').toContain('--project-accent')
  })

  it('renders a deterministic fallback accent when no user accent is configured', () => {
    render(<ProjectSelectorChip project={makeProject()} onSelect={mock()} />)

    const chip = screen.getByTestId('project-selector-chip-MDT')
    expect(chip.querySelector('.project-chip__accent-mark')).toBeInTheDocument()
    expect(chip.getAttribute('style') || '').toContain('--project-accent')
  })
})
