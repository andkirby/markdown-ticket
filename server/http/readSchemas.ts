import { ReadTokenCreateInputSchema, TokenCredentialSchema } from '@mdt/domain-contracts'
import { ProjectRefParamsSchema, TicketRefParamsSchema } from './ticketSchemas.js'

// Express transport envelopes: reject arrays/objects before scalar services,
// leaving parseInt, bounds, equality and filesystem policy in their owners.
const envelope = ReadTokenCreateInputSchema.pick({})
const scalar = TokenCredentialSchema
export const BypassCacheQuerySchema = envelope.extend({ bypassCache: scalar.optional() })
export const FilesystemPathQuerySchema = envelope.extend({ path: scalar.optional() })
export const ProjectRefQuerySchema = ProjectRefParamsSchema
export const OptionalProjectRefQuerySchema = envelope.extend({ projectId: scalar.optional() })
export const DocumentContentQuerySchema = ProjectRefQuerySchema.extend({ filePath: scalar.min(1) })
export const ProjectionQuerySchema = envelope.extend({ after: scalar.optional(), limit: scalar.optional() })
export const LogQuerySchema = envelope.extend({ lines: scalar.optional(), filter: scalar.optional() })
export const SubdocumentRefParamsSchema = TicketRefParamsSchema.extend({ subDocName: scalar.min(1) })
export const RawPreviewParamsSchema = envelope.extend({ token: scalar.min(1), 0: scalar.min(1) })
export const CloudStatusParamsSchema = envelope.extend({ id: scalar.min(1) })
export const VisibilityBodySchema = OptionalProjectRefQuerySchema.passthrough().optional()

export const FilesystemPathBodySchema = envelope.extend({ path: scalar.min(1) })
