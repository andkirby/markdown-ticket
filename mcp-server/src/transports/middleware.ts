import type { NextFunction, Request, Response } from 'express'

/**
 * Authentication middleware
 * Validates Bearer token from Authorization header
 */
export function createAuthMiddleware(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Missing Authorization header. Include "Authorization: Bearer <token>" in your request.',
        },
      })
    }

    const parts = authHeader.split(' ')

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Invalid Authorization format. Use "Authorization: Bearer <token>"',
        },
      })
    }

    const token = parts[1]

    if (token !== expectedToken) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Invalid token',
        },
      })
    }

    next()
  }
}

/**
 * Origin validation middleware
 * Validates Origin header against allowed origins list
 */
export function createOriginValidationMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin

    // Allow requests with no origin (e.g., curl, Postman, server-to-server)
    if (!origin) {
      return next()
    }

    if (!allowedOrigins.includes(origin)) {
      console.error(`❌ Rejected request from unauthorized origin: ${origin}`)
      return res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: `Forbidden: Origin '${origin}' is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`,
        },
      })
    }

    next()
  }
}
