/**
 * Common blacklist patterns for file system filtering
 */
export declare const COMMON_IGNORE_PATTERNS: string[];
/**
 * Check if a path should be ignored based on blacklist patterns
 * @param pathToCheck - Path to check
 * @param configuredExcludes - Additional configured excludes
 * @returns True if path should be ignored
 */
export declare function shouldIgnorePath(pathToCheck: string, configuredExcludes?: string[]): boolean;
