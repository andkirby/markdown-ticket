import type { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import type { TemplateService } from '@mdt/shared/services/TemplateService.js'
import type { TicketService } from '@mdt/shared/services/TicketService.js'
import type { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import type { CRService } from '../../../services/crService.js'
import { createMockProject, createMockTicket } from '../../__tests__/test-fixtures.js'
import { CRHandlers } from '../crHandlers.js'

const diagnostic = { code: 'TICKET_TEMPLATE_UNFILLED', severity: 'warning', message: 'Created with template placeholders. The body is unfinished; replace instructions before committing.', ticketKey: 'MDT-001', filePath: 'docs/CRs/MDT-001-example.md' }

describe('MDT-261 MCP creation metadata', () => {
  it('renders successful creation and the shared diagnostic exactly once', async () => {
    const ticket = createMockTicket({ code: 'MDT-001' })
    const createCRWithDiagnostics = jest.fn().mockResolvedValue({ ticket, diagnostics: [diagnostic] })
    const handler = new CRHandlers(
      { createCRWithDiagnostics } as unknown as CRService,
      {} as MarkdownService,
      {} as TitleExtractionService,
      { validateTicketData: () => ({ valid: true, errors: [], warnings: [] }) } as unknown as TemplateService,
      {} as TicketService,
    )
    const result = await handler.handleCreateCR(createMockProject(), 'Architecture', { title: 'Example architecture' })
    expect(createCRWithDiagnostics).toHaveBeenCalledTimes(1)
    expect(result).toContain('Created CR MDT-001')
    expect(result.split(diagnostic.message)).toHaveLength(2)
    expect(result).toContain(diagnostic.filePath)
    expect(result).not.toContain('complete template including')
  })
})
