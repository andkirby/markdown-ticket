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
/**
 * Error handler middleware
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export declare function errorHandler(err: CustomError, req: ExpressRequest, res: ExpressResponse, _next: NextFunction): void;
/**
 * 404 Not Found handler
 * @param req - Express request
 * @param res - Express response
 */
export declare function notFoundHandler(req: ExpressRequest, res: ExpressResponse): void;
export {};
