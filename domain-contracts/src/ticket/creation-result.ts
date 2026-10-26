/** Operation metadata: intentionally separate from ticket entities and frontmatter. */
import { z } from 'zod'
import { TicketSchema } from './entity'

export const TicketDiagnosticSchema = z.strictObject({
  code: z.string().min(1),
  severity: z.enum(['warning', 'error']),
  message: z.string().min(1),
  ticketKey: z.string().min(1),
  filePath: z.string().min(1),
  line: z.number().int().positive().optional(),
  section: z.string().min(1).optional(),
  instruction: z.string().min(1).optional(),
  correction: z.string().min(1).optional(),
})

export const TicketCreationResultSchema = z.strictObject({
  ticket: TicketSchema,
  diagnostics: z.array(TicketDiagnosticSchema),
})

export const StagedTicketValidationResultSchema = z.strictObject({
  applicable: z.boolean(),
  checked: z.number().int().nonnegative(),
  diagnostics: z.array(TicketDiagnosticSchema),
})

export type TicketDiagnostic = z.infer<typeof TicketDiagnosticSchema>
export type TicketCreationResult = z.infer<typeof TicketCreationResultSchema>
export type StagedTicketValidationResult = z.infer<typeof StagedTicketValidationResultSchema>
