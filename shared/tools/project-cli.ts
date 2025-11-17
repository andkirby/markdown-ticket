#!/usr/bin/env node

import * as readline from 'readline';
import { ProjectManager, ProjectCreateInput, ProjectUpdateInput } from './ProjectManager.js';
import { Project } from '../models/Project.js';

/**
 * CLI error codes
 */
export const CLI_ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NOT_FOUND: 3,
  ALREADY_EXISTS: 4,
  PERMISSION_DENIED: 5,
  USER_CANCELLED: 6
} as const;

/**
 * Project error with exit code
 */
export class ProjectError extends Error {
  constructor(
    message: string,
    public code: number = CLI_ERROR_CODES.GENERAL_ERROR,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ProjectError';
  }
}

/**
 * Readline wrapper for prompts
 */
class PromptInterface {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  close(): void {
    this.rl.close();
  }
}

/**
 * Command handlers
 */
class ProjectCommands {
  private manager: ProjectManager;
  private prompt: PromptInterface;

  constructor(manager: ProjectManager, prompt: PromptInterface) {
    this.manager = manager;
    this.prompt = prompt;
  }

  /**
   * Create project command
   */
  async createCommand(args: ParsedArgs): Promise<void> {
    try {
      let input: ProjectCreateInput;

      // Check if interactive mode or argument mode
      if (args.flags.interactive || (!args.positional.length && !args.flags.name)) {
        input = await this.interactiveCreate();
      } else {
        // Argument mode
        const name = (typeof args.flags.name === 'string' ? args.flags.name : args.positional[0]);
        if (!name) {
          throw new ProjectError('Project name is required', CLI_ERROR_CODES.VALIDATION_ERROR);
        }

        const projectPath = (typeof args.flags.path === 'string' ? args.flags.path : args.positional[1]);
        if (!projectPath) {
          throw new ProjectError('Project path is required', CLI_ERROR_CODES.VALIDATION_ERROR);
        }

        input = {
          name,
          code: typeof args.flags.code === 'string' ? args.flags.code : undefined,
          path: projectPath,
          description: typeof args.flags.description === 'string' ? args.flags.description : undefined,
          repository: typeof args.flags.repository === 'string' ? args.flags.repository : undefined
        };
      }

      // Create project
      const project = await this.manager.createProject(input);

      console.log('\nProject created successfully!');
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.project.name}`);
      console.log(`  Code: ${project.project.code}`);
      console.log(`  Path: ${project.project.path}`);
      if (project.project.description) {
        console.log(`  Description: ${project.project.description}`);
      }
      if (project.project.repository) {
        console.log(`  Repository: ${project.project.repository}`);
      }
    } catch (error) {
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List projects command
   */
  async listCommand(args: ParsedArgs): Promise<void> {
    try {
      const projects = await this.manager.listProjects();

      if (projects.length === 0) {
        console.log('No projects found.');
        return;
      }

      if (args.flags.json) {
        console.log(JSON.stringify(projects, null, 2));
      } else {
        console.log('\nProjects:');
        console.log('─'.repeat(80));
        for (const project of projects) {
          console.log(`ID: ${project.id}`);
          console.log(`  Name: ${project.project.name}`);
          console.log(`  Code: ${project.project.code || 'N/A'}`);
          console.log(`  Path: ${project.project.path}`);
          console.log(`  Active: ${project.project.active ? 'Yes' : 'No'}`);
          if (project.project.description) {
            console.log(`  Description: ${project.project.description}`);
          }
          console.log('─'.repeat(80));
        }
        console.log(`\nTotal: ${projects.length} project${projects.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      throw new ProjectError(
        `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get project command
   */
  async getCommand(args: ParsedArgs): Promise<void> {
    try {
      const codeOrId = args.positional[0];
      if (!codeOrId) {
        throw new ProjectError('Project code or ID is required', CLI_ERROR_CODES.VALIDATION_ERROR);
      }

      const project = await this.manager.getProject(codeOrId);

      if (args.flags.json) {
        console.log(JSON.stringify(project, null, 2));
      } else {
        console.log('\nProject Details:');
        console.log('─'.repeat(80));
        console.log(`ID: ${project.id}`);
        console.log(`Name: ${project.project.name}`);
        console.log(`Code: ${project.project.code || 'N/A'}`);
        console.log(`Path: ${project.project.path}`);
        console.log(`Active: ${project.project.active ? 'Yes' : 'No'}`);
        console.log(`Description: ${project.project.description || 'N/A'}`);
        console.log(`Repository: ${project.project.repository || 'N/A'}`);
        console.log(`Config File: ${project.project.configFile}`);
        console.log('\nMetadata:');
        console.log(`  Date Registered: ${project.metadata.dateRegistered}`);
        console.log(`  Last Accessed: ${project.metadata.lastAccessed}`);
        console.log(`  Version: ${project.metadata.version}`);
        console.log('─'.repeat(80));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ProjectError(error.message, CLI_ERROR_CODES.NOT_FOUND, error);
      }
      throw new ProjectError(
        `Failed to get project: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update project command
   */
  async updateCommand(args: ParsedArgs): Promise<void> {
    try {
      const codeOrId = args.positional[0];
      if (!codeOrId) {
        throw new ProjectError('Project code or ID is required', CLI_ERROR_CODES.VALIDATION_ERROR);
      }

      let updates: ProjectUpdateInput;

      // Check if interactive mode
      if (args.flags.interactive) {
        updates = await this.interactiveUpdate(codeOrId);
      } else {
        // Argument mode
        updates = {
          name: typeof args.flags.name === 'string' ? args.flags.name : undefined,
          description: typeof args.flags.description === 'string' ? args.flags.description : undefined,
          repository: typeof args.flags.repository === 'string' ? args.flags.repository : undefined,
          active: args.flags.active !== undefined
            ? (typeof args.flags.active === 'string' ? args.flags.active === 'true' : args.flags.active)
            : undefined
        };

        // Check if at least one update provided
        if (!updates.name && !updates.description && updates.repository === undefined && updates.active === undefined) {
          throw new ProjectError(
            'At least one update field is required (--name, --description, --repository, --active)',
            CLI_ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const project = await this.manager.updateProject(codeOrId, updates);

      console.log('\nProject updated successfully!');
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.project.name}`);
      console.log(`  Code: ${project.project.code}`);
      console.log(`  Path: ${project.project.path}`);
      console.log(`  Active: ${project.project.active ? 'Yes' : 'No'}`);
      if (project.project.description) {
        console.log(`  Description: ${project.project.description}`);
      }
      if (project.project.repository) {
        console.log(`  Repository: ${project.project.repository}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ProjectError(error.message, CLI_ERROR_CODES.NOT_FOUND, error);
      }
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        `Failed to update project: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete project command
   */
  async deleteCommand(args: ParsedArgs): Promise<void> {
    try {
      const codeOrId = args.positional[0];
      if (!codeOrId) {
        throw new ProjectError('Project code or ID is required', CLI_ERROR_CODES.VALIDATION_ERROR);
      }

      // Get project to show details
      const project = await this.manager.getProject(codeOrId);

      // Confirm deletion
      if (!args.flags.force) {
        console.log('\nProject to be deleted:');
        console.log(`  ID: ${project.id}`);
        console.log(`  Name: ${project.project.name}`);
        console.log(`  Path: ${project.project.path}`);

        // Red background WARNING
        console.log(`\n\x1b[41m\x1b[1;37m ⚠️  WARNING: PERMANENT ACTION \x1b[0m`);
        console.log(`\x1b[41m\x1b[37m  This will permanently delete all project data.       \x1b[0m`);
        console.log(`\x1b[41m\x1b[37m  There is no way to undo this action.                 \x1b[0m`);

        console.log(`\n\x1b[1;31mFiles that will be removed:\x1b[0m`);
        console.log(`  - Registry entry: ~/.config/markdown-ticket/projects/${project.id}.toml`);
        console.log(`  - Project config: ${project.project.path}/.mdt-config.toml`);
        console.log(`  - Counter file: ${project.project.path}/.mdt-next`);

        // Orange background DISABLE OPTION
        console.log(`\n\x1b[43m\x1b[1;30m 💡 ALTERNATIVE: DISABLE THIS PROJECT \x1b[0m`);
        console.log(`\x1b[43m\x1b[30m  Hit "y" when prompted to just disable instead of delete. \x1b[0m`);
        console.log(`\x1b[43m\x1b[30m  The project will be hidden but all files remain intact.    \x1b[0m`);

        const projectCode = project.project.code || project.id;
        const confirm = await this.prompt.question(`\nDisable this project instead? (y/n): `);

        if (confirm.toLowerCase() === 'y') {
          // Disable project instead of deleting
          await this.manager.disableProject(codeOrId);
          console.log('\n✅ Project disabled successfully!');
          console.log('  - Project marked as inactive');
          console.log('  - All files and data preserved');
          return;
        }

        // Continue with deletion
        const deleteConfirm = await this.prompt.question(`\nType the project code "${projectCode}" to confirm deletion: `);
        if (deleteConfirm !== projectCode) {
          throw new ProjectError('Deletion cancelled: project code does not match', CLI_ERROR_CODES.USER_CANCELLED);
        }
      }

      // Always delete all project files
      await this.manager.deleteProject(codeOrId, true);

      console.log('\n✅ Project deleted successfully!');
      console.log('  - Registry entry removed');
      console.log('  - .mdt-config.toml removed');
      console.log('  - .mdt-next removed');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ProjectError(error.message, CLI_ERROR_CODES.NOT_FOUND, error);
      }
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Interactive project creation
   */
  private async interactiveCreate(): Promise<ProjectCreateInput> {
    console.log('\nCreate New Project');
    console.log('─'.repeat(80));

    const name = await this.promptWithValidation(
      'Project name: ',
      (value) => value.trim().length > 0,
      'Project name cannot be empty'
    );

    const code = await this.prompt.question('Project code (2-5 letters, optional): ');

    const projectPath = await this.promptWithValidation(
      'Project path: ',
      (value) => value.trim().length > 0,
      'Project path cannot be empty'
    );

    const description = await this.prompt.question('Description (optional): ');
    const repository = await this.prompt.question('Repository URL (optional): ');

    return {
      name,
      code: code.trim() || undefined,
      path: projectPath,
      description: description.trim() || undefined,
      repository: repository.trim() || undefined
    };
  }

  /**
   * Interactive project update
   */
  private async interactiveUpdate(codeOrId: string): Promise<ProjectUpdateInput> {
    // Load current project
    const project = await this.manager.getProject(codeOrId);

    console.log('\nUpdate Project');
    console.log('─'.repeat(80));
    console.log('Current values shown in [brackets]. Press Enter to keep current value.\n');

    const name = await this.prompt.question(`Name [${project.project.name}]: `);
    const description = await this.prompt.question(`Description [${project.project.description || 'none'}]: `);
    const repository = await this.prompt.question(`Repository [${project.project.repository || 'none'}]: `);
    const activeStr = await this.prompt.question(`Active [${project.project.active ? 'yes' : 'no'}]: `);

    const updates: ProjectUpdateInput = {};

    if (name.trim()) {
      updates.name = name.trim();
    }
    if (description.trim()) {
      updates.description = description.trim();
    }
    if (repository.trim()) {
      updates.repository = repository.trim();
    }
    if (activeStr.trim()) {
      const normalizedActive = activeStr.toLowerCase().trim();
      if (normalizedActive === 'yes' || normalizedActive === 'true') {
        updates.active = true;
      } else if (normalizedActive === 'no' || normalizedActive === 'false') {
        updates.active = false;
      }
    }

    return updates;
  }

  /**
   * Prompt with validation
   */
  private async promptWithValidation(
    promptText: string,
    validator: (value: string) => boolean,
    errorMessage: string
  ): Promise<string> {
    let value = await this.prompt.question(promptText);
    while (!validator(value)) {
      console.log(`  Error: ${errorMessage}`);
      value = await this.prompt.question(promptText);
    }
    return value;
  }
}

/**
 * Parsed command-line arguments
 */
interface ParsedArgs {
  command?: string;
  positional: string[];
  flags: Record<string, string | boolean | undefined>;
}

/**
 * Main CLI application
 */
class ProjectCLI {
  private manager: ProjectManager;
  private prompt: PromptInterface;
  private commands: ProjectCommands;

  constructor() {
    this.manager = new ProjectManager(true); // quiet mode to reduce logging noise
    this.prompt = new PromptInterface();
    this.commands = new ProjectCommands(this.manager, this.prompt);
  }

  /**
   * Main entry point
   */
  async run(argv: string[]): Promise<number> {
    try {
      const args = this.parseArgs(argv.slice(2));

      // Show usage if no command or help flag
      if (!args.command || args.flags.help || args.flags.h) {
        this.showUsage();
        return CLI_ERROR_CODES.SUCCESS;
      }

      // Route to command handler
      switch (args.command) {
        case 'create':
          await this.commands.createCommand(args);
          break;
        case 'list':
          await this.commands.listCommand(args);
          break;
        case 'get':
          await this.commands.getCommand(args);
          break;
        case 'update':
          await this.commands.updateCommand(args);
          break;
        case 'delete':
          await this.commands.deleteCommand(args);
          break;
        default:
          console.error(`Unknown command: ${args.command}`);
          this.showUsage();
          return CLI_ERROR_CODES.VALIDATION_ERROR;
      }

      return CLI_ERROR_CODES.SUCCESS;
    } catch (error) {
      if (error instanceof ProjectError) {
        console.error(`\nError: ${error.message}`);
        if (error.cause) {
          console.error(`Caused by: ${error.cause.message}`);
        }
        return error.code;
      }

      console.error(`\nUnexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return CLI_ERROR_CODES.GENERAL_ERROR;
    } finally {
      this.prompt.close();
    }
  }

  /**
   * Parse command-line arguments
   */
  private parseArgs(args: string[]): ParsedArgs {
    const result: ParsedArgs = {
      positional: [],
      flags: {}
    };

    let i = 0;

    // First argument is the command
    if (args.length > 0 && !args[0].startsWith('-')) {
      result.command = args[0];
      i = 1;
    }

    // Parse remaining arguments
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Long flag
        const flagName = arg.substring(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.flags[flagName] = args[i + 1];
          i += 2;
        } else {
          result.flags[flagName] = true;
          i += 1;
        }
      } else if (arg.startsWith('-')) {
        // Short flag
        const flagName = arg.substring(1);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result.flags[flagName] = args[i + 1];
          i += 2;
        } else {
          result.flags[flagName] = true;
          i += 1;
        }
      } else {
        // Positional argument
        result.positional.push(arg);
        i += 1;
      }
    }

    return result;
  }

  /**
   * Show usage information
   */
  private showUsage(): void {
    console.log(`
Project Management CLI

Usage: project <command> [options]

Commands:
  create              Create a new project
  list                List all projects
  get <code|id>       Get project details
  update <code|id>    Update project
  delete <code|id>    Delete project

Create Options:
  --name <name>           Project name
  --code <code>           Project code (2-5 letters, optional)
  --path <path>           Project path
  --description <text>    Project description (optional)
  --repository <url>      Repository URL (optional)
  --interactive, -i       Interactive mode

List Options:
  --json                  Output as JSON

Get Options:
  --json                  Output as JSON

Update Options:
  --name <name>           New project name
  --description <text>    New description
  --repository <url>      New repository URL
  --active <true|false>   Set active status
  --interactive, -i       Interactive mode

Delete Options:
  --force, -f             Skip confirmation
  --delete-config         Also delete local .mdt-config.toml

Global Options:
  --help, -h              Show this help message

Examples:
  # Create project interactively
  project create --interactive

  # Create project with arguments
  project create --name "My Project" --code MP --path ~/projects/my-project

  # List all projects
  project list

  # Get project details
  project get MP

  # Update project
  project update MP --description "Updated description"

  # Delete project
  project delete MP
`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ProjectCLI();
  cli.run(process.argv).then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(CLI_ERROR_CODES.GENERAL_ERROR);
  });
}

export { ProjectCLI, ProjectCommands, PromptInterface };
