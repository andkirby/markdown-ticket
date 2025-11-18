import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Project validation utilities
 * Provides static methods for validating and normalizing project inputs
 */
export class ProjectValidator {
  /**
   * Validate project name
   */
  static validateName(name: string): ValidationResult {
    const trimmed = name.trim();

    if (!trimmed) {
      return { valid: false, error: 'Project name cannot be empty' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Project name must be 100 characters or less' };
    }

    return { valid: true, normalized: trimmed };
  }

  /**
   * Validate project code
   */
  static validateCode(code: string): ValidationResult {
    const normalized = code.toUpperCase().trim();

    if (!/^[A-Z]{2,5}$/.test(normalized)) {
      return {
        valid: false,
        error: 'Project code must be 2-5 uppercase letters'
      };
    }

    return { valid: true, normalized };
  }

  /**
   * Validate directory path
   */
  static validatePath(inputPath: string, options: { mustExist?: boolean } = {}): ValidationResult {
    try {
      // Expand tilde
      const expandedPath = this.expandTildePath(inputPath);

      // Convert to absolute path
      const absolutePath = path.isAbsolute(expandedPath)
        ? expandedPath
        : path.resolve(process.cwd(), expandedPath);

      // Check if exists (if required)
      if (options.mustExist) {
        if (!fs.existsSync(absolutePath)) {
          return {
            valid: false,
            error: `Path does not exist: ${absolutePath}`
          };
        }

        // Verify it's a directory
        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
          return {
            valid: false,
            error: `Path is not a directory: ${absolutePath}`
          };
        }
      }

      return { valid: true, normalized: absolutePath };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid path: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate description
   */
  static validateDescription(description: string): ValidationResult {
    const trimmed = description.trim();

    if (trimmed.length > 500) {
      return {
        valid: false,
        error: 'Description must be 500 characters or less'
      };
    }

    return { valid: true, normalized: trimmed };
  }

  /**
   * Validate repository URL
   */
  static validateRepository(repository: string): ValidationResult {
    const trimmed = repository.trim();

    // Empty is valid (optional field)
    if (!trimmed) {
      return { valid: true, normalized: '' };
    }

    // Validate URL format
    if (!this.isValidUrl(trimmed)) {
      return {
        valid: false,
        error: 'Repository must be a valid URL'
      };
    }

    return { valid: true, normalized: trimmed };
  }

  /**
   * Expand tilde path
   */
  static expandTildePath(inputPath: string): string {
    if (inputPath === '~' || inputPath.startsWith('~/')) {
      return inputPath.replace(/^~/, os.homedir());
    }
    return inputPath;
  }

  /**
   * Check if string is valid URL
   */
  static isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate project code from name
   */
  static generateCodeFromName(name: string): string {
    const words = name.trim().split(/\s+/);

    // Take first letter of each word
    let code = words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .replace(/[^A-Z]/g, ''); // Remove non-alpha chars

    // If less than 2 chars, use first 3 of name
    if (code.length < 2) {
      code = name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
    }

    // Ensure minimum 2 chars
    if (code.length < 2) {
      return 'PRJ'; // Fallback
    }

    // Limit to 5 chars
    return code.substring(0, 5);
  }

  /**
   * Validate tickets path (relative path from project root)
   */
  static validateTicketsPath(ticketsPath: string): ValidationResult {
    const trimmed = ticketsPath.trim();

    if (!trimmed) {
      return {
        valid: false,
        error: 'Tickets path cannot be empty'
      };
    }

    // Check for absolute paths (not allowed - must be relative)
    if (path.isAbsolute(trimmed)) {
      return {
        valid: false,
        error: 'Tickets path must be relative to project root (absolute paths not allowed)'
      };
    }

    // Check for invalid characters
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    if (invalidChars.some(char => trimmed.includes(char))) {
      return {
        valid: false,
        error: `Tickets path contains invalid characters: ${invalidChars.filter(c => trimmed.includes(c)).join(', ')}`
      };
    }

    // Normalize path separators and resolve relative components
    const normalized = path.normalize(trimmed).replace(/\\/g, '/');

    // Ensure path doesn't start with ./ or ../ (should be simple relative path)
    if (normalized.startsWith('../') || normalized === '..') {
      return {
        valid: false,
        error: 'Tickets path cannot go outside project root (no "../" allowed)'
      };
    }

    // Remove leading "./" if present
    const cleaned = normalized.startsWith('./') ? normalized.substring(2) : normalized;

    // Ensure it's not empty after cleaning
    if (!cleaned) {
      return {
        valid: false,
        error: 'Tickets path cannot be empty after normalization'
      };
    }

    // Ensure it doesn't contain trailing slashes (unless it's just '/')
    const finalPath = cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;

    return {
      valid: true,
      normalized: finalPath
    };
  }
}
