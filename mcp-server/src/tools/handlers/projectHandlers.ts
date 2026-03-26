import type { Project } from '@mdt/shared/models/Project.js'
import type { ProjectService } from '@mdt/shared/services/ProjectService.js'
import process from 'node:process'
import { Sanitizer } from '../../utils/sanitizer.js'
import { JsonRpcErrorCode, ToolError } from '../../utils/toolError.js'
import { validateProjectKey } from '../../utils/validation.js'

function isProjectNotFoundError(error: unknown): error is { code: string, message: string } {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'PROJECT_NOT_FOUND'
}

/**
 * Project-specific tool handlers for MCP server
 * Handles project listing, info retrieval, and validation
 *
 * Tool definitions are now centralized in config/allTools.ts
 */
export class ProjectHandlers {
  private cachedProjects: Project[] = []

  constructor(private projectService: ProjectService) {}

  /**
   * Handle project-related tool calls
   */
  async handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.handleListProjects()

        case 'get_project_info':
          return await this.handleGetProjectInfo(args.key as string)

        default:
          throw ToolError.protocol(
            `Unknown project tool '${Sanitizer.sanitizeText(name)}'. Available tools: list_projects, get_project_info`,
            JsonRpcErrorCode.MethodNotFound,
          )
      }
    }
    catch (error) {
      console.error(`Error handling project tool ${name}:`, error)
      // Re-throw ToolError instances
      if (error instanceof ToolError) {
        throw error
      }
      // Convert other errors to tool execution errors
      throw ToolError.toolExecution(error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * Extract project code from a full-format key (e.g., "MDT-123" -> "MDT")
   * Returns null if key is not in full format
   *
   * @param key - CR key that may contain project prefix
   * @returns Project code or null
   */
  private extractProjectFromKey(key: string | undefined): string | null {
    if (!key || typeof key !== 'string') {
      return null
    }

    const trimmed = key.trim()
    // Check for full format: letters-digits (e.g., "MDT-123", "abc-12")
    const fullFormatPattern = /^([a-z]+)-\d+$/i
    const match = trimmed.match(fullFormatPattern)

    if (match) {
      return match[1].toUpperCase()
    }

    return null
  }

  /**
   * Resolve project from explicit parameter, key prefix, detected default, or single-project registry.
   * Priority: explicit project -> project from key -> detected project -> single project in registry -> throw error
   *
   * @param explicitProject - Project parameter from tool call (optional)
   * @param detectedProject - Project detected from cwd at startup (optional)
   * @param key - CR key that may contain project prefix (optional)
   * @returns Resolved project
   */
  async resolveProject(explicitProject: string | undefined, detectedProject: string | null, key?: string): Promise<Project> {
    // Use explicit project if provided (highest priority)
    if (explicitProject) {
      return this.validateProject(explicitProject)
    }

    // Try to extract project from full-format key (e.g., "MDT-123" -> "MDT")
    const projectFromKey = this.extractProjectFromKey(key)
    if (projectFromKey) {
      return this.validateProject(projectFromKey)
    }

    // Fall back to detected project
    if (detectedProject) {
      return this.validateProject(detectedProject)
    }

    // Fallback: if there's only one project in the registry, use it as default
    // This enables single-project mode when the server starts from a non-project directory
    const projects = await this.projectService.getAllProjects()
    if (projects.length === 1) {
      return projects[0]
    }

    // No project context available - this is a protocol error (missing required parameter)
    throw ToolError.protocol(
      `Project key is required. Either start MCP server from a project directory with \`.mdt-config.toml\`, or provide the \`project\` parameter explicitly. Current working directory: ${process.cwd()}`,
      JsonRpcErrorCode.InvalidParams,
    )
  }

  /**
   * Validate project key exists and return project info
   */
  async validateProject(projectKey: string): Promise<Project> {
    // Validate project key format - this is a protocol error (invalid parameter)
    const validation = validateProjectKey(projectKey)
    if (!validation.valid) {
      throw ToolError.protocol(validation.message || 'Validation error', JsonRpcErrorCode.InvalidParams)
    }

    const normalizedKey = validation.value as string
    try {
      const result = await this.projectService.getProject(normalizedKey)
      return result.data
    }
    catch (error) {
      if (!isProjectNotFoundError(error)) {
        throw error
      }

      const projectsResult = await this.projectService.listProjects({ includeInactive: true })
      this.cachedProjects = projectsResult.data
      const availableKeys = projectsResult.data.map(project =>
        project.project.code || project.id,
      ).filter(Boolean).join(', ')

      throw ToolError.toolExecution(`Project '${normalizedKey}' not found. Available projects: ${availableKeys}`)
    }
  }

  /**
   * List all discovered projects
   */
  private async handleListProjects(): Promise<string> {
    const { data: projects } = await this.projectService.listProjects({ includeInactive: true })
    this.cachedProjects = projects

    if (projects.length === 0) {
      return Sanitizer.sanitizeText('📁 No projects found. Make sure you have .mdt-config.toml files in the configured scan paths.')
    }

    const lines = [`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}:`, '']

    for (const project of projects) {
      // Get CR count from project CRs - skip if path is not defined
      if (!project.project.path) {
        continue
      }
      const crs = await this.projectService.getProjectCRs(project.project.path)
      const crCount = crs.length

      const projectCode = project.project.code || project.id
      const projectName = Sanitizer.sanitizeText(project.project.name)

      lines.push(`• **${projectCode}** - ${projectName}`)
      if (project.project.description) {
        lines.push(`  Description: ${Sanitizer.sanitizeText(project.project.description)}`)
      }
      lines.push(`  Code: ${projectCode || 'None'}`)
      if (project.project.code) {
        lines.push(`  ID: ${project.id}`)
      }
      lines.push(`  Path: ${project.project.path}`)
      lines.push(`  CRs: ${crCount}`)
      lines.push('')
    }

    return Sanitizer.sanitizeText(lines.join('\n'))
  }

  /**
   * Get detailed information about a specific project
   */
  private async handleGetProjectInfo(key: string): Promise<string> {
    const project = await this.validateProject(key)

    // Get CR count from project CRs - use path from extended Project interface
    const projectPath = (project.project as { path?: string }).path || project.project.ticketsPath || '.'
    const crs = await this.projectService.getProjectCRs(projectPath)
    const crCount = crs.length

    const projectCode = project.project.code || project.id
    const lines = [
      `📋 Project: **${projectCode}** - ${Sanitizer.sanitizeText(project.project.name)}`,
      '',
      '**Details:**',
      `- Code: ${project.project.code || 'None'}`,
      `- ID: ${project.id}`,
      `- Description: ${Sanitizer.sanitizeText(project.project.description || 'No description')}`,
      `- Path: ${projectPath}`,
      `- Total CRs: ${crCount}`,
      `- Last Accessed: ${project.metadata?.lastAccessed || 'Unknown'}`,
      '',
      '**Configuration:**',
      `- Start Number: ${project.project.startNumber || 1}`,
      `- Counter File: ${project.project.counterFile || '.mdt-next'}`,
    ]

    if (project.project.repository) {
      lines.push(`- Repository: ${Sanitizer.sanitizeUrl(project.project.repository)}`)
    }

    return Sanitizer.sanitizeText(lines.join('\n'))
  }
}
