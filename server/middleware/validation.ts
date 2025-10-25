import { Request, Response, NextFunction } from 'express';

/**
 * Request validation middleware
 */

/**
 * Validate required query parameters
 * @param requiredParams - Array of required parameter names
 * @returns Middleware function
 */
export function validateQueryParams(...requiredParams: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredParams.filter(param => !req.query[param]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        missing: missing,
        received: Object.keys(req.query)
      });
    }

    next();
  };
}

/**
 * Validate required body fields
 * @param requiredFields - Array of required field names
 * @returns Middleware function
 */
export function validateBodyFields(...requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required body fields',
        missing: missing,
        received: Object.keys(req.body)
      });
    }

    next();
  };
}

/**
 * Validate request content type
 * @param expectedType - Expected content type (e.g., 'application/json')
 * @returns Middleware function
 */
export function validateContentType(expectedType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');

    if (!contentType || !contentType.includes(expectedType)) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        expected: expectedType,
        received: contentType
      });
    }

    next();
  };
}