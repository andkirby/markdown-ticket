import { z } from 'zod'

// Opaque relative references. Discovery, rather than syntax, authorizes a route.
const journalId = z.string().min(1).max(512).regex(/^[\w-][\w.-]*(?:\/[\w-][\w.-]*)*$/)
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const safeText = z.string().max(200).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 && char !== '/' && char !== '\\'))
const metadata = safeText.min(1)
const ticketNumber = z.number().int().positive().max(Number.MAX_SAFE_INTEGER - 1)

export const CreationRecoveryResumeInputSchema = z.strictObject({ journalId, expectedDigest: digest })
export type CreationRecoveryResumeInput = z.infer<typeof CreationRecoveryResumeInputSchema>

export const CreationRecoveryReconcileInputSchema = CreationRecoveryResumeInputSchema.extend({
  operationId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
})
export type CreationRecoveryReconcileInput = z.infer<typeof CreationRecoveryReconcileInputSchema>

export const CreationRecoveryLockSchema = z.strictObject({
  pid: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  createdAt: z.iso.datetime().max(64).optional(),
  status: z.enum(['live', 'dead', 'unverifiable']),
})
export type CreationRecoveryLock = z.infer<typeof CreationRecoveryLockSchema>

export const CreationRecoveryEntrySchema = z.strictObject({
  journalId,
  digest: digest.nullable(),
  route: z.enum(['current', 'legacy']),
  status: z.enum(['current', 'legacy', 'malformed', 'unreadable', 'oversized', 'lock-only']),
  state: z.enum(['pending', 'reserved', 'written', 'acknowledged']).optional(),
  operationId: metadata.optional(),
  protocolVersion: z.literal(2).optional(),
  creationId: z.uuid().optional(),
  minimumTicketNumber: ticketNumber.optional(),
  reservationId: metadata.optional(),
  ticketNumber: ticketNumber.optional(),
  draftTitle: safeText.optional(),
  lock: CreationRecoveryLockSchema.optional(),
  nextAction: z.enum(['resume', 'archive-terminal', 'manual-review-required', 'verify-lock-owner']),
})
export type CreationRecoveryEntry = z.infer<typeof CreationRecoveryEntrySchema>

export const CreationRecoveryInspectionSchema = z.strictObject({ entries: z.array(CreationRecoveryEntrySchema) })
export type CreationRecoveryInspection = z.infer<typeof CreationRecoveryInspectionSchema>

export const CreationRecoveryOutcomeSchema = z.union([
  z.strictObject({ status: z.enum(['resumed', 'retained', 'manual-review-required']), journalId }),
  z.strictObject({ status: z.literal('archived'), journalId, operationId: z.uuid(), archiveId: journalId, replayed: z.boolean() }),
])
export type CreationRecoveryOutcome = z.infer<typeof CreationRecoveryOutcomeSchema>
