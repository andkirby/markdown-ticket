import { z } from 'zod'

// Value validation and selector allowlisting remain application-service owned.
export const ConfigPatchEnvelopeSchema = z.object({
  selector: z.string().min(1),
  value: z.unknown().optional(),
})
