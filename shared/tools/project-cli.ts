#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
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
        // Argument mode - handle both flag and positional arguments
        const name = (typeof args.flags.name === 'string' ? args.flags.name : args.positional[0]);
        if (!name) {
          throw new ProjectError('Project name is required. Use: npm run project:create -- --name "Project Name" --path "/path/to/project"', CLI_ERROR_CODES.VALIDATION_ERROR);
        }

        // Handle path from flag or positional argument
        const projectPath = (typeof args.flags.path === 'string' ? args.flags.path :
                           (args.positional.length > 1 && args.positional[1].startsWith('/') ? args.positional[1] : undefined));

        if (!projectPath) {
          throw new ProjectError('Project path is required. Use: npm run project:create -- --name "Project Name" --path "/path/to/project"', CLI_ERROR_CODES.VALIDATION_ERROR);
        }

        // Handle code - prefer flag over positional, but don't use positional if it looks like a path
        let code: string | undefined;
        if (typeof args.flags.code === 'string' && args.flags.code) {
          code = args.flags.code;
        } else if (args.positional.length > 1 && !args.positional[1].startsWith('/') && args.positional[1].length <= 5) {
          // Second positional might be a code (short, not a path)
          code = args.positional[1];
        }

        // Parse document-paths parameter (JSON array string)
        let documentPaths: string[] | undefined;
        if (typeof args.flags['document-paths'] === 'string') {
          try {
            documentPaths = JSON.parse(args.flags['document-paths']);
            if (!Array.isArray(documentPaths)) {
              throw new ProjectError('--document-paths must be a JSON array of strings', CLI_ERROR_CODES.VALIDATION_ERROR);
            }
            // Validate all elements are strings
            if (!documentPaths.every(p => typeof p === 'string')) {
              throw new ProjectError('All elements in --document-paths must be strings', CLI_ERROR_CODES.VALIDATION_ERROR);
            }
          } catch (e) {
            if (e instanceof ProjectError) {
              throw e;
            }
            throw new ProjectError('--document-paths must be valid JSON: ' + (e instanceof Error ? e.message : String(e)), CLI_ERROR_CODES.VALIDATION_ERROR);
          }
        }

        // Parse max-depth parameter (number)
        let maxDepth: number | undefined;
        if (args.flags['max-depth'] !== undefined) {
          if (typeof args.flags['max-depth'] === 'string') {
            const parsed = parseInt(args.flags['max-depth'], 10);
            if (isNaN(parsed) || parsed < 1 || parsed > 10) {
              throw new ProjectError('--max-depth must be a number between 1 and 10', CLI_ERROR_CODES.VALIDATION_ERROR);
            }
            maxDepth = parsed;
          } else if (typeof args.flags['max-depth'] === 'number') {
            if (args.flags['max-depth'] < 1 || args.flags['max-depth'] > 10) {
              throw new ProjectError('--max-depth must be between 1 and 10', CLI_ERROR_CODES.VALIDATION_ERROR);
            }
            maxDepth = args.flags['max-depth'];
          }
        }

        input = {
          name: name.trim(),
          code: code?.trim(),
          path: projectPath.trim(),
          description: typeof args.flags.description === 'string' ? args.flags.description.trim() : undefined,
          repository: typeof args.flags.repository === 'string' ? args.flags.repository.trim() : undefined,
          globalOnly: args.flags['global-only'] === true,
          createProjectPath: args.flags['create-project-path'] === true,
          ticketsPath: typeof args.flags['tickets-path'] === 'string' ? args.flags['tickets-path'].trim() : undefined,
          documentPaths,
          maxDepth
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
        console.log(`Config File: ${project.project.configFile || 'N/A'}`);
        console.log(`Tickets Path: ${project.project.ticketsPath || 'docs/CRs'}`);

        // Show document discovery settings for global-only projects
        if (project.document || project.metadata?.globalOnly) {
          console.log('\nDocument Discovery:');
          if (project.document?.paths) {
            console.log(`  Paths: [${project.document.paths.map(p => `"${p}"`).join(', ')}]`);
          } else {
            console.log(`  Paths: []`);
          }
          console.log(`  Exclude Folders: [${(project.document?.excludeFolders || []).map(f => `"${f}"`).join(', ')}]`);
          console.log(`  Max Depth: ${project.document?.maxDepth || 3}`);
        }

        console.log('\nMetadata:');
        console.log(`  Date Registered: ${project.metadata.dateRegistered}`);
        console.log(`  Last Accessed: ${project.metadata.lastAccessed}`);
        console.log(`  Version: ${project.metadata.version}`);
        if (project.metadata?.globalOnly) {
          console.log(`  Mode: Global-Only`);
        }
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

      // Confirm deletion (skip with --force flag)
      if (!args.flags.force) {
        console.log('\nProject to be deleted:');
        console.log(`  ID: ${project.id}`);
        console.log(`  Name: ${project.project.name}`);
        console.log(`  Path: ${project.project.path}`);

        // Red background WARNING
        console.log(`\n\x1b[41m\x1b[1;37m ⚠️  WARNING: PERMANENT ACTION \x1b[0m`);
        console.log(`\x1b[41m\x1b[37m  This will permanently delete the project profile.     \x1b[0m`);
        console.log(`\x1b[41m\x1b[37m  Project files and folders will NOT be affected.       \x1b[0m`);
        console.log(`\x1b[41m\x1b[37m  There is no way to undo this action.                 \x1b[0m`);

        console.log(`\n\x1b[1;31mFiles that will be removed:\x1b[0m`);

        // Check if files actually exist and apply strikethrough if not
        const registryFile = project.registryFile || path.join(process.env.HOME || '', '.config', 'markdown-ticket', 'projects', `${project.id}.toml`);
        const configFile = path.join(project.project.path, '.mdt-config.toml');
        const counterFile = path.join(project.project.path, '.mdt-next');

        const registryExists = fs.existsSync(registryFile);
        const configExists = fs.existsSync(configFile);
        const counterExists = fs.existsSync(counterFile);

        console.log(`  - Registry entry: ${!registryExists ? `\x1b[9m${registryFile.replace(process.env.HOME || '', '~')}\x1b[0m` : registryFile.replace(process.env.HOME || '', '~')}`);
        console.log(`  - Project config: ${!configExists ? `\x1b[9m${project.project.path}/.mdt-config.toml\x1b[0m` : `${project.project.path}/.mdt-config.toml`}`);
        console.log(`  - Counter file: ${!counterExists ? `\x1b[9m${project.project.path}/.mdt-next\x1b[0m` : `${project.project.path}/.mdt-next`}`);

        // Orange background DISABLE OPTION
        console.log(`\n\x1b[43m\x1b[1;30m 💡 ALTERNATIVE: DISABLE THIS PROJECT \x1b[0m`);
        console.log(`\x1b[43m\x1b[30m  Type "d" to disable instead of delete. \x1b[0m`);
        console.log(`\x1b[43m\x1b[30m  The project will be hidden but all files remain intact.    \x1b[0m`);

        const projectCode = project.project.code || project.id;
        console.log(`\nType "\x1b[1;31m${projectCode}\x1b[0m" for project \x1b[1;31mdeletion\x1b[0m, "\x1b[1;33md\x1b[0m" to \x1b[1;33mdisable\x1b[0m, or "\x1b[1;32mn\x1b[0m" to \x1b[1;32mcancel\x1b[0m: `);
        const action = await this.prompt.question(`> `);

        const actionLower = action.toLowerCase();

        if (actionLower === 'n') {
          throw new ProjectError('Operation cancelled by user', CLI_ERROR_CODES.USER_CANCELLED);
        }

        if (actionLower === 'd') {
          // Disable project instead of deleting
          await this.manager.disableProject(codeOrId);
          console.log('\n✅ Project disabled successfully!');
          console.log('  - Project marked as inactive');
          console.log('  - All files and data preserved');
          return;
        }

        // Continue with deletion (case-insensitive code match)
        if (action.toLowerCase() === projectCode.toLowerCase()) {
          await this.manager.deleteProject(codeOrId, true);

          // Check which files were actually deleted
          const deletedRegistry = fs.existsSync(registryFile) ? false : true;
          const deletedConfig = fs.existsSync(configFile) ? false : true;
          const deletedCounter = fs.existsSync(counterFile) ? false : true;

          console.log('\n✅ Project deleted successfully!');
          if (deletedRegistry) {
            const registryFileName = (project.registryFile || '').replace(process.env.HOME || '', '~');
            console.log(`  - Registry entry: \x1b[9m${registryFileName}\x1b[0m \x1b[32m✅\x1b[0m`);
          }
          if (deletedConfig) {
            console.log(`  - Project config: \x1b[9m${project.project.path}/.mdt-config.toml\x1b[0m \x1b[32m✅\x1b[0m`);
          }
          if (deletedCounter) {
            console.log(`  - Counter file: \x1b[9m${project.project.path}/.mdt-next\x1b[0m \x1b[32m✅\x1b[0m`);
          }
          return;
        }

        throw new ProjectError('Deletion cancelled: invalid option', CLI_ERROR_CODES.USER_CANCELLED);
      } else {
        // Immediate deletion with --force or --immediate flag
        await this.manager.deleteProject(codeOrId, true);

        console.log('\n✅ Project deleted successfully!');
        console.log(`  - Registry entry: ${(project.registryFile || '').replace(process.env.HOME || '', '~')}`);
        console.log(`  - Project config: ${project.project.path}/.mdt-config.toml`);
        console.log(`  - Counter file: ${project.project.path}/.mdt-next`);
        return;
      }
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
   * Enable project command
   */
  async enableCommand(args: ParsedArgs): Promise<void> {
    try {
      const codeOrId = args.positional[0];
      if (!codeOrId) {
        throw new ProjectError('Project code or ID is required', CLI_ERROR_CODES.VALIDATION_ERROR);
      }

      // Get project to show details
      const project = await this.manager.getProject(codeOrId);

      console.log('\nProject to be enabled:');
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.project.name}`);
      console.log(`  Path: ${project.project.path}`);
      console.log(`  Current Status: ${project.project.active ? '\x1b[32mActive\x1b[0m' : '\x1b[31mInactive\x1b[0m'}`);

      // Check if already active
      if (project.project.active) {
        console.log('\n⚠️  Project is already active');
        return;
      }

      // Confirm action
      const confirm = await this.prompt.question('\nEnable this project? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        throw new ProjectError('Enable cancelled by user', CLI_ERROR_CODES.USER_CANCELLED);
      }

      // Enable project
      await this.manager.enableProject(codeOrId);

      console.log('\n✅ Project enabled successfully!');
      console.log('  - Project marked as active');
      console.log('  - Project will appear in UI and CLI listings');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ProjectError(error.message, CLI_ERROR_CODES.NOT_FOUND, error);
      }
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        `Failed to enable project: ${error instanceof Error ? error.message : String(error)}`,
        CLI_ERROR_CODES.GENERAL_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Disable project command
   */
  async disableCommand(args: ParsedArgs): Promise<void> {
    try {
      const codeOrId = args.positional[0];
      if (!codeOrId) {
        throw new ProjectError('Project code or ID is required', CLI_ERROR_CODES.VALIDATION_ERROR);
      }

      // Get project to show details
      const project = await this.manager.getProject(codeOrId);

      console.log('\nProject to be disabled:');
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.project.name}`);
      console.log(`  Path: ${project.project.path}`);
      console.log(`  Current Status: ${project.project.active ? '\x1b[32mActive\x1b[0m' : '\x1b[31mInactive\x1b[0m'}`);

      // Check if already inactive
      if (!project.project.active) {
        console.log('\n⚠️  Project is already inactive');
        return;
      }

      // Confirm action
      const confirm = await this.prompt.question('\nDisable this project? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        throw new ProjectError('Disable cancelled by user', CLI_ERROR_CODES.USER_CANCELLED);
      }

      // Disable project
      await this.manager.disableProject(codeOrId);

      console.log('\n✅ Project disabled successfully!');
      console.log('  - Project marked as inactive');
      console.log('  - Project will be hidden from UI and CLI listings');
      console.log('  - All files and data preserved');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new ProjectError(error.message, CLI_ERROR_CODES.NOT_FOUND, error);
      }
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        `Failed to disable project: ${error instanceof Error ? error.message : String(error)}`,
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

    let ticketsPath: string | undefined;
    const ticketsPathInput = await this.prompt.question('Tickets path (relative to project root, default: docs/CRs): ');
    if (ticketsPathInput.trim()) {
      ticketsPath = ticketsPathInput.trim();
    }

    const createProjectPathInput = await this.prompt.question('Create project directory if it doesn\'t exist? (y/n, default: n): ');
    const createProjectPath = createProjectPathInput.toLowerCase().trim() === 'y' || createProjectPathInput.toLowerCase().trim() === 'yes';

    return {
      name,
      code: code.trim() || undefined,
      path: projectPath,
      description: description.trim() || undefined,
      repository: repository.trim() || undefined,
      createProjectPath,
      ticketsPath
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
        case 'enable':
          await this.commands.enableCommand(args);
          break;
        case 'disable':
          await this.commands.disableCommand(args);
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

    // Define valid flags for each command
    const validFlags: Record<string, Set<string>> = {
      create: new Set([
        'name', 'code', 'path', 'description', 'repository',
        'global-only', 'create-project-path', 'tickets-path',
        'document-paths', 'max-depth', 'interactive', 'i', 'help', 'h'
      ]),
      list: new Set(['json', 'help', 'h']),
      get: new Set(['json', 'help', 'h']),
      update: new Set(['name', 'description', 'repository', 'active', 'interactive', 'i', 'help', 'h']),
      delete: new Set(['force', 'f', 'delete-config', 'help', 'h']),
      enable: new Set(['help', 'h']),
      disable: new Set(['help', 'h'])
    };

    let i = 0;
    let command = '';

    // First argument is the command
    if (args.length > 0 && !args[0].startsWith('-')) {
      command = args[0];
      result.command = command;
      i = 1;
    }

    // Parse remaining arguments
    while (i < args.length) {
      const arg = args[i];
      const originalArg = arg;

      if (arg.startsWith('--')) {
        // Long flag
        const flagName = arg.substring(2);
        const normalizedFlag = flagName.replace(/-/g, ''); // Normalize for validation

        // Check if flag is valid for this command
        if (command && validFlags[command] && !validFlags[command].has(flagName) && !validFlags[command].has(normalizedFlag)) {
          console.warn(`\nWarning: Unknown flag --${flagName} for command '${command}'`);
        }

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

        // Check if flag is valid for this command (for common short flags)
        if (command && validFlags[command] && !validFlags[command].has(flagName) && !['h', 'i', 'f'].includes(flagName)) {
          console.warn(`\nWarning: Unknown flag -${flagName} for command '${command}'`);
        }

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
  enable <code|id>    Enable project
  disable <code|id>   Disable project

Create Options:
  --name <name>           Project name
  --code <code>           Project code (2-5 characters, uppercase letters and numbers, optional)
  --path <path>           Project path
  --description <text>    Project description (optional)
  --repository <url>      Repository URL (optional)
  --global-only           Global-only mode (no local config files)
  --create-project-path   Auto-create project directory if it doesn't exist
  --tickets-path <path>   Tickets path relative to project root (default: docs/CRs)
  --document-paths <json> Document discovery paths (JSON array, global-only only)
  --max-depth <number>    Document discovery max depth (1-10, global-only only)
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

NPM Scripts Usage:
  # Use double -- to separate npm arguments from CLI arguments
  npm run project:create -- --name "My Project" --code MP --path ~/projects/my-project
  npm run project:create -- --name "My Project" --code MP --path ~/projects/my-project --global-only
  npm run project:create -- --name "My Project" --code MP --path ~/projects/my-project --create-project-path --tickets-path "docs/CRs"
  npm run project:list -- --json
  npm run project:get -- MP
  npm run project:update -- MP --description "Updated description"

Direct CLI Usage:
  # Create project interactively
  project create --interactive

  # Create project with arguments (Project-First Strategy)
  project create --name "My Project" --code MP --path ~/projects/my-project

  # Create project with global-only mode (Strategy 1)
  project create --name "My Project" --code MP --path ~/projects/my-project --global-only

  # Create project with auto-directory creation and custom tickets path
  project create --name "My Project" --code MP --path ~/projects/my-project --create-project-path --tickets-path "docs/CRs"

  # List all projects
  project list

  # Get project details
  project get MP

  # Update project
  project update MP --description "Updated description"

  # Delete project
  project delete MP

  # Delete project without confirmation
  project delete MP --force

  # Enable project
  project enable MP

  # Disable project
  project disable MP
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
