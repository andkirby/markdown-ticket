import { z } from 'zod'
import { PROJECT_CODE_PATTERN_BODY } from '../project/code'
import { CRLevelSchema, CRPrioritySchema, CRStatusSchema, CRTypeSchema } from '../types/schema'
import { ExternalReferencesSchema } from './external-reference'

/**
 * Canonical ticket-number digit bounds (MDT-254).
 *
 * Stored keys zero-pad to at least MIN digits ("MDT-001"); wider numbers keep
 * their natural width up to MAX ("MDT-10000"), matching `formatCrKey` in
 * shared/utils/keyNormalizer.ts. Every ticket-key regex — storage validation,
 * user input, filenames, branch names, prose tokens — must derive from
 * PROJECT_CODE_PATTERN and these bounds. No parallel patterns.
 */
export const TICKET_NUMBER_MIN_DIGITS = 3
export const TICKET_NUMBER_MAX_DIGITS = 5

/** Anchor-free canonical syntax for paths, filenames, branches and prose. */
export const TICKET_KEY_PATTERN_BODY
  = `${PROJECT_CODE_PATTERN_BODY}-\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}}`

/**
 * CR code pattern for validation and OpenAPI schemas (canonical stored form).
 * Format: PROJECT_CODE_PATTERN-123 where PROJECT_CODE_PATTERN is 2-5 alphanumeric chars (first must be letter)
 */
export const CR_CODE_PATTERN = new RegExp(
  `^${TICKET_KEY_PATTERN_BODY}$`,
)

/**
 * Parse user-supplied ticket key input.
 * Case-insensitive, non-padded numbers, with capture groups:
 *   [1] = project code prefix (e.g. "MDT")
 *   [2] = ticket number (e.g. "42")
 */
export const TICKET_KEY_INPUT_PATTERN = new RegExp(
  `^(${PROJECT_CODE_PATTERN_BODY})-(\\d{1,${TICKET_NUMBER_MAX_DIGITS}})$`,
  'i',
)

/**
 * Parse @CODE query syntax for project-scoped search.
 * Case-insensitive, with capture groups:
 *   [1] = project code (e.g. "MDT")
 *   [2] = search text after the space
 */
export const PROJECT_SCOPE_INPUT_PATTERN = new RegExp(
  `^@(${PROJECT_CODE_PATTERN_BODY})\\s+([^\\n]*)$`,
  'i',
)

const TrimmedTitleSchema = z.string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less')
  .refine(title => title.trim().length > 0, 'Title cannot be empty or whitespace-only')
  .transform(title => title.trim())

const ISODateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')

export const TicketFrontmatterSchema = z.object({
  creationId: z.string().uuid().optional(),
  code: z.string()
    .regex(CR_CODE_PATTERN, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  title: TrimmedTitleSchema,
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  level: CRLevelSchema.optional(),
  phaseEpic: z.string().optional(),
  impactAreas: z.array(z.string()).optional(),
  relatedTickets: z.string().optional(),
  dependsOn: z.string().optional(),
  blocks: z.string().optional(),
  assignee: z.string().email('Invalid email format').optional(),
  component: z.string().optional(),
  refs: ExternalReferencesSchema.optional(),
  content: z.string().optional(),
  implementationDate: ISODateSchema.optional(),
  implementationNotes: z.string().optional(),
})

export type TicketFrontmatter = z.infer<typeof TicketFrontmatterSchema>
