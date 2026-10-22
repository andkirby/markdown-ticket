import type { BoundarySchema } from '@mdt/domain-contracts'
import type { Response } from 'express'

/** Parse unknown request input once; callers must use the successful data. */
export function parseRequest<T>(schema: BoundarySchema<T>, raw: unknown, res: Response, source: 'body' | 'params' | 'query') {
  const result = schema.safeParse(raw)
  if (!result.success) {
    res.status(400).json({
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request input',
      source,
      issues: result.error.issues.map(({ code, path, message }) => ({ code, path, message })),
    })
  }
  return result
}
