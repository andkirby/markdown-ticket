import type { z } from 'zod'
import { JsonRpcErrorCode, ToolError } from '../utils/toolError.js'

/** The registry is the single parse point, before project resolution. */
export function defineTool<S extends z.ZodType>(schema: S, run: (args: z.output<S>) => Promise<string>) {
  return {
    schema,
    async invoke(raw: unknown): Promise<string> {
      const result = schema.safeParse(raw)
      if (!result.success) {
        throw ToolError.protocol('Invalid tool arguments', JsonRpcErrorCode.InvalidParams, {
          code: 'VALIDATION_ERROR',
          issues: result.error.issues.map(({ code, path, message }) => ({ code, path, message })),
        })
      }
      return run(result.data)
    },
  }
}
