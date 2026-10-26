import { z } from 'zod'

/** Allocations carrying a durable creation identity and an immutable local floor. */
export const ALLOCATION_PROTOCOL_VERSION = 2 as const
export const CreationIdSchema = z.string().uuid()
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
/** A fresh reservation must leave room for advancing the next-number counter. */
export const MinimumTicketNumberSchema = positiveInteger.max(Number.MAX_SAFE_INTEGER - 1)
const sha256 = z.string().regex(/^[a-f0-9]{64}$/iu).transform(value => value.toLowerCase())
export const AllocationProtocolRequestSchema = z.object({
  protocolVersion: z.literal(ALLOCATION_PROTOCOL_VERSION),
  creationId: CreationIdSchema,
  minimumTicketNumber: MinimumTicketNumberSchema,
  idempotencyKey: z.string().min(1).max(200),
  requestHash: sha256,
})
export type AllocationProtocolRequest = z.infer<typeof AllocationProtocolRequestSchema>

const claimState = z.enum(['reserved', 'acknowledged', 'abandoned', 'orphaned', 'unreserved'])
export const TicketClaimResponseSchema = z.object({
  protocolVersion: z.literal(ALLOCATION_PROTOCOL_VERSION),
  ticketNumber: positiveInteger,
  reservationId: z.string().nullable(),
  creationId: CreationIdSchema.nullable(),
  state: claimState,
})
export type TicketClaimResponse = z.infer<typeof TicketClaimResponseSchema>

export const TicketIdentityDiagnosticSchema = z.object({
  code: z.string(),
  filePath: z.string(),
  state: z.enum(['verified', 'conflict', 'unmanaged', 'verification_pending']),
  message: z.string(),
  cause: z.enum(['worktree_unavailable', 'tickets_directory_unavailable', 'permission_denied', 'unsupported_ticket_number', 'number_range_exhausted', 'invalid_ticket']).optional(),
  nextAction: z.string().optional(),
  lastVerifiedAt: z.iso.datetime().optional(),
  stale: z.boolean().optional(),
})
export type TicketIdentityDiagnostic = z.infer<typeof TicketIdentityDiagnosticSchema>

const date = z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Invalid date')
const reviewedHeader = z.object({
  code: z.string().min(1).max(64),
  creationId: CreationIdSchema,
  title: z.string().min(1).max(500),
  status: z.string().min(1).max(100),
  type: z.string().max(100).nullable(),
  priority: z.string().max(100).nullable(),
  assignee: z.string().max(320).nullable(),
  date_created: date.nullable(),
  last_modified: date,
})
export const CounterReconciliationRequestSchema = z.object({
  operationId: z.string().uuid(),
  dryRun: z.boolean(),
  expectedNextTicketNumber: positiveInteger,
  expectedProjectionRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  reason: z.string().min(1).max(1000),
  canonicalTickets: z.array(z.object({
    ticketNumber: MinimumTicketNumberSchema,
    creationId: CreationIdSchema,
    header: reviewedHeader,
    contentHash: sha256,
    expectedReservationId: z.string().min(1).max(200).nullable(),
    expectedCreationId: CreationIdSchema.nullable(),
    expectedState: claimState,
    expectedProjectionVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  }).refine(value => value.header.creationId === value.creationId, 'Header and reviewed creation identities must match'))
    .max(200)
    .refine(values => new Set(values.map(value => value.ticketNumber)).size === values.length, 'Duplicate reviewed ticket numbers')
    .refine(values => new Set(values.map(value => value.creationId)).size === values.length, 'Duplicate reviewed creation identities'),
})
export type CounterReconciliationRequest = z.infer<typeof CounterReconciliationRequestSchema>
export const CounterReconciliationResponseSchema = z.object({
  operationId: z.string().uuid(),
  dryRun: z.boolean(),
  replayed: z.boolean(),
  previousNextTicketNumber: positiveInteger,
  nextTicketNumber: positiveInteger,
  previousProjectionRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  projectionRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  corrections: z.number().int().nonnegative(),
})
export type CounterReconciliationResponse = z.infer<typeof CounterReconciliationResponseSchema>
