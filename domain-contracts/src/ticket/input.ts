import type { CRLevelValue } from '../types/schema'
import { z } from 'zod'
import { CRStatusSchema } from '../types/schema'
import { ExternalReferencesSchema } from './external-reference'
import { TicketFrontmatterSchema } from './frontmatter'

export interface TicketData {
  refs?: string[]
  title: string
  type: string
  priority?: string
  level?: CRLevelValue
  phaseEpic?: string
  impactAreas?: string[]
  relatedTickets?: string | string[]
  dependsOn?: string | string[]
  blocks?: string | string[]
  assignee?: string
  component?: string
  content?: string
  description?: string
  rationale?: string
  /** Explicit slug for filename (e.g. 'paste-to-shell'). Falls back to title-derived slug when absent. */
  slug?: string
}

export interface TicketUpdateAttrs {
  refs?: string[] | string
  priority?: string
  level?: CRLevelValue
  phaseEpic?: string
  relatedTickets?: string | string[]
  dependsOn?: string | string[]
  blocks?: string | string[]
  assignee?: string
  component?: string
  implementationDate?: Date | null
  implementationNotes?: string
}

export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  level?: CRLevelValue | CRLevelValue[]
  assignee?: string | string[]
  component?: string | string[]
  phaseEpic?: string | string[]
  /** Derived multi-select; v1.1 facet. Each value OR-combines within the facet. */
  impactAreas?: string | string[]
  /** Boolean facet; v1.1. `true` or `false` narrows; `undefined` = all. */
  inWorktree?: boolean
  /** Frontend free-text: multi-term AND over title/code/description. AND-combines with every facet. */
  query?: string
  dateRange?: {
    start?: Date
    end?: Date
  }
}

export const TICKET_UPDATE_ATTRS = [
  'refs',
  'priority',
  'level',
  'phaseEpic',
  'relatedTickets',
  'dependsOn',
  'blocks',
  'assignee',
  'component',
  'implementationDate',
  'implementationNotes',
] as const satisfies readonly (keyof TicketUpdateAttrs)[]

export const TICKET_UPDATE_ALLOWED_ATTRS = new Set<keyof TicketUpdateAttrs>(
  TICKET_UPDATE_ATTRS,
)

const RelationshipInputSchema = z.union([z.string(), z.array(z.string())])

export const CreateTicketInputSchema = TicketFrontmatterSchema.pick({
  title: true,
  type: true,
  priority: true,
  level: true,
  phaseEpic: true,
  impactAreas: true,
  assignee: true,
  content: true,
  refs: true,
}).extend({
  // Creation warns about long titles in TemplateService; it does not trim them.
  title: z.string().refine(value => value.trim().length > 0, 'Title is required'),
  priority: TicketFrontmatterSchema.shape.priority.optional(),
  assignee: z.string().optional(),
  component: z.string().optional(),
  slug: z.string().optional(),
  relatedTickets: RelationshipInputSchema.optional(),
  dependsOn: RelationshipInputSchema.optional(),
  blocks: RelationshipInputSchema.optional(),
  description: z.string().optional(),
  rationale: z.string().optional(),
})

export const UpdateTicketInputSchema = z
  .object({
    refs: ExternalReferencesSchema.optional(),
    priority: TicketFrontmatterSchema.shape.priority.optional(),
    level: TicketFrontmatterSchema.shape.level,
    phaseEpic: TicketFrontmatterSchema.shape.phaseEpic,
    relatedTickets: RelationshipInputSchema.optional(),
    dependsOn: RelationshipInputSchema.optional(),
    blocks: RelationshipInputSchema.optional(),
    assignee: TicketFrontmatterSchema.shape.assignee,
    component: z.string().optional(),
    implementationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
      .optional(),
    implementationNotes: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>

// Leave alias normalization to the existing service. Unknown-only updates stay
// nonempty no-ops; ignored keys must not accidentally become forwarded fields.
export const PatchTicketInputSchema = z.looseObject({
  refs: ExternalReferencesSchema.optional(),
  status: CRStatusSchema.optional(),
  priority: z.string().optional(),
  level: z.string().refine(value => ['ticket', 'epic', 'e', 't'].includes(value.trim().toLowerCase()), 'Invalid level').optional(),
  phaseEpic: z.string().optional(),
  assignee: z.string().optional(),
  relatedTickets: RelationshipInputSchema.optional(),
  dependsOn: RelationshipInputSchema.optional(),
  blocks: RelationshipInputSchema.optional(),
}).refine(value => Object.keys(value).length > 0, 'No update data provided')

/** MCP attribute operations preserve aliases and null-as-no-op handling. */
export const TicketAttributeInputSchema = z.object({
  refs: z.union([z.string(), ExternalReferencesSchema]).nullish(),
  priority: z.string().nullish(),
  level: z.string().nullish(),
  phaseEpic: z.string().nullish(),
  relatedTickets: RelationshipInputSchema.nullish(),
  dependsOn: RelationshipInputSchema.nullish(),
  blocks: RelationshipInputSchema.nullish(),
  assignee: z.string().nullish(),
  component: z.string().nullish(),
  implementationDate: z.string().nullish(),
  implementationNotes: z.string().nullish(),
}).catchall(z.union([z.string(), z.array(z.string()), z.number(), z.boolean(), z.null()]))

// String shorthand and whitespace/lowercase forms match shared normalizeKey.
export const TicketKeyInputSchema = z.string().refine((value) => {
  const key = value.trim()
  return /^\d+$/.test(key) || /^[a-z][a-z0-9]{1,4}-\d+$/i.test(key)
}, 'Invalid ticket key')

export type PatchTicketInput = z.output<typeof PatchTicketInputSchema>
