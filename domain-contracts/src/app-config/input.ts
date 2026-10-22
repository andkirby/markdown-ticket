import { z } from 'zod'
import { DocumentFavStateSchema } from './schema'

export const DocumentFavInputSchema = z.object({
  projectId: z.string(),
  ...DocumentFavStateSchema.shape,
})

export const PreviewTokenInputSchema = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
})

export const ReadTokenCreateInputSchema = z.object({
  name: z.string(),
  projectRefs: z.array(z.string()),
  expiresAt: z.string().nullable().optional(),
})

// Credential syntax and opaque identifiers deliberately carry no token policy.
export const TokenCredentialSchema = z.string()
export const OpaqueAccessIdSchema = z.string().min(1)

export const InviteInputSchema = z.object({ origin: z.string().nullable().optional() }).default({})

// Transient logging fields have no enum/range policy. Preserve extensions that
// logging clients already send; reject the whole batch before buffering.
const FrontendLogEntrySchema = z.looseObject({
  timestamp: z.number(),
  level: z.string(),
  message: z.string(),
  source: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
})
export const FrontendLogBatchSchema = z.object({ logs: z.array(FrontendLogEntrySchema).optional() })
export const DevLogBatchSchema = FrontendLogBatchSchema
