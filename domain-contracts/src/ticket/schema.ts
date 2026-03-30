/**
 * Compatibility entrypoint for ticket contracts.
 * Canonical entity/boundary schemas live in entity.ts, frontmatter.ts, and input.ts.
 */

import { TicketSchema } from './entity'
import { TicketFrontmatterSchema } from './frontmatter'
import { CreateTicketInputSchema, UpdateTicketInputSchema } from './input'

export { CRPrioritySchema, CRStatusSchema, CRTypeSchema } from '../types/schema'
export * from './entity'
export * from './frontmatter'
// Legacy aliases kept while the rest of the repo migrates to clearer names.
export {
  TicketFrontmatterSchema as CRSchema,
} from './frontmatter'

export type {
  TicketFrontmatter as CR,
} from './frontmatter'

export * from './input'

export const TicketSchemas = {
  ticket: TicketSchema,
  frontmatter: TicketFrontmatterSchema,
  cr: TicketFrontmatterSchema,
  createTicketInput: CreateTicketInputSchema,
  updateTicketInput: UpdateTicketInputSchema,
} as const

export * from './subdocument'
