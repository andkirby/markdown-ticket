/**
 * Centralized error handling middleware
 * Handles errors thrown from route handlers and controllers
 */
/**
 * Error handler middleware
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function errorHandler(err, req, res, _next) {
    console.error('Server error:', err);
    // Default error response
    const errorResponse = {
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
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
}
//# sourceMappingURL=errorHandler.js.map