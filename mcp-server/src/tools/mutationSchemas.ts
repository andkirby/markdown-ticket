import { CreateTicketInputSchema, CRStatusSchema, CRTypeSchema, ProjectReferenceInputSchema, TicketAttributeInputSchema, TicketKeyInputSchema } from '@mdt/domain-contracts'
import { z } from 'zod'

const project = ProjectReferenceInputSchema.optional()
export const KeyArgsSchema = z.object({ project, key: TicketKeyInputSchema })
export const CreateArgsSchema = z.object({
  project,
  // The legacy dispatcher also allowed key-derived context on create.
  key: TicketKeyInputSchema.optional(),
  type: CRTypeSchema,
  data: CreateTicketInputSchema.extend({ type: CRTypeSchema.optional() }),
})
export const StatusArgsSchema = KeyArgsSchema.extend({ status: CRStatusSchema })
export const AttributesArgsSchema = KeyArgsSchema.extend({ attributes: TicketAttributeInputSchema })

const section = z.string().refine(value => value.trim().length > 0, 'Section is required')
const content = z.string().refine(value => value.trim().length > 0, 'Content is required')
export const SectionArgsSchema = z.discriminatedUnion('operation', [
  KeyArgsSchema.extend({ operation: z.literal('list'), section: z.string().optional(), content: z.string().optional() }),
  KeyArgsSchema.extend({ operation: z.literal('get'), section, content: z.string().optional() }),
  KeyArgsSchema.extend({ operation: z.enum(['replace', 'update', 'append', 'prepend']), section, content }),
])
