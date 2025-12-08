import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validateProjectKey } from '../../utils/validation.js';

/**
 * Project-specific tool handlers for MCP server
 * Handles project listing, info retrieval, and validation
 */
export class ProjectHandlers {
  private cachedProjects: Project[] = [];

  constructor(private projectService: ProjectService) {}

  /**
   * Get tool definitions for project-related operations
   */
  getProjectTools(): Tool[] {
    return [
      {
        name: 'list_projects',
        description: 'List all discovered projects',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_project_info',
        description: 'Get detailed project information',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Project key (e.g., MDT, API, WEB)'
            }
          },
          required: ['key']
        }
      }
    ];
  }

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
          throw new Error(`Unknown project tool '${name}'. Available tools: list_projects, get_project_info`);
      }
    } catch (error) {
      console.error(`Error handling project tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Validate project key exists and return project info
   */
  async validateProject(projectKey: string): Promise<Project> {
    // Validate project key format
    const validation = validateProjectKey(projectKey);
    if (!validation.valid) {
      throw new Error(validation.message);
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
      throw new Error(`Project '${normalizedKey}' not found. Available projects: ${availableKeys}`);
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
      return '📁 No projects found. Make sure you have .mdt-config.toml files in the configured scan paths.';
    }

    const lines = [`📁 Found ${projects.length} project${projects.length === 1 ? '' : 's'}:`, ''];

    for (const project of projects) {
      // Get CR count from project CRs
      const crs = await this.projectService.getProjectCRs(project.project.path);
      const crCount = crs.length;

      const projectCode = project.project.code || project.id;
      const projectName = project.project.name;

      lines.push(`• **${projectCode}** - ${projectName}`);
      if (project.project.description) {
        lines.push(`  Description: ${project.project.description}`);
      }
      lines.push(`  Code: ${projectCode || 'None'}`);
      if (project.project.code) {
        lines.push(`  ID: ${project.id}`);
      }
      lines.push(`  Path: ${project.project.path}`);
      lines.push(`  CRs: ${crCount}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get detailed information about a specific project
   */
  private async handleGetProjectInfo(key: string): Promise<string> {
    const project = await this.validateProject(key);

    // Get CR count from project CRs
    const crs = await this.projectService.getProjectCRs(project.project.path);
    const crCount = crs.length;

    const projectCode = project.project.code || project.id;
    const lines = [
      `📋 Project: **${projectCode}** - ${project.project.name}`,
      '',
      '**Details:**',
      `- Code: ${project.project.code || 'None'}`,
      `- ID: ${project.id}`,
      `- Description: ${project.project.description || 'No description'}`,
      `- Path: ${project.project.path}`,
      `- Total CRs: ${crCount}`,
      `- Last Accessed: ${project.metadata.lastAccessed}`,
      '',
      '**Configuration:**',
      `- Start Number: ${project.project.startNumber || 1}`,
      `- Counter File: ${project.project.counterFile || '.mdt-next'}`,
    ];

    if (project.project.repository) {
      lines.push(`- Repository: ${project.project.repository}`);
    }

    return lines.join('\n');
  }
}