import { ProjectReferenceInputSchema } from '../../project/input'
import { CreateTicketInputSchema, PatchTicketInputSchema, TicketAttributeInputSchema, TicketKeyInputSchema } from '../input'

describe('mutation input compatibility', () => {
  it('preserves long, untrimmed titles and plain assignees without priority defaults', () => {
    const data = { title: `  ${'x'.repeat(250)}  `, type: 'Research', assignee: 'plain-user', component: 'api', slug: 'chosen' }
    expect(CreateTicketInputSchema.parse(data)).toEqual(data)
  })
  it.each(['1', '0001', 'mdt-1', ' MDT-100000 '])('accepts key %s without normalization', key => expect(TicketKeyInputSchema.parse(key)).toBe(key))
  it.each([' mdt ', '01', 'GLO1', ''])('preserves project reference %s', project => expect(ProjectReferenceInputSchema.parse(project)).toBe(project))
  it.each(['e', 't', 'ticket', 'epic', ' E '])('preserves level alias %s', level => expect(PatchTicketInputSchema.parse({ level })).toEqual({ level }))
  it('preserves unknown-only no-op PATCH and null attribute no-op', () => {
    expect(PatchTicketInputSchema.parse({ implementationNotes: 'ignored' })).toEqual({ implementationNotes: 'ignored' })
    expect(TicketAttributeInputSchema.parse({ priority: null })).toEqual({ priority: null })
  })
  it.each([{}, null, [], { status: 'In Progress', priority: {} }, { relatedTickets: [1] }].map(data => ({ data })))('rejects invalid PATCH $data', ({ data }) => expect(PatchTicketInputSchema.safeParse(data).success).toBe(false))
})
