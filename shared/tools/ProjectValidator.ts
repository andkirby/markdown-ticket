import { isAbsolute, normalize } from '../utils/path-browser.js'
import { sep } from 'node:path'
import { PROJECT_CODE_PATTERN } from '@mdt/domain-contracts'

// Node-only — gracefully handled in browser via typeof checks below
let realpathSync: (path: string) => string
try {
  realpathSync = require('node:fs').realpathSync
} catch {
  realpathSync = undefined as unknown as typeof realpathSync
}

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
    // Auto-uppercase for better UX
    const uppercased = code.trim().toUpperCase()

    if (!PROJECT_CODE_PATTERN.test(uppercased)) {
      return {
        valid: false,
        error: 'Project code must be 2-5 characters, starting with a letter followed by letters or numbers',
      }
    }

    return { valid: true, normalized: uppercased }
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
  /**
   * Check if a normalized absolute path is a system root directory.
   * Uses realpathSync for canonical path resolution.
   * Exact match only — subdirectories of system roots are allowed.
   * MDT-151 BR-2.4.
   */
  static isSystemRoot(normalizedPath: string): boolean {
    // Browser-safe: skip check in non-Node environments
    if (typeof process === 'undefined' || typeof realpathSync === 'undefined') {
      return false
    }
    const protectedRoots = getProtectedRoots()
    try {
      const canonical = realpathSync(normalizedPath)
      return protectedRoots.some(root => canonical === root)
    }
    catch {
      // Path doesn't exist — can't be a system root
      return false
    }
  }

  static validateTicketsPath(ticketsPath: string): ValidationResult {
    const trimmed = ticketsPath.trim()

    if (!trimmed) {
      return {
        valid: false,
        error: 'Tickets path cannot be empty',
      }
    }

    // Absolute paths are allowed (admin's deliberate choice for external directories)
    if (isAbsolute(trimmed)) {
      // Still reject traversal segments in absolute paths
      const normalized = normalize(trimmed)
      const segments = normalized.split(/[/\\]/).filter(Boolean)
      if (segments.includes('..')) {
        return {
          valid: false,
          error: 'Tickets path cannot contain ".." segments',
        }
      }

      // BR-2.4: Reject system root directories
      if (this.isSystemRoot(normalized)) {
        return {
          valid: false,
          error: 'Choose a subfolder, not a system root directory.',
        }
      }

      const finalPath = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
      return {
        valid: true,
        normalized: finalPath,
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

    // Reject any path containing '..' segments (check raw input before normalization)
    const rawSegments = trimmed.split(/[/\\]/).filter(Boolean)
    if (rawSegments.includes('..')) {
      return {
        valid: false,
        error: 'Tickets path cannot contain ".." segments',
      }
    }

    // Ensure normalized path doesn't start with ../ or resolve to ..
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

/**
 * Get platform-specific protected system root directories.
 * Returns canonical (realpathSync-resolved) paths for the current platform.
 * MDT-151 BR-2.4.
 */
function getProtectedRoots(): string[] {
  if (typeof process === 'undefined') {
    return []
  }
  const platform = process.platform

  // Common POSIX roots
  const posixRoots = [
    '/', '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/lib64',
    '/media', '/mnt', '/opt', '/proc', '/root', '/run', '/sbin',
    '/srv', '/sys', '/tmp', '/usr', '/usr/local', '/var',
  ]

  if (platform === 'darwin') {
    const macExtras = ['/Applications', '/Library', '/System', '/Users', '/Volumes', '/private', '/sbin']
    return [...new Set([...posixRoots, ...macExtras])].map(p => {
      try { return realpathSync(p) } catch { return p }
    })
  }

  if (platform === 'win32') {
    return [
      'C:\\', 'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
      'C:\\ProgramData', 'C:\\Users', 'C:\\System Volume Information',
    ]
  }

  // Linux and other POSIX
  return posixRoots.map(p => {
    try { return realpathSync(p) } catch { return p }
  })
}

/**
 * Standalone export for ticketsPath validation.
 * Delegates to ProjectValidator.validateTicketsPath().
 */
export function validateTicketsPath(ticketsPath: string): ValidationResult {
  return ProjectValidator.validateTicketsPath(ticketsPath)
}
