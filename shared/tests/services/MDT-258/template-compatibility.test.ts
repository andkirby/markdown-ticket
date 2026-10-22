import { CreateTicketInputSchema } from '@mdt/domain-contracts'
import { TemplateService } from '../../../services/TemplateService.js'

describe('MDT-258 service-owned create warnings', () => {
  it('retains long-title and missing-priority warnings after input parsing', () => {
    const service = new TemplateService(undefined, true)
    const input = CreateTicketInputSchema.parse({ title: 'x'.repeat(250), type: 'Research', assignee: 'plain-user' })
    const validation = service.validateTicketData(input, 'Research')
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
    expect(validation.warnings).toEqual(expect.arrayContaining([
      { field: 'title', message: 'Title is very long, consider shortening' },
      { field: 'priority', message: 'Priority not specified, will default to Medium' },
    ]))
  })
})
