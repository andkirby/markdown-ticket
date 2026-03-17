/**
 * Compatibility entrypoint for ticket contracts.
 * Canonical entity/boundary schemas live in entity.ts, frontmatter.ts, and input.ts.
 */

import { TicketSchema } from './entity'
import { TicketFrontmatterSchema } from './frontmatter'
import { CreateTicketInputSchema, UpdateTicketInputSchema } from './input'

export * from './entity'
export * from './frontmatter'
export * from './input'
export * from './subdocument'

// Legacy aliases kept while the rest of the repo migrates to clearer names.
export {
  TicketFrontmatterSchema as CRSchema,
} from './frontmatter'

export type {
  TicketFrontmatter as CR,
} from './frontmatter'

export const TicketSchemas = {
  ticket: TicketSchema,
  frontmatter: TicketFrontmatterSchema,
  cr: TicketFrontmatterSchema,
  createTicketInput: CreateTicketInputSchema,
  updateTicketInput: UpdateTicketInputSchema,
} as const

export { CRPrioritySchema, CRStatusSchema, CRTypeSchema } from '../types/schema'
