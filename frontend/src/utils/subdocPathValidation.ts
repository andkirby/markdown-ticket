import { buildDirectTicketPath, buildDirectTicketSubDocPath, buildTicketPath, buildTicketSubDocPath, ROUTE_DIRECT_TICKET_SUBDOC, ROUTE_TICKET_SUBDOC, routePatternToRegex } from '../routes'

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
 * MDT-221 UAT r2 — document extensions allowed in sub-document URL paths.
 * `.md` paths are extension-less in their API form; `.html`/`.htm` paths
 * keep their extension end-to-end (deep links round-trip, BR-1.15).
 */
const SUBDOCUMENT_DOC_EXTENSIONS = ['.md', '.html', '.htm'] as const

function findDocExtension(path: string): string | undefined {
  return SUBDOCUMENT_DOC_EXTENSIONS.find(extension => path.endsWith(extension))
}

/**
 * Validates a sub-document path for security and format compliance.
 *
 * Rules:
 * - Must end with a document extension (.md, .html, .htm)
 * - Must not contain .. (path traversal prevention)
 * - Must not start with / (no absolute paths)
 * - Must not be empty
 *
 * @param path - The sub-document path to validate
 * @returns true if path is valid, false otherwise
 *
 * @example
 * validateSubDocPath('prep/test.md') // true
 * validateSubDocPath('diagrams/flow.html') // true
 * validateSubDocPath('../etc/passwd.md') // false (path traversal)
 * validateSubDocPath('/absolute/path.md') // false (absolute path)
 * validateSubDocPath('prep/doc') // false (no document extension)
 */
export function validateSubDocPath(path: string): boolean {
  // Must not be empty
  if (!path || path.trim().length === 0) {
    return false
  }

  // Must end with a known document extension
  const extension = findDocExtension(path)
  if (!extension) {
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

  // Must have at least one character before the extension
  const basename = path.slice(0, -extension.length)
  if (basename.length === 0 || basename === '/') {
    return false
  }

  return true
}

/**
 * Converts a URL path (with extension) to an API path.
 * MDT-138: Preserves dot-notation for virtual folders, slash-notation for physical folders.
 * MDT-221 UAT r2: .md is stripped (legacy convention); .html/.htm are kept.
 *
 * The backend handles both formats:
 * - Virtual folders: 'tests.trace' → looks for 'tests.trace.md'
 * - Physical folders: 'bdd/legacy' → looks for 'bdd/legacy.md' or 'bdd.legacy.md'
 * - HTML files: 'diagrams/flow.html' → resolves the exact .html file
 *
 * @param urlPath - Path from URL (e.g., 'prep/test.md', 'tests.trace.md', 'diagrams/flow.html')
 * @returns Path for API call (e.g., 'prep/test', 'tests.trace', 'diagrams/flow.html')
 *
 * @example
 * urlPathToApiPath('prep/test.md') // 'prep/test'
 * urlPathToApiPath('part-1/chapter-1/intro.md') // 'part-1/chapter-1/intro'
 * urlPathToApiPath('tests.trace.md') // 'tests.trace' (virtual folder)
 * urlPathToApiPath('diagrams/flow.html') // 'diagrams/flow.html' (extension kept)
 */
export function urlPathToApiPath(urlPath: string): string {
  // Remove .md extension only - HTML keeps its extension end-to-end
  return urlPath.endsWith('.md') ? urlPath.slice(0, -3) : urlPath
}

/**
 * Converts an API path to a URL path.
 * Extension-less markdown API paths get .md appended; paths that already
 * carry a document extension (HTML) pass through unchanged (MDT-221 UAT r2).
 *
 * @param apiPath - Path from API (e.g., 'prep/test', 'diagrams/flow.html')
 * @returns Path for URL (e.g., 'prep/test.md', 'diagrams/flow.html')
 *
 * @example
 * apiPathToUrlPath('prep/test') // 'prep/test.md'
 * apiPathToUrlPath('part-1/chapter-1/intro') // 'part-1/chapter-1/intro.md'
 * apiPathToUrlPath('diagrams/flow.html') // 'diagrams/flow.html'
 */
export function apiPathToUrlPath(apiPath: string): string {
  // Add .md extension only when the path carries no document extension
  if (!findDocExtension(apiPath)) {
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
  // Substitute the literal `:ticketKey` token in the un-escaped route pattern
  // constants BEFORE converting to a regex. This avoids brittle string
  // surgery on the escaped regex source (`\/` vs `/`), which previously
  // caused the projectCode slot to be mistaken for the ticketKey slot.
  // MDT-138 UAT 2026-07-18: regression introduced by MDT-184.
  const escapedCrId = crId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const directPatternSrc = ROUTE_DIRECT_TICKET_SUBDOC.replace(':ticketKey', escapedCrId)
  const projectPatternSrc = ROUTE_TICKET_SUBDOC.replace(':ticketKey', escapedCrId)
  const directPattern = routePatternToRegex(directPatternSrc)
  const projectPattern = routePatternToRegex(projectPatternSrc)
  const patterns = [directPattern, projectPattern]

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
    return projectCode ? buildTicketPath(projectCode, crId) : buildDirectTicketPath(crId)
  }

  const urlPath = apiPathToUrlPath(hash)
  return projectCode
    ? buildTicketSubDocPath(projectCode, crId, urlPath)
    : buildDirectTicketSubDocPath(crId, urlPath)
}
