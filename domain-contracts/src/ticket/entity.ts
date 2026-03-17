import { z } from 'zod'
import { CRPrioritySchema, CRStatusSchema, CRTypeSchema } from '../types/schema'
import { CR_CODE_PATTERN } from './frontmatter'
import { SubDocumentSchema, type SubDocument } from './subdocument'

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

export type TicketMetadata = Omit<Ticket, 'content'>

const NullableDateSchema = z.date().nullable()

export const TicketSchema: z.ZodType<Ticket> = z.object({
  code: z.string().regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  dateCreated: NullableDateSchema,
  lastModified: NullableDateSchema,
  content: z.string(),
  filePath: z.string(),
  phaseEpic: z.string().optional(),
  description: z.string().optional(),
  rationale: z.string().optional(),
  assignee: z.string().optional(),
  implementationDate: NullableDateSchema.optional(),
  implementationNotes: z.string().optional(),
  impactAreas: z.array(z.string()).optional(),
  relatedTickets: z.array(z.string()),
  dependsOn: z.array(z.string()),
  blocks: z.array(z.string()),
  inWorktree: z.boolean().optional(),
  worktreePath: z.string().optional(),
  subdocuments: z.array(SubDocumentSchema).optional(),
})
