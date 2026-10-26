import { z } from 'zod'
import { CreateTicketInputSchema } from '../ticket/input'

// Disk replay shapes, not cloud HTTP response contracts. Keep historical string
// spellings; validate every field consumed by recovery before replay can begin.
export const PersistedProjectedHeaderSchema = z.object({
  creationId: z.string().uuid().optional(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  type: z.string().nullable(),
  priority: z.string().nullable(),
  assignee: z.string().nullable(),
  date_created: z.string().nullable(),
  last_modified: z.string(),
})
const integer = z.number().refine(Number.isInteger)
export const PendingOperationFileSchema = z.object({
  creationId: z.string().uuid().optional(),
  minimumTicketNumber: z.number().int().positive().max(Number.MAX_SAFE_INTEGER - 1).optional(),
  protocolVersion: z.literal(2).optional(),
  cloudProjectId: z.string(),
  idempotencyKey: z.string(),
  requestHash: z.string(),
  operationId: z.string(),
  reservationId: z.string().optional(),
  ticketNumber: z.number().int().positive().max(Number.MAX_SAFE_INTEGER - 1).optional(),
  draft: z.object({
    crType: z.string(),
    // A stored draft is not a new mutation request. Legacy strings remain
    // service-owned, including priority aliases and untrimmed titles.
    data: CreateTicketInputSchema.extend({
      title: z.string(),
      type: z.string(),
      priority: z.string().optional(),
    }).passthrough(),
  }).optional(),
  acknowledgement: z.object({
    operationId: z.string(),
    contentHash: z.string(),
    header: PersistedProjectedHeaderSchema,
  }).optional(),
  state: z.enum(['pending', 'reserved', 'written', 'acknowledged']),
  createdAt: z.string(),
  updatedAt: z.string(),
}).refine(value => value.protocolVersion !== 2 || value.ticketNumber === undefined || (value.minimumTicketNumber !== undefined && value.ticketNumber >= value.minimumTicketNumber), 'Held reservation must satisfy the journaled minimum')
export const PendingProjectionFileSchema = z.object({
  ticketNumber: integer,
  baseContentHash: z.string(),
  contentHash: z.string(),
  header: PersistedProjectedHeaderSchema,
  lifecycle: z.enum(['active', 'deleted']),
  operationId: z.string(),
  projectionVersion: integer,
  state: z.enum(['pending', 'conflict', 'unmanaged', 'authentication_paused']),
  updatedAt: z.string(),
})
const entry = z.object({
  ticketNumber: integer,
  projectionVersion: integer,
  projectRevision: integer,
  lifecycle: z.enum(['active', 'deleted']),
  header: PersistedProjectedHeaderSchema,
})
export const ProjectionReadModelFileSchema = z.object({
  cloudProjectId: z.string().nullish(),
  appliedCursor: z.number().catch(0),
  entries: z.record(z.string(), entry).nullish(),
})
