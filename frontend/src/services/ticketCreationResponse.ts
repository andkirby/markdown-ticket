import type { Ticket } from '../types'
import { TicketDiagnosticSchema } from '@mdt/domain-contracts'
import { normalizeTicket } from '@mdt/shared/models/Ticket'
import { toast } from 'sonner'

/** Render operation metadata once, then return only the created entity. */
export function readTicketCreationResponse(payload: unknown): Ticket {
  const response = typeof payload === 'object' && payload !== null
    ? payload as Record<string, unknown>
    : {}
  const ticket = normalizeTicket(response.ticket ?? payload)
  const diagnostics = TicketDiagnosticSchema.array().safeParse(response.diagnostics ?? [])
  if (!diagnostics.success)
    return ticket

  const seen = new Set<string>()
  for (const diagnostic of diagnostics.data) {
    const id = [diagnostic.ticketKey, diagnostic.code, diagnostic.filePath, diagnostic.line, diagnostic.section].join(':')
    if (seen.has(id))
      continue
    seen.add(id)
    try {
      toast.warning(`${ticket.code} created`, {
        id,
        description: `${diagnostic.message}\n${diagnostic.filePath}`,
        duration: Infinity,
        closeButton: true,
      })
    }
    catch {
      // A presentation failure must never invite a duplicate create retry.
    }
  }
  return ticket
}
