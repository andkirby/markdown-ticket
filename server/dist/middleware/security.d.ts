/**
 * Security middleware for path validation and access control
 */
interface ExpressRequest {
    params: {
        [key: string]: string;
    };
    query: {
        [key: string]: string;
    };
    body: {
        [key: string]: string;
    };
}
interface ExpressResponse {
    status: (code: number) => ExpressResponse;
    json: (data: object) => void;
}
type NextFunction = () => void;
/**
 * Sanitize filename to prevent directory traversal
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export declare function sanitizeFilename(req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
/**
 * Validate file path to prevent path traversal attacks
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export declare function validateFilePath(req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
/**
 * Restrict access to home directory only
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export declare function restrictToHomeDirectory(req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
/**
 * Validate project path security
 * @param projectPath - Project path to validate
 * @param filePath - File path to validate
 * @returns True if valid, false otherwise
 */
export declare function validateProjectPath(projectPath: string, filePath: string): boolean;
export {};
