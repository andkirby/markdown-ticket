import { TicketDiagnosticSchema } from '../creation-result'

describe('MDT-261 operation diagnostic contract', () => {
  const diagnostic = { code: 'TICKET_CONTENT_UNFILLED', severity: 'warning', message: 'Complete the ticket before committing.', ticketKey: 'TEST-001', filePath: 'tickets/TEST-001.md', line: 4 }
  it('accepts contextual operation metadata', () => expect(TicketDiagnosticSchema.parse(diagnostic)).toEqual(diagnostic))
  it.each([{ severity: 'info' }, { line: 0 }, { message: '' }])('rejects invalid diagnostic fields %j', (invalid) => {
    expect(TicketDiagnosticSchema.safeParse({ ...diagnostic, ...invalid }).success).toBe(false)
  })
})
