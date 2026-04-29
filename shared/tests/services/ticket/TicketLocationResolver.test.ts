import type { Project } from '../../../models/Project.js'
import { TicketLocationResolver } from '../../../services/ticket/TicketLocationResolver.js'

const baseProject: Project = {
  id: 'mdt',
  project: {
    id: 'mdt',
    name: 'Markdown Ticket',
    code: 'MDT',
    path: '/repo',
    configFile: '/repo/.mdt-config.toml',
    ticketsPath: 'docs/CRs',
    description: '',
    repository: '',
    active: true,
  },
  metadata: {
    dateRegistered: '2026-03-17',
    lastAccessed: '2026-03-17',
    version: '1.0.0',
  },
}

describe('TicketLocationResolver', () => {
  it('uses the project root when worktrees are disabled', async () => {
    const resolver = new TicketLocationResolver(
      {
        getProjectConfig: () => ({
          project: {
            path: '.',
            code: 'MDT',
            ticketsPath: 'docs/CRs',
            name: 'Markdown Ticket',
            active: true,
          },
          worktree: { enabled: false },
        }),
      },
      {
        resolvePath: jest.fn(),
      } as never,
    )

    await expect(resolver.resolve(baseProject, 'MDT-138')).resolves.toEqual({
      projectRoot: '/repo',
      ticketDir: '/repo/docs/CRs/MDT-138',
      ticketsPath: 'docs/CRs',
      isWorktree: false,
      allowSymlinks: false,
    })
  })

  it('returns the resolved worktree path when enabled', async () => {
    const resolvePath = jest.fn().mockResolvedValue('/repo/.gitWT/MDT-138')
    const resolver = new TicketLocationResolver(
      {
        getProjectConfig: () => ({
          project: {
            path: '.',
            code: 'MDT',
            ticketsPath: 'docs/CRs',
            name: 'Markdown Ticket',
            active: true,
          },
          worktree: { enabled: true },
        }),
      },
      {
        resolvePath,
      } as never,
    )

    await expect(resolver.resolve(baseProject, 'MDT-138')).resolves.toEqual({
      projectRoot: '/repo/.gitWT/MDT-138',
      ticketDir: '/repo/.gitWT/MDT-138/docs/CRs/MDT-138',
      ticketsPath: 'docs/CRs',
      isWorktree: true,
      allowSymlinks: false,
    })

    expect(resolvePath).toHaveBeenCalledWith('/repo', 'MDT-138', 'docs/CRs', 'MDT')
  })
})
