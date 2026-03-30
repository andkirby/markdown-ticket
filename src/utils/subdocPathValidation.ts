/**
 * Sub-document path validation utilities for MDT-094.
 *
 * Provides security validation for sub-document paths to prevent:
 * - Path traversal attacks (../)
 * - Absolute path escapes
 * - Invalid file extensions
 * - Empty or malformed paths
 */

/**
 * Validates a sub-document path for security and format compliance.
 *
 * Rules:
 * - Must end with .md extension
 * - Must not contain .. (path traversal prevention)
 * - Must not start with / (no absolute paths)
 * - Must not be empty
 *
 * @param path - The sub-document path to validate
 * @returns true if path is valid, false otherwise
 *
 * @example
 * validateSubDocPath('prep/test.md') // true
 * validateSubDocPath('part-1/chapter-1/intro.md') // true
 * validateSubDocPath('../etc/passwd.md') // false (path traversal)
 * validateSubDocPath('/absolute/path.md') // false (absolute path)
 * validateSubDocPath('prep/doc') // false (no .md extension)
 */
export function validateSubDocPath(path: string): boolean {
  // Must not be empty
  if (!path || path.trim().length === 0) {
    return false
  }

  // Must end with .md
  if (!path.endsWith('.md')) {
    return false
  }

  // No path traversal attempts
  if (path.includes('..')) {
    return false
  }

  // No absolute paths
  if (path.startsWith('/')) {
    return false
  }

  // No backslashes (Windows path separator)
  if (path.includes('\\')) {
    return false
  }

  // Must have at least one character before .md
  const basename = path.slice(0, -3)
  if (basename.length === 0 || basename === '/') {
    return false
  }

  return true
}

/**
 * Converts a URL path (with .md extension) to an API path (without .md extension).
 * MDT-138: Preserves dot-notation for virtual folders, slash-notation for physical folders.
 *
 * The backend handles both formats:
 * - Virtual folders: 'tests.trace' → looks for 'tests.trace.md'
 * - Physical folders: 'bdd/legacy' → looks for 'bdd/legacy.md' or 'bdd.legacy.md'
 *
 * @param urlPath - Path from URL (e.g., 'prep/test.md', 'tests.trace.md')
 * @returns Path for API call (e.g., 'prep/test', 'tests.trace')
 *
 * @example
 * urlPathToApiPath('prep/test.md') // 'prep/test'
 * urlPathToApiPath('part-1/chapter-1/intro.md') // 'part-1/chapter-1/intro'
 * urlPathToApiPath('tests.trace.md') // 'tests.trace' (virtual folder)
 */
export function urlPathToApiPath(urlPath: string): string {
  // Remove .md extension - no other transformation needed
  // The backend handles both dot and slash notation
  return urlPath.endsWith('.md') ? urlPath.slice(0, -3) : urlPath
}

/**
 * Converts an API path (without .md extension) to a URL path (with .md extension).
 *
 * @param apiPath - Path from API (e.g., 'prep/test')
 * @returns Path for URL (e.g., 'prep/test.md')
 *
 * @example
 * apiPathToUrlPath('prep/test') // 'prep/test.md'
 * apiPathToUrlPath('part-1/chapter-1/intro') // 'part-1/chapter-1/intro.md'
 */
export function apiPathToUrlPath(apiPath: string): string {
  // Add .md extension if not present
  if (!apiPath.endsWith('.md')) {
    return `${apiPath}.md`
  }
  return apiPath
}

/**
 * Converts a filePath from SubDocument to an API path.
 * The filePath is the source of truth for navigation and URL building.
 *
 * @param filePath - Full file path from SubDocument (e.g., 'MDT-138/bdd/another.trace.md')
 * @param ticketId - Ticket ID to strip from path (e.g., 'MDT-138')
 * @returns API path for state/URL (e.g., 'bdd/another.trace')
 *
 * @example
 * filePathToApiPath('MDT-138/bdd.trace.md', 'MDT-138') // 'bdd.trace'
 * filePathToApiPath('MDT-138/bdd/another.trace.md', 'MDT-138') // 'bdd/another.trace'
 */
export function filePathToApiPath(filePath: string, ticketId: string): string {
  return filePath
    .replace(`${ticketId}/`, '') // Remove ticket ID prefix
    .replace(/\.md$/, '') // Remove .md extension
}

/**
 * Extracts the sub-document path from a URL pathname.
 *
 * Expected format: /ticket/:crId/* or /prj/:projectCode/ticket/:crId/*
 *
 * @param pathname - URL pathname
 * @param crId - The ticket/CR ID to match
 * @returns The sub-document path, or null if not found
 *
 * @example
 * extractSubDocPath('/ticket/MDT-093/prep/test.md', 'MDT-093') // 'prep/test.md'
 * extractSubDocPath('/prj/MDT/ticket/MDT-093/part-1/chap-1/intro.md', 'MDT-093') // 'part-1/chap-1/intro.md'
 * extractSubDocPath('/ticket/MDT-093', 'MDT-093') // null
 */
export function extractSubDocPath(pathname: string, crId: string): string | null {
  // Try both patterns: /ticket/:crId/* and /prj/:projectCode/ticket/:crId/*
  const patterns = [
    // Pattern 1: /ticket/MDT-093/prep/test.md
    new RegExp(`^/ticket/${crId}/(.+)$`),
    // Pattern 2: /prj/MDT/ticket/MDT-093/prep/test.md
    new RegExp(`^/prj/[^/]+/ticket/${crId}/(.+)$`),
  ]

  for (const pattern of patterns) {
    const match = pathname.match(pattern)
    if (match) {
      const path = match[1]
      // Validate the extracted path
      if (validateSubDocPath(path)) {
        return path
      }
    }
  }

  return null
}

/**
 * Converts a hash-based URL to a path-based URL.
 *
 * @param hash - The hash fragment (e.g., '#prep/doc')
 * @param crId - The ticket/CR ID
 * @param projectCode - Optional project code for full URL path
 * @returns The new path-based URL
 *
 * @example
 * hashToPathUrl('prep/doc', 'MDT-093', 'MDT') // '/prj/MDT/ticket/MDT-093/prep/doc.md'
 * hashToPathUrl('', 'MDT-093', 'MDT') // '/prj/MDT/ticket/MDT-093'
 */
export function hashToPathUrl(hash: string, crId: string, projectCode?: string): string {
  if (!hash) {
    return projectCode ? `/prj/${projectCode}/ticket/${crId}` : `/ticket/${crId}`
  }

  const urlPath = apiPathToUrlPath(hash)
  return projectCode
    ? `/prj/${projectCode}/ticket/${crId}/${urlPath}`
    : `/ticket/${crId}/${urlPath}`
}
