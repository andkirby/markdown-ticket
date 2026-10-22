import type { z } from 'zod'

/** Unknown input at adapters; erased from consumers that do not depend on Zod. */
export type BoundarySchema<T> = z.ZodType<T, unknown>
