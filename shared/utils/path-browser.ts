/**
 * Cross-platform path utilities that work in both Node.js and browser environments
 */

/**
 * Check if a path is absolute
 * Works in both Node.js and browser environments
 */
export function isAbsolute(path: string): boolean {
  // Unix absolute paths
  if (path.startsWith('/')) {
    return true
  }

  // Windows absolute paths (both forward and back slashes)
  // Match patterns like: C:\, C:/, \\server\share, //
  if (/^[A-Z]:[\\/]/i.test(path) || path.startsWith('\\\\') || path.startsWith('//')) {
    return true
  }

  return false
}

/**
 * Normalize path separators and resolve '.' and '..' segments
 * Browser-compatible implementation
 */
export function normalize(path: string): string {
  // Convert backslashes to forward slashes
  const normalized = path.replace(/\\/g, '/')

  // Split into segments
  const segments = normalized.split('/')
  const resolved: string[] = []

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      // Skip empty and current directory segments
      continue
    }
    else if (segment === '..') {
      // Go up one directory if possible
      if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
        resolved.pop()
      }
      else {
        // If at root or already going up, keep the '..'
        resolved.push('..')
      }
    }
    else {
      resolved.push(segment)
    }
  }

  // Join segments back together
  let result = resolved.join('/')

  // Preserve leading slash for absolute paths
  if (path.startsWith('/') && !result.startsWith('/')) {
    result = `/${result}`
  }

  // Preserve Windows drive letter
  const windowsDriveMatch = path.match(/^([A-Z]:)/i)
  if (windowsDriveMatch && !result.startsWith(windowsDriveMatch[1])) {
    result = windowsDriveMatch[1] + (result.startsWith('/') ? result : `/${result}`)
  }

  // Preserve UNC paths
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    if (!result.startsWith('//')) {
      result = `//${result}`
    }
  }

  return result || (path.startsWith('/') ? '/' : '.')
}

/**
 * Get the directory name of a path
 * Browser-compatible implementation
 */
export function dirname(path: string): string {
  if (path === '') {
    return '.'
  }

  // Convert backslashes to forward slashes for consistent processing
  const normalized = path.replace(/\\/g, '/')

  // If path ends with a slash, remove it (unless it's just root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    path = normalized.slice(0, -1)
  }
  else {
    path = normalized
  }

  // Find the last slash
  const lastSlash = path.lastIndexOf('/')

  if (lastSlash === -1) {
    // No slash found, return current directory
    return '.'
  }
  else if (lastSlash === 0) {
    // Slash is at the beginning, return root
    return '/'
  }
  else {
    // Return everything before the last slash
    return path.substring(0, lastSlash)
  }
}

/**
 * Get the basename of a path (last segment)
 * Browser-compatible implementation
 */
export function basename(path: string, ext?: string): string {
  if (path === '') {
    return ''
  }

  // Convert backslashes to forward slashes for consistent processing
  const normalized = path.replace(/\\/g, '/')

  // Remove trailing slash
  const withoutTrailing = normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized

  // Get the last segment after the last slash
  const lastSlash = withoutTrailing.lastIndexOf('/')
  const base = lastSlash === -1 ? withoutTrailing : withoutTrailing.substring(lastSlash + 1)

  // Remove extension if provided
  if (ext && base.endsWith(ext)) {
    return base.slice(0, -ext.length)
  }

  return base
}

/**
 * Join path segments
 * Browser-compatible implementation
 */
export function join(...paths: string[]): string {
  if (paths.length === 0) {
    return '.'
  }

  let result = paths[0] || ''

  for (let i = 1; i < paths.length; i++) {
    const segment = paths[i] || ''

    // Skip empty segments
    if (!segment) {
      continue
    }

    // If result is empty, just use the segment
    if (!result) {
      result = segment
      continue
    }

    // If result doesn't end with a separator and segment doesn't start with one, add one
    if (!result.endsWith('/') && !segment.startsWith('/')) {
      result += `/${segment}`
    }
    else if (result.endsWith('/') && segment.startsWith('/')) {
      // Avoid double slashes
      result += segment.substring(1)
    }
    else {
      result += segment
    }
  }

  return normalize(result)
}

/**
 * Get the file extension
 * Browser-compatible implementation
 */
export function extname(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const lastDotIndex = normalized.lastIndexOf('.')
  const lastSlashIndex = normalized.lastIndexOf('/')

  // If no dot, or dot is before the last slash (like in directory names), no extension
  if (lastDotIndex === -1 || (lastSlashIndex !== -1 && lastDotIndex < lastSlashIndex)) {
    return ''
  }

  // Extract extension including the dot
  return normalized.substring(lastDotIndex)
}

/**
 * Resolve a sequence of paths or path segments into an absolute path
 * Browser-compatible implementation (simplified)
 */
export function resolve(...paths: string[]): string {
  if (paths.length === 0) {
    return '/'
  }

  let resolvedPath = paths.pop() || ''

  // If the last path is absolute, start with it
  if (isAbsolute(resolvedPath)) {
    // Use it as is
  }
  else {
    // Otherwise, we'll treat it as relative
    resolvedPath = `/${resolvedPath}`
  }

  // Process remaining paths from right to left
  while (paths.length > 0) {
    const segment = paths.pop() || ''
    if (segment === '' || segment === '.') {
      continue
    }

    if (segment === '..') {
      // Go up one directory
      const lastSlash = resolvedPath.lastIndexOf('/')
      if (lastSlash > 0) {
        resolvedPath = resolvedPath.substring(0, lastSlash)
      }
    }
    else if (isAbsolute(segment)) {
      // If segment is absolute, replace resolvedPath
      resolvedPath = segment
    }
    else {
      // Otherwise, prepend segment
      resolvedPath = `/${segment}${resolvedPath}`
    }
  }

  return normalize(resolvedPath)
}

/**
 * Get relative path from one path to another
 * Browser-compatible implementation
 */
export function relative(from: string, to: string): string {
  const fromParts = normalize(from).replace(/\/$/, '').split('/')
  const toParts = normalize(to).replace(/\/$/, '').split('/')

  // Find common prefix
  let commonLength = 0
  const minLength = Math.min(fromParts.length, toParts.length)

  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++
    }
    else {
      break
    }
  }

  // Calculate how many directories to go up
  const upLevels = fromParts.length - commonLength
  const relativeParts = Array.from({ length: upLevels }, () => '..').concat(toParts.slice(commonLength))

  // If no relative path needed
  if (relativeParts.length === 0) {
    return '.'
  }

  return relativeParts.join('/')
}

/**
 * Path separator constant
 * Browser-compatible (always '/')
 */
export const sep = '/'
