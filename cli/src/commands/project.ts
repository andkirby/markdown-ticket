import type { Project } from '@mdt/shared/models/Project.js'
/**
 * CLI Project Namespace Commands (MDT-143)
 *
 * Implements project current/get/info/list/init commands using shared services.
 * Project lookups route through ProjectService, init routes through ProjectManager.
 */

import process from 'node:process'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ServiceError } from '@mdt/shared/services/ServiceError.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { formatProjectList as formatProjectListFormatter, formatProjectView } from '../output/formatter.js'

/**
 * Format project list as JSON
 */
function formatProjectListJSON(projects: Project[]): string {
  return JSON.stringify(projects, null, 2)
}

/**
 * Project current action handler
 *
 * Shows the current project context (resolved from working directory).
 *
 * @throws Process.exit(1) on error
 */
export async function projectCurrentAction(): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const result = await projectService.resolveCurrentProject()

  if (!result.data) {
    console.error('Error: No project context. Run from a project directory.')
    process.exit(1)
  }

  console.log(formatProjectView(result.data))
}

/**
 * Project get action handler
 *
 * Shows details for a specific project by code (case-insensitive).
 *
 * @param code - Project code (e.g., "MDT", "mdt", "API")
 * @throws Process.exit(1) on error
 */
export async function projectGetAction(code: string): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const project = await projectService.getProjectByCodeOrId(code)

  if (!project) {
    console.error(`Error: Project '${code}' not found`)
    process.exit(1)
  }

  console.log(formatProjectView(project))
}

/**
 * Project list action handler
 *
 * Lists all projects in compact form.
 *
 * @param options - Command options (json: boolean for JSON output)
 * @throws Process.exit(1) on error
 */
export async function projectListAction(options: { json?: boolean }): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const projects = await projectService.getAllProjects()

  // Filter to active projects only
  const activeProjects = projects.filter(p => p.project.active !== false)

  // Format output
  if (options.json) {
    console.log(formatProjectListJSON(activeProjects))
  }
  else {
    console.log(formatProjectListFormatter(activeProjects))
  }
}

/**
 * Project init action handler
 *
 * Initializes a new project in the current or specified directory.
 * Uses ProjectManager to ensure consistent config generation.
 *
 * @param code - Project code (e.g., "MDT")
 * @param name - Project name (e.g., "Markdown Ticket Board")
 * @param options - Command options (dir: target directory path)
 * @throws Process.exit(1) on error
 */
export async function projectInitAction(
  code: string,
  name: string,
  options: { dir?: string; ticketsPath?: string },
): Promise<void> {
  const projectManager = new ProjectManager(true) // quiet=true

  const targetDir = options.dir || process.cwd()

  try {
    const project = await projectManager.createProject({
      name,
      code,
      path: targetDir,
      ...(options.ticketsPath && { ticketsPath: options.ticketsPath }),
    })

    console.log(`Initialized project ${project.project.code} in ${targetDir}`)
    console.log(`  config:    ${project.project.configFile}`)
    console.log(`  tickets:   ${project.project.ticketsPath}`)
  }
  catch (error) {
    if (error instanceof ServiceError) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }
    throw error
  }
}
