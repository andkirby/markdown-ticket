import { z } from 'zod'
import { TicketFrontmatterSchema } from './frontmatter'

export interface TicketData {
  title: string
  type: string
  priority?: string
  phaseEpic?: string
  impactAreas?: string[]
  relatedTickets?: string | string[]
  dependsOn?: string | string[]
  blocks?: string | string[]
  assignee?: string
  content?: string
  description?: string
  rationale?: string
  /** Explicit slug for filename (e.g. 'paste-to-shell'). Falls back to title-derived slug when absent. */
  slug?: string
}

export interface TicketUpdateAttrs {
  priority?: string
  phaseEpic?: string
  relatedTickets?: string | string[]
  dependsOn?: string | string[]
  blocks?: string | string[]
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string
}

export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  dateRange?: {
    start?: Date
    end?: Date
  }
}

export const TICKET_UPDATE_ATTRS = [
  'priority',
  'phaseEpic',
  'relatedTickets',
  'dependsOn',
  'blocks',
  'assignee',
  'implementationDate',
  'implementationNotes',
] as const satisfies readonly (keyof TicketUpdateAttrs)[]

export const TICKET_UPDATE_ALLOWED_ATTRS = new Set<keyof TicketUpdateAttrs>(TICKET_UPDATE_ATTRS)

const RelationshipInputSchema = z.union([z.string(), z.array(z.string())])

export const CreateTicketInputSchema = TicketFrontmatterSchema.pick({
  title: true,
  type: true,
  priority: true,
  phaseEpic: true,
  impactAreas: true,
  assignee: true,
  content: true,
}).extend({
  relatedTickets: RelationshipInputSchema.optional(),
  dependsOn: RelationshipInputSchema.optional(),
  blocks: RelationshipInputSchema.optional(),
  description: z.string().optional(),
  rationale: z.string().optional(),
})

export const UpdateTicketInputSchema = z.object({
  priority: TicketFrontmatterSchema.shape.priority.optional(),
  phaseEpic: TicketFrontmatterSchema.shape.phaseEpic,
  relatedTickets: RelationshipInputSchema.optional(),
  dependsOn: RelationshipInputSchema.optional(),
  blocks: RelationshipInputSchema.optional(),
  assignee: TicketFrontmatterSchema.shape.assignee,
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  implementationNotes: z.string().optional(),
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' },
)

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>
