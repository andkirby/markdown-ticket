import type { Project } from '@mdt/shared/models/Project'

/**
 * Gets the project code from a project object.
 * Uses the project.code from config if available, otherwise returns the project ID.
 *
 * @param project - The project object
 * @returns The project code or 'UNKNOWN' if invalid
 */
export function getProjectCode(project: Project): string {
  // Safety check for undefined/null project
  if (!project || !project.project) {
    console.warn('getProjectCode called with invalid project object:', project)
    return 'UNKNOWN'
  }

  // Use the project.code from config if available
  if (project.project.code) {
    return project.project.code
  }

  // This should not happen with the new validation, but keep as safety fallback
  return project.id // Return ID as-is, don't modify
}
