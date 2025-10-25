/**
 * Centralized error handling middleware
 * Handles errors thrown from route handlers and controllers
 */

interface ExpressRequest {
  path: string;
  method: string;
}

interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (data: object) => void;
}

interface CustomError extends Error {
  statusCode?: number;
  stack?: string;
}

type NextFunction = (err?: Error) => void;

interface ErrorResponse {
  error: string;
  path: string;
  method: string;
  timestamp: string;
  stack?: string;
}

/**
 * Error handler middleware
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function errorHandler(err: CustomError, req: ExpressRequest, res: ExpressResponse, _next: NextFunction): void {
  console.error('Server error:', err);

  // Default error response
  const errorResponse: ErrorResponse = {
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * @param req - Express request
 * @param res - Express response
 */
export function notFoundHandler(req: ExpressRequest, res: ExpressResponse): void {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}