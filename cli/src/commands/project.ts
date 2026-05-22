/**
 * CLI Project Namespace Commands (MDT-143)
 *
 * Implements project current/get/info/list/init commands using shared services.
 * Project lookups route through ProjectService, init routes through ProjectManager.
 */

import type { StructuredOutputOptions } from '../output/structured.js'
import process from 'node:process'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ServiceError } from '@mdt/shared/services/ServiceError.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { formatProjectInit, formatProjectList as formatProjectListFormatter, formatProjectView } from '../output/formatter.js'
import { CliCommandError, formatProjectForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'

interface ProjectInitOptions extends StructuredOutputOptions {
  dir?: string
  ticketsPath?: string
}

/**
 * Project current action handler
 *
 * Shows the current project context (resolved from working directory).
 *
 * @throws Process.exit(1) on error
 */
export async function projectCurrentAction(options: StructuredOutputOptions = {}): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const result = await projectService.resolveCurrentProject()

  if (!result.data) {
    throw new CliCommandError('NO_PROJECT_CONTEXT', 'No project context. Run from a project directory.')
  }

  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    writeStructuredSuccess(
      outputFormat,
      'project.current',
      {
        project: formatProjectForStructured(result.data),
      },
      {
        projectCode: result.data.project.code,
        projectId: result.data.id,
      },
    )
    return
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
export async function projectGetAction(code: string, options: StructuredOutputOptions = {}): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const project = await projectService.getProjectByCodeOrId(code)

  if (!project) {
    throw new CliCommandError('PROJECT_NOT_FOUND', `Project ${code} not found`, { projectCode: code })
  }

  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    writeStructuredSuccess(
      outputFormat,
      'project.get',
      {
        project: formatProjectForStructured(project),
      },
      {
        projectCode: project.project.code,
        projectId: project.id,
      },
    )
    return
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
export async function projectListAction(options: StructuredOutputOptions = {}): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true

  const projects = await projectService.getAllProjects()

  // Filter to active projects only
  const activeProjects = projects.filter(p => p.project.active !== false)

  // Format output
  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    writeStructuredSuccess(
      outputFormat,
      'project.list',
      {
        items: activeProjects.map(project => formatProjectForStructured(project)),
        count: {
          total: activeProjects.length,
        },
      },
    )
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
  options: ProjectInitOptions,
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

    const outputFormat = getOutputFormat(options)
    if (outputFormat !== 'human') {
      writeStructuredSuccess(
        outputFormat,
        'project.init',
        {
          project: formatProjectForStructured(project),
          initialized: true,
        },
        {
          projectCode: project.project.code,
          projectId: project.id,
        },
      )
      return
    }

    console.log(formatProjectInit(project, targetDir))
  }
  catch (error) {
    if (error instanceof ServiceError) {
      throw error
    }
    throw error
  }
}
