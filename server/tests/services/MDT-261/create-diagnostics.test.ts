import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { TicketService } from '../../../services/TicketService.js'
import { mockCR, mockProject } from '../../utils/setupTests.js'

jest.mock('@mdt/shared/services/TicketService.js', () => jest.requireActual('../../../../shared/services/TicketService.ts'))

describe('MDT-261 HTTP creation result compatibility', () => {
  afterEach(() => jest.restoreAllMocks())
  it('preserves existing fields while forwarding the actual entity and diagnostics', async () => {
    const ticket = { ...mockCR, code: 'MDT-001', filePath: 'docs/CRs/MDT-001-example.md', dateCreated: null, lastModified: null, relatedTickets: [], dependsOn: [], blocks: [] }
    const diagnostic = { code: 'TICKET_TEMPLATE_UNFILLED', severity: 'warning' as const, message: 'Replace unfinished template instructions before committing.', ticketKey: ticket.code, filePath: ticket.filePath }
    const create = jest.spyOn(SharedTicketService.prototype, 'createCRWithDiagnostics').mockResolvedValue({ ticket, diagnostics: [diagnostic] })
    const service = new TicketService({ getAllProjects: async () => [mockProject] })
    const result = await service.createCR(mockProject.id, { title: 'Example', type: 'Architecture', description: ' \n\t' })
    expect(create).toHaveBeenCalledWith(mockProject, 'Architecture', expect.objectContaining({ content: undefined }))
    expect(result).toMatchObject({ success: true, crCode: ticket.code, filename: 'MDT-001-example.md', path: ticket.filePath, ticket, diagnostics: [diagnostic] })
  })
})
