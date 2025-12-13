import * as path from 'path';

/**
 * Path Resolution Utility
 * Provides centralized path operations for project services
 */

/**
 * Join paths safely (wrapper around path.join)
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Resolve a path to an absolute path (wrapper around path.resolve)
 */
export function resolvePath(basePath: string, targetPath?: string): string {
  return targetPath ? path.resolve(basePath, targetPath) : path.resolve(basePath);
}

/**
 * Get the base name of a path (directory or file name)
 */
export function getBaseName(pathString: string): string {
  return path.basename(pathString);
}

/**
 * Get the base name without extension
 */
export function getBaseNameWithoutExtension(pathString: string, extension?: string): string {
  return path.basename(pathString, extension);
}

/**
 * Get the directory name of a path
 */
export function getDirName(pathString: string): string {
  return path.dirname(pathString);
}

/**
 * Get relative path from one directory to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(pathString: string): boolean {
  return path.isAbsolute(pathString);
}

/**
 * Normalize a path (resolve '..' and '.' segments)
 */
export function normalizePath(pathString: string): string {
  return path.normalize(pathString);
}

/**
 * Build a project registry file path
 */
export function buildRegistryFilePath(registryDir: string, projectId: string): string {
  return joinPaths(registryDir, `${projectId}.toml`);
}

/**
 * Build a config file path within a project
 */
export function buildConfigFilePath(projectPath: string, configFileName: string): string {
  return joinPaths(projectPath, configFileName);
}

/**
 * Build a full path within a project for a given relative path
 */
export function buildProjectPath(projectPath: string, relativePath: string): string {
  return joinPaths(projectPath, relativePath);
}

/**
 * Resolve a path relative to project root
 * If the provided path is already absolute, returns it as-is
 */
export function resolveProjectRelativePath(projectPath: string, targetPath: string): string {
  if (isAbsolutePath(targetPath)) {
    return targetPath;
  }
  return resolvePath(projectPath, targetPath);
}