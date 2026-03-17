import { z } from 'zod'
import { TicketFrontmatterSchema, CR_CODE_PATTERN } from './frontmatter'

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

export const CreateTicketInputSchema = TicketFrontmatterSchema.extend({
  description: z.string().optional(),
  rationale: z.string().optional(),
})

export const UpdateTicketInputSchema = CreateTicketInputSchema.omit({
  code: true,
  title: true,
  status: true,
  type: true,
  content: true,
  description: true,
  rationale: true,
}).partial().extend({
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  implementationNotes: z.string().optional(),
}).refine(
  (data) => Object.keys(data).some(key => key !== 'code'),
  { message: 'At least one field must be provided for update' },
)

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>
