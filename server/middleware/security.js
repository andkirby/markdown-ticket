import path from 'path';
import os from 'os';

/**
 * Security middleware for path validation and access control
 */

/**
 * Sanitize filename to prevent directory traversal
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware function
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
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware function
 */
export function validateFilePath(req, res, next) {
  const filePath = req.query.filePath || req.body.filePath;

  if (filePath) {
    // Block path traversal attempts
    if (filePath.includes('..')) {
      return res.status(403).json({
        error: 'Invalid file path',
        message: 'Path traversal attempts are not allowed'
      });
    }

    // Only allow markdown files
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only markdown files are allowed'
      });
    }
  }

  next();
}

/**
 * Restrict access to home directory only
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware function
 */
export function restrictToHomeDirectory(req, res, next) {
  const requestPath = req.query.path;

  if (requestPath) {
    const homedir = process.env.HOME || os.homedir();
    const resolvedPath = path.resolve(requestPath);

    if (!resolvedPath.startsWith(homedir)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Access denied to path outside home directory'
      });
    }
  }

  next();
}

/**
 * Validate project path security
 * @param {string} projectPath - Project path to validate
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateProjectPath(projectPath, filePath) {
  const resolvedPath = path.join(projectPath, filePath);

  // Ensure resolved path is within project directory
  if (!resolvedPath.startsWith(projectPath)) {
    return false;
  }

  return true;
}
