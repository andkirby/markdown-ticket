/**
 * MDT-101 Phase 1: Ticket/CR Schema Validation
 * Core entity schemas with field-level validation only
 */

import {z} from 'zod'
import {CRPrioritySchema, CRStatusSchema, CRTypeSchema} from '../types/schema'
import {PROJECT_CODE_PATTERN} from '../project/schema'
import {SubDocumentSchema, type SubDocument} from './subdocument'

/**
 * CR code pattern for validation and OpenAPI schemas
 * Format: PROJECT_CODE_PATTERN-123 where PROJECT_CODE_PATTERN is 2-5 alphanumeric chars (first must be letter)
 */
export const CR_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/

export interface Ticket {
  code: string
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  content: string
  filePath: string
  phaseEpic?: string
  description?: string
  rationale?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string
  impactAreas?: string[]
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
  inWorktree?: boolean
  worktreePath?: string
  subdocuments?: SubDocument[]
}

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

export type TicketMetadata = Omit<Ticket, 'content'>

const DateFieldSchema = z.date().nullable()

/**
 * Base CR schema with field validation
 * Core CR entity with required and optional fields
 */
export const CRSchema = z.object({
  /** CR code: PREFIX-123 format (e.g., MDT-101) */
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  /** CR title: required, max 200 characters */
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .refine(title => title.trim().length > 0, 'Title cannot be empty or whitespace-only')
    .transform(title => title.trim()),
  /** CR status from predefined enum */
  status: CRStatusSchema,
  /** CR type from predefined enum */
  type: CRTypeSchema,
  /** CR priority from predefined enum */
  priority: CRPrioritySchema,
  /** Optional phase or epic identifier */
  phaseEpic: z.string().optional(),
  /** Optional areas impacted by this CR */
  impactAreas: z.array(z.string()).optional(),
  /** Optional comma-separated list of related ticket codes */
  relatedTickets: z.string().optional(),
  /** Optional comma-separated list of dependencies */
  dependsOn: z.string().optional(),
  /** Optional comma-separated list of tickets blocked by this CR */
  blocks: z.string().optional(),
  /** Optional assignee email address */
  assignee: z.string().email('Invalid email format').optional(),
  /** Full CR content in markdown format */
  content: z.string().optional(),
  /** Optional implementation date in YYYY-MM-DD format */
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  /** Optional implementation notes */
  implementationNotes: z.string().optional(),
})

/**
 * Ticket schema (normalized app shape)
 */
export const TicketSchema: z.ZodType<Ticket> = z.object({
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  dateCreated: DateFieldSchema,
  lastModified: DateFieldSchema,
  content: z.string(),
  filePath: z.string(),
  phaseEpic: z.string().optional(),
  description: z.string().optional(),
  rationale: z.string().optional(),
  assignee: z.string().optional(),
  implementationDate: DateFieldSchema.optional(),
  implementationNotes: z.string().optional(),
  impactAreas: z.array(z.string()).optional(),
  relatedTickets: z.array(z.string()),
  dependsOn: z.array(z.string()),
  blocks: z.array(z.string()),
  inWorktree: z.boolean().optional(),
  worktreePath: z.string().optional(),
  subdocuments: z.array(SubDocumentSchema).optional(),
})

/**
 * Input schema for creating tickets
 * Only required fields, no default values applied
 */
export const CreateTicketInputSchema = CRSchema.extend({
  description: z.string().optional(),
  rationale: z.string().optional(),
})

/**
 * Input schema for updating tickets
 * Partial update with code required for identification
 */
export const UpdateTicketInputSchema = CreateTicketInputSchema.omit({
  code: true,
  title: true,
  status: true,
  type: true,
  content: true,
  description: true,
  rationale: true,
}).partial().extend({
  /** CR code: required for identification */
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  implementationNotes: z.string().optional(),
}).refine(
  (data) => {
    // At least one field besides code must be provided for update
    const fieldsToUpdate = Object.keys(data).filter(key => key !== 'code')
    return fieldsToUpdate.length > 0
  },
  {
    message: 'At least one field must be provided for update',
  },
)

// TypeScript types inferred from schemas
export type CR = z.infer<typeof CRSchema>
export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>

/**
 * Export all schemas for use in other modules
 */
export const TicketSchemas = {
  ticket: TicketSchema,
  cr: CRSchema,
  createTicketInput: CreateTicketInputSchema,
  updateTicketInput: UpdateTicketInputSchema,
} as const

/**
 * Export individual enum schemas for convenience
 */
export {CRPrioritySchema, CRStatusSchema, CRTypeSchema} from '../types/schema'
