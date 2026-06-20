/**
 * Ticket Validation Functions
 * Validation wrapper using schema from ./schema.ts
 */

import { TicketSchema } from './schema'

/**
 * Validate ticket data using TicketSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateTicket(data: unknown) {
  return TicketSchema.parse(data)
}
