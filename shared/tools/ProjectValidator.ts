import { isAbsolute, normalize } from '../utils/path-browser.js'

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  normalized?: string
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
    const trimmed = name.trim()

    if (!trimmed) {
      return { valid: false, error: 'Project name cannot be empty' }
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Project name must be 100 characters or less' }
    }

    return { valid: true, normalized: trimmed }
  }

  /**
   * Validate project code
   */
  static validateCode(code: string): ValidationResult {
    const trimmed = code.trim()

    if (!/^[A-Z][A-Z0-9]{1,4}$/.test(trimmed)) {
      return {
        valid: false,
        error: 'Project code must be 2-5 characters, starting with an uppercase letter followed by uppercase letters or numbers',
      }
    }

    return { valid: true, normalized: trimmed }
  }

  /**
   * Validate directory path (browser-safe)
   */
  static validatePath(inputPath: string, _options: { mustExist?: boolean } = {}): ValidationResult {
    try {
      // Expand tilde (no-op in browser)
      const expandedPath = this.expandTildePath(inputPath)

      // Browser-safe: just format check and return the path
      // No filesystem checking - mustExist option is ignored
      if (isAbsolute(expandedPath)) {
        return { valid: true, normalized: expandedPath }
      }
      else {
        // Relative path - return as-is
        return { valid: true, normalized: expandedPath }
      }
    }
    catch (error) {
      return {
        valid: false,
        error: `Invalid path: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Validate description
   */
  static validateDescription(description: string): ValidationResult {
    const trimmed = description.trim()

    if (trimmed.length > 500) {
      return {
        valid: false,
        error: 'Description must be 500 characters or less',
      }
    }

    return { valid: true, normalized: trimmed }
  }

  /**
   * Validate repository URL
   */
  static validateRepository(repository: string): ValidationResult {
    const trimmed = repository.trim()

    // Empty is valid (optional field)
    if (!trimmed) {
      return { valid: true, normalized: '' }
    }

    // Validate URL format
    if (!this.isValidUrl(trimmed)) {
      return {
        valid: false,
        error: 'Repository must be a valid URL',
      }
    }

    return { valid: true, normalized: trimmed }
  }

  /**
   * Expand tilde path (browser-safe - no-op)
   */
  static expandTildePath(inputPath: string): string {
    // Browser environment: no tilde expansion available
    // Return input unchanged
    return inputPath
  }

  /**
   * Check if string is valid URL
   */
  static isValidUrl(urlString: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new URL(urlString)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Generate project code from name
   */
  static generateCodeFromName(name: string): string {
    const words = name.trim().split(/\s+/)

    // Take first letter of each word
    let code = words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .replace(/[^A-Z]/g, '') // Remove non-alpha chars

    // If less than 2 chars, use first 3 of name
    if (code.length < 2) {
      code = name
        .replace(/[^a-z]/gi, '')
        .substring(0, 3)
        .toUpperCase()
    }

    // Ensure minimum 2 chars
    if (code.length < 2) {
      return 'PRJ' // Fallback
    }

    // Limit to 5 chars
    return code.substring(0, 5)
  }

  /**
   * Validate tickets path (relative path from project root)
   */
  static validateTicketsPath(ticketsPath: string): ValidationResult {
    const trimmed = ticketsPath.trim()

    if (!trimmed) {
      return {
        valid: false,
        error: 'Tickets path cannot be empty',
      }
    }

    // Check for absolute paths (not allowed - must be relative)
    if (isAbsolute(trimmed)) {
      return {
        valid: false,
        error: 'Tickets path must be relative to project root (absolute paths not allowed)',
      }
    }

    // Check for invalid characters (allow : for Windows drives in relative paths)
    const invalidChars = ['<', '>', '"', '|', '?', '*']
    if (invalidChars.some(char => trimmed.includes(char))) {
      return {
        valid: false,
        error: `Tickets path contains invalid characters: ${invalidChars.filter(c => trimmed.includes(c)).join(', ')}`,
      }
    }

    // Normalize path separators and resolve relative components
    const normalized = normalize(trimmed)

    // Ensure path doesn't start with ./ or ../ (should be simple relative path)
    if (normalized.startsWith('../') || normalized === '..') {
      return {
        valid: false,
        error: 'Tickets path cannot go outside project root (no "../" allowed)',
      }
    }

    // Remove leading "./" if present
    const cleaned = normalized.startsWith('./') ? normalized.substring(2) : normalized

    // Ensure it's not empty after cleaning
    if (!cleaned) {
      return {
        valid: false,
        error: 'Tickets path cannot be empty after normalization',
      }
    }

    // Ensure it doesn't contain trailing slashes (unless it's just '/')
    const finalPath = cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned

    return {
      valid: true,
      normalized: finalPath,
    }
  }
}
