import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { validateProjectKey } from '../../utils/validation.js';
import { Sanitizer } from '../../utils/sanitizer.js';
import { ToolError, JsonRpcErrorCode } from '../../utils/toolError.js';

/**
 * Project-specific tool handlers for MCP server
 * Handles project listing, info retrieval, and validation
 *
 * Tool definitions are now centralized in config/allTools.ts
 */
export class ProjectHandlers {
  private cachedProjects: Project[] = [];

  constructor(private projectService: ProjectService) {}

  /**
   * Handle project-related tool calls
   */
  async handleToolCall(name: string, args: any): Promise<string> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.handleListProjects();

        case 'get_project_info':
          return await this.handleGetProjectInfo(args.key);

        default:
          throw ToolError.protocol(
            `Unknown project tool '${Sanitizer.sanitizeText(name)}'. Available tools: list_projects, get_project_info`,
            JsonRpcErrorCode.MethodNotFound
          );
      }
    } catch (error) {
      console.error(`Error handling project tool ${name}:`, error);
      // Re-throw ToolError instances
      if (error instanceof ToolError) {
        throw error;
      }
      // Convert other errors to tool execution errors
      throw ToolError.toolExecution(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate project key exists and return project info
   */
  async validateProject(projectKey: string): Promise<Project> {
    // Validate project key format - this is a protocol error (invalid parameter)
    const validation = validateProjectKey(projectKey);
    if (!validation.valid) {
      throw ToolError.protocol(validation.message || "Validation error", JsonRpcErrorCode.InvalidParams);
    }

    // Get all projects (uses cache if available)
    const projects = await this.projectService.getAllProjects();
    this.cachedProjects = projects;

    // Look for project by validated code first, then fall back to id for backward compatibility
    const normalizedKey = validation.value;
    const project = projects.find(p =>
      p.project.code === normalizedKey || p.id === normalizedKey
    );
    if (!project) {
      const availableKeys = projects.map(p =>
        p.project.code || p.id
      ).filter(Boolean).join(', ');
      // Project not found is a business logic failure (tool execution error)
      throw ToolError.toolExecution(`Project '${normalizedKey}' not found. Available projects: ${availableKeys}`);
    }
    return project;
  }

  /**
   * List all discovered projects
   */
  private async handleListProjects(): Promise<string> {
    // Get all projects (uses cache if available)
    const projects = await this.projectService.getAllProjects();
    this.cachedProjects = projects;

    if (projects.length === 0) {
      return Sanitizer.sanitizeText('📁 No projects found. Make sure you have .mdt-config.toml files in the configured scan paths.');
    }

    const lines = [`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}:`, ''];

    for (const project of projects) {
      // Get CR count from project CRs - skip if path is not defined
      if (!project.project.path) {
        continue;
      }
      const crs = await this.projectService.getProjectCRs(project.project.path);
      const crCount = crs.length;

      const projectCode = project.project.code || project.id;
      const projectName = Sanitizer.sanitizeText(project.project.name);

      lines.push(`• **${projectCode}** - ${projectName}`);
      if (project.project.description) {
        lines.push(`  Description: ${Sanitizer.sanitizeText(project.project.description)}`);
      }
      lines.push(`  Code: ${projectCode || 'None'}`);
      if (project.project.code) {
        lines.push(`  ID: ${project.id}`);
      }
      lines.push(`  Path: ${project.project.path}`);
      lines.push(`  CRs: ${crCount}`);
      lines.push('');
    }

    return Sanitizer.sanitizeText(lines.join('\n'));
  }

  /**
   * Get detailed information about a specific project
   */
  private async handleGetProjectInfo(key: string): Promise<string> {
    const project = await this.validateProject(key);

    // Get CR count from project CRs - use path from extended Project interface
    const projectPath = (project.project as any).path || project.project.ticketsPath || '.';
    const crs = await this.projectService.getProjectCRs(projectPath);
    const crCount = crs.length;

    const projectCode = project.project.code || project.id;
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
    ];

    if (project.project.repository) {
      lines.push(`- Repository: ${Sanitizer.sanitizeUrl(project.project.repository)}`);
    }

    return Sanitizer.sanitizeText(lines.join('\n'));
  }
}