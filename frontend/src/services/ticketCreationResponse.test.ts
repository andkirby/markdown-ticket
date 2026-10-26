import { beforeEach, describe, expect, mock, test } from 'bun:test'

const warning = mock((_message: string, _options: Record<string, unknown>) => undefined)
mock.module('sonner', () => ({ toast: { warning } }))
const { readTicketCreationResponse } = await import('./ticketCreationResponse')
const ticket = { code: 'TEST-001', title: 'Created ticket', status: 'Proposed', type: 'Feature Enhancement', priority: 'Medium', content: '# Created ticket', filePath: 'tickets/TEST-001.md' }
const diagnostic = { code: 'TICKET_TEMPLATE_UNFILLED', severity: 'warning', message: 'The ticket body is unfinished. Replace template instructions before committing.', ticketKey: ticket.code, filePath: ticket.filePath }

describe('MDT-261 browser creation feedback', () => {
  beforeEach(() => warning.mockClear())
  test('unwraps the created ticket without storing operation metadata', () => {
    const result = readTicketCreationResponse({ success: true, ticket, diagnostics: [diagnostic, diagnostic] })
    expect(result.code).toBe(ticket.code)
    expect(result).not.toHaveProperty('diagnostics')
    expect(warning).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(warning.mock.calls)).toContain(diagnostic.message)
    expect(warning.mock.calls[0][1].duration).toBe(Infinity)
    expect(warning.mock.calls[0][1].closeButton).toBe(true)
  })
  test('retains legacy ticket responses and clean creation without warning', () => {
    expect(readTicketCreationResponse(ticket).code).toBe(ticket.code)
    expect(warning).not.toHaveBeenCalled()
  })
  test('does not turn successful creation into a failure if toast presentation throws', () => {
    warning.mockImplementationOnce(() => {
      throw new Error('presentation unavailable')
    })
    expect(readTicketCreationResponse({ ticket, diagnostics: [diagnostic] }).code).toBe(ticket.code)
  })
})
