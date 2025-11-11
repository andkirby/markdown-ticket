import path from 'path';
import os from 'os';
/**
 * Sanitize filename to prevent directory traversal
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function sanitizeFilename(req, res, next) {
    if (req.params.filename) {
        // Sanitize filename to prevent directory traversal
        req.params.filename = path.basename(req.params.filename);
    }
    if (req.body.filename) {
        req.body.filename = path.basename(req.body.filename);
    }
    next();
}
/**
 * Validate file path to prevent path traversal attacks
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function validateFilePath(req, res, next) {
    const filePath = req.query.filePath || req.body.filePath;
    if (filePath) {
        // Block path traversal attempts
        if (filePath.includes('..')) {
            res.status(403).json({
                error: 'Invalid file path',
                message: 'Path traversal attempts are not allowed'
            });
            return;
        }
        // Only allow markdown files
        if (!filePath.endsWith('.md')) {
            res.status(400).json({
                error: 'Invalid file type',
                message: 'Only markdown files are allowed'
            });
            return;
        }
    }
    next();
}
/**
 * Restrict access to home directory only
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function restrictToHomeDirectory(req, res, next) {
    const requestPath = req.query.path;
    if (requestPath) {
        const homedir = process.env.HOME || os.homedir();
        const resolvedPath = path.resolve(requestPath);
        if (!resolvedPath.startsWith(homedir)) {
            res.status(403).json({
                error: 'Access denied',
                message: 'Access denied to path outside home directory'
            });
            return;
        }
    }
    next();
}
/**
 * Validate project path security
 * @param projectPath - Project path to validate
 * @param filePath - File path to validate
 * @returns True if valid, false otherwise
 */
export function validateProjectPath(projectPath, filePath) {
    const resolvedPath = path.join(projectPath, filePath);
    // Ensure resolved path is within project directory
    if (!resolvedPath.startsWith(projectPath)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=security.js.map