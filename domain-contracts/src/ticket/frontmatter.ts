import { z } from 'zod'
import { CRPrioritySchema, CRStatusSchema, CRTypeSchema } from '../types/schema'

/**
 * CR code pattern for validation and OpenAPI schemas
 * Format: PROJECT_CODE_PATTERN-123 where PROJECT_CODE_PATTERN is 2-5 alphanumeric chars (first must be letter)
 */
export const CR_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/

/**
 * Parse user-supplied ticket key input.
 * Case-insensitive, non-padded numbers, with capture groups:
 *   [1] = project code prefix (e.g. "MDT")
 *   [2] = ticket number (e.g. "42")
 */
export const TICKET_KEY_INPUT_PATTERN = /^([A-Z][A-Z0-9]{1,4})-(\d{1,5})$/i

/**
 * Parse @CODE query syntax for project-scoped search.
 * Case-insensitive, with capture groups:
 *   [1] = project code (e.g. "MDT")
 *   [2] = search text after the space
 */
export const PROJECT_SCOPE_INPUT_PATTERN = /^@([A-Z][A-Z0-9]{1,4})\s+(.*)$/i

const TrimmedTitleSchema = z.string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less')
  .refine(title => title.trim().length > 0, 'Title cannot be empty or whitespace-only')
  .transform(title => title.trim())

const ISODateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')

export const TicketFrontmatterSchema = z.object({
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  title: TrimmedTitleSchema,
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  phaseEpic: z.string().optional(),
  impactAreas: z.array(z.string()).optional(),
  relatedTickets: z.string().optional(),
  dependsOn: z.string().optional(),
  blocks: z.string().optional(),
  assignee: z.string().email('Invalid email format').optional(),
  content: z.string().optional(),
  implementationDate: ISODateSchema.optional(),
  implementationNotes: z.string().optional(),
})

export type TicketFrontmatter = z.infer<typeof TicketFrontmatterSchema>
