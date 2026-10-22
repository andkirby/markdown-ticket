import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { TicketService } from '../../services/TicketService.js'
import { mockCR, mockProject } from '../utils/setupTests.js'

const project = {
  ...mockProject,
  project: { ...mockProject.project, id: mockProject.id, configFile: 'fixture/.mdt-config.toml', ticketsPath: 'docs/CRs', description: '', repository: '' },
  metadata: { dateRegistered: '2026-01-01', lastAccessed: '2026-01-01', version: '1.0.0' },
}
const ticket = { ...mockCR, dateCreated: null, lastModified: null, relatedTickets: [], dependsOn: [], blocks: [] }

describe('REST create adapter compatibility', () => {
  afterEach(() => jest.restoreAllMocks())
  it('missing priority still defaults Medium and ignored fields cannot acquire effects', async () => {
    const create = jest.spyOn(SharedTicketService.prototype, 'createCR').mockResolvedValue(ticket)
    const service = new TicketService({ getAllProjects: async () => [project] })
    await service.createCR(project.id, { title: '  title  ', type: 'Research' })
    expect(create).toHaveBeenCalledWith(project, 'Research', { title: '  title  ', type: 'Research', priority: 'Medium', level: undefined, content: undefined })
  })
})
