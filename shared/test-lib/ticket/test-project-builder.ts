/**
 * Test Project Builder - Creates project structure for testing
 *
 * Extracted from ProjectFactory to provide focused project structure creation
 * with directory creation and configuration file management.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { withRetry } from '../utils/retry-helper.js';
import { ProjectRegistry } from '../../services/project/ProjectRegistry.js';
import { ProjectConfigService } from '../../services/project/ProjectConfigService.js';
import type { Project } from '../../models/Project.js';

/** Project configuration for test projects */
export interface ProjectConfig {
  repository?: string;
  name?: string;
  code?: string;
  description?: string;
  ticketsPath?: string;
  documentPaths?: string[];
  excludeFolders?: string[];
}

/** Created project data */
export interface ProjectData {
  key: string;
  path: string;
  config: ProjectConfig;
}

/** Error class for TestProjectBuilder operations */
export class TestProjectBuilderError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'TestProjectBuilderError';
  }
}

/** Builder for creating test project structures */
export class TestProjectBuilder {
  private projectsDir: string;
  private registry: ProjectRegistry;
  private configService: ProjectConfigService;

  constructor(projectsDir: string) {
    this.projectsDir = projectsDir;
    this.registry = new ProjectRegistry(true);
    this.configService = new ProjectConfigService(true);
  }

  /** Create a test project with default configuration */
  async createProject(projectCode: string, config: ProjectConfig = {}): Promise<ProjectData> {
    const projectName = config.name || `Test Project ${projectCode}`;
    const finalConfig: ProjectConfig = {
      description: 'Test project for E2E testing',
      ticketsPath: 'docs/CRs',
      repository: 'test-repo',
      documentPaths: ['docs'],
      excludeFolders: ['node_modules', '.git', 'dist'],
      ...config,
      code: projectCode,
    };
    const projectPath = await this.createProjectStructure(projectCode, projectName, finalConfig);
    return { key: projectCode, path: projectPath, config: finalConfig };
  }

  /** Generate unique project code using T{random} pattern */
  generateUniqueProjectCode(): string {
    const randomPart = Math.random().toString(36).replace(/[^a-z]/g, '').toUpperCase().substr(0, 3) || 'AAA';
    return `T${randomPart}`.substr(0, 5);
  }

  /** Create the project directory structure and configuration files */
  private async createProjectStructure(projectCode: string, projectName: string, config: ProjectConfig = {}): Promise<string> {
    const projectPath = join(this.projectsDir, projectCode);
    try {
      if (!existsSync(projectPath)) {
        await withRetry(async () => mkdirSync(projectPath, { recursive: true }), { logContext: `TestProjectBuilder.createProjectDir(${projectCode})` });
      }
      const docsPath = join(projectPath, 'docs');
      if (!existsSync(docsPath)) {
        await withRetry(async () => mkdirSync(docsPath, { recursive: true }), { logContext: `TestProjectBuilder.createDocsDir(${projectCode})` });
      }
      const crsPath = join(projectPath, config.ticketsPath || 'docs/CRs');
      if (!existsSync(crsPath)) {
        await withRetry(async () => mkdirSync(crsPath, { recursive: true }), { logContext: `TestProjectBuilder.createCRsDir(${projectCode})` });
      }
      await this.createProjectFiles(projectPath, projectCode, projectName, config, crsPath);
      return projectPath;
    } catch (error) {
      throw new TestProjectBuilderError(
        `Failed to create project structure for ${projectCode}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /** Create project configuration files using shared services */
  private async createProjectFiles(projectPath: string, projectCode: string, projectName: string, config: ProjectConfig, crsPath: string): Promise<void> {
    const retryableErrors = ['EACCES', 'ENOENT', 'EEXIST', 'EBUSY', 'EMFILE', 'ENFILE', 'EIO'];
    await withRetry(async () => writeFileSync(join(projectPath, '.mdt-next'), '1', 'utf8'), { logContext: `TestProjectBuilder.createNextFile(${projectCode})`, retryableErrors });
    await withRetry(async () => writeFileSync(join(crsPath, '.gitkeep'), '', 'utf8'), { logContext: `TestProjectBuilder.createGitkeep(${projectCode})`, retryableErrors });

    this.configService.createOrUpdateLocalConfig(projectCode, projectPath, projectName, projectCode, config.description, config.repository, false, config.ticketsPath);

    const project: Project = {
      id: projectCode,
      project: { name: projectName, code: projectCode, path: projectPath, configFile: join(projectPath, '.mdt-config.toml'), active: true, description: config.description || 'Test project', repository: config.repository || 'test-repo', ticketsPath: config.ticketsPath || 'docs/CRs' },
      metadata: { dateRegistered: new Date().toISOString().split('T')[0], lastAccessed: new Date().toISOString().split('T')[0], version: '1.0.0' },
      document: { paths: config.documentPaths || ['docs'], excludeFolders: config.excludeFolders || ['node_modules', '.git', 'dist'] },
    };

    this.registry.registerProject(project, { paths: config.documentPaths || ['docs'], maxDepth: 3 });
    if (config.documentPaths && config.documentPaths.length > 0) {
      await this.configService.configureDocuments(projectCode, config.documentPaths);
    }
  }
}
