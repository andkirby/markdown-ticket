import { z } from 'zod'
import { CR_CODE_PATTERN } from '../ticket/frontmatter'

export const WorktreeEntrySchema = z.object({
  ticketCode: z.string().regex(CR_CODE_PATTERN, 'Invalid ticket code format. Expected PROJECT_CODE-NUMBER (e.g., MDT-095)'),
  path: z.string(),
  branch: z.string().optional(),
}).strict()

export const WorktreeInfoSchema = z.object({
  ticketCode: z.string().regex(CR_CODE_PATTERN, 'Invalid ticket code format. Expected PROJECT_CODE-NUMBER (e.g., MDT-095)'),
  path: z.string(),
  branch: z.string().optional(),
  exists: z.boolean(),
  hasTicketFile: z.boolean(),
}).strict()

export const WorktreeConfigSchema = z.object({
  enabled: z.boolean().default(true),
}).strict()

export type WorktreeEntry = z.infer<typeof WorktreeEntrySchema>
export type WorktreeInfo = z.infer<typeof WorktreeInfoSchema>
export type WorktreeConfig = z.output<typeof WorktreeConfigSchema>
export type WorktreeEntryInput = z.input<typeof WorktreeEntrySchema>
export type WorktreeEntryOutput = z.output<typeof WorktreeEntrySchema>
export type WorktreeInfoInput = z.input<typeof WorktreeInfoSchema>
export type WorktreeInfoOutput = z.output<typeof WorktreeInfoSchema>
export type WorktreeConfigInput = z.input<typeof WorktreeConfigSchema>
export type WorktreeConfigOutput = z.output<typeof WorktreeConfigSchema>

export function validateWorktreeEntry(input: unknown) {
  return WorktreeEntrySchema.safeParse(input)
}

export function validateWorktreeInfo(input: unknown) {
  return WorktreeInfoSchema.safeParse(input)
}

export function validateWorktreeConfig(input: unknown) {
  return WorktreeConfigSchema.safeParse(input)
}
