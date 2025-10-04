/**
 * Common blacklist patterns for file system filtering
 */
export const COMMON_IGNORE_PATTERNS = [
  'node_modules', 'vendor', 'venv', '.venv', 'dist', 'build',
  'target', 'bin', 'obj', 'out', '__pycache__', 'coverage',
  '.next', '.nuxt', '.svelte-kit', 'Pods', '.gradle', '.cargo',
  'DerivedData', 'tmp', 'temp', 'cache', 'test-results', 'playwright-report'
];

/**
 * Check if a path should be ignored based on blacklist patterns
 * @param {string} pathToCheck - Path to check
 * @param {Array<string>} configuredExcludes - Additional configured excludes
 * @returns {boolean} True if path should be ignored
 */
export function shouldIgnorePath(pathToCheck, configuredExcludes = []) {
  const normalizedPath = pathToCheck.replace(/\\/g, '/');

  // Check configured excludes
  if (configuredExcludes.some(exclude => {
    const excludeNormalized = exclude.replace(/\\/g, '/');
    return normalizedPath === excludeNormalized || normalizedPath.startsWith(excludeNormalized + '/');
  })) {
    return true;
  }

  // Check path parts
  const pathParts = normalizedPath.split('/');
  return pathParts.some(part => {
    if (part.startsWith('.')) return true;
    if (COMMON_IGNORE_PATTERNS.includes(part)) return true;
    return false;
  });
}
