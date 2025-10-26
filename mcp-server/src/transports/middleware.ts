import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Authentication middleware
 * Validates Bearer token from Authorization header
 */
export function createAuthMiddleware(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Missing Authorization header. Include "Authorization: Bearer <token>" in your request.'
        }
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Invalid Authorization format. Use "Authorization: Bearer <token>"'
        }
      });
    }

    const token = parts[1];

    if (token !== expectedToken) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Invalid token'
        }
      });
    }

    next();
  };
}

/**
 * Origin validation middleware
 * Validates Origin header against allowed origins list
 */
export function createOriginValidationMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Allow requests with no origin (e.g., curl, Postman, server-to-server)
    if (!origin) {
      return next();
    }

    if (!allowedOrigins.includes(origin)) {
      console.error(`❌ Rejected request from unauthorized origin: ${origin}`);
      return res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: `Forbidden: Origin '${origin}' is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`
        }
      });
    }

    next();
  };
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: {
  windowMs: number;
  max: number;
}) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.windowMs / 1000} seconds. Please try again later.`
      }
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.windowMs / 1000} seconds. Please try again later.`
        }
      });
    }
  });
}

/**
 * Session validation middleware
 * Checks if Mcp-Session-Id header is present and valid
 */
export function createSessionValidationMiddleware(
  sessionManager: any,
  requireSession: boolean = false
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.headers['mcp-session-id'] as string;

    if (!sessionId) {
      if (requireSession) {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Bad Request: Mcp-Session-Id header is required'
          }
        });
      }
      // Session not required, continue
      return next();
    }

    // Validate session
    if (!sessionManager.validateSession(sessionId)) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found or expired. Please initialize a new session.'
        }
      });
    }

    // Attach session to request
    (req as any).session = sessionManager.getSession(sessionId);
    next();
  };
}
