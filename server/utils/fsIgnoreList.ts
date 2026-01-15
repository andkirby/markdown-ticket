/**
 * Common blacklist patterns for file system filtering.
 */
const COMMON_IGNORE_PATTERNS: string[] = [
  'node_modules',
  'vendor',
  'venv',
  '.venv',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  'out',
  '__pycache__',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'Pods',
  '.gradle',
  '.cargo',
  'DerivedData',
  'tmp',
  'temp',
  'cache',
  'test-results',
  'playwright-report',
]

/**
 * Check if a path should be ignored based on blacklist patterns.
 *
 * @param pathToCheck - Path to check.
 * @param configuredExcludes - Additional configured excludes.
 * @returns True if path should be ignored.
 */
export function shouldIgnorePath(
  pathToCheck: string,
  configuredExcludes: string[] = [],
): boolean {
  const normalizedPath = pathToCheck.split('\\').join('/')

  // Check configured excludes
  if (configuredExcludes.some((exclude) => {
    const excludeNormalized = exclude.split('\\').join('/')

    return normalizedPath === excludeNormalized || normalizedPath.startsWith(`${excludeNormalized}/`)
  })) {
    return true
  }

  // Check path parts
  const pathParts = normalizedPath.split('/')

  return pathParts.some((part: string) => {
    if (part.startsWith('.')) {
      return true
    }
    if (COMMON_IGNORE_PATTERNS.includes(part)) {
      return true
    }

    return false
  })
}
