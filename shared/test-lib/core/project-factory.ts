/**
 * Project Factory - Test utility for creating minimal project structures and CRs for testing.
 *
 * Refactored to use shared services from @mdt/shared to avoid code duplication.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { TestEnvironment } from './test-environment.js';
import {
  RetryHelper,
  withRetry,
  withRetrySync,
  type RetryOptions,
} from '../utils/retry-helper.js';
import type { CRType, CRStatus, CRPriority } from '../../models/Types.js';
import { ProjectRegistry } from '../../services/project/ProjectRegistry.js';
import { ProjectConfigService } from '../../services/project/ProjectConfigService.js';
import type { Project } from '../../models/Project.js';

// Simple CR data structure for testing
export interface SimpleCR {
  code: string;
  title: string;
  status: CRStatus;
  type: CRType;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dateCreated: string;
  content: string;
  phaseEpic?: string;
  assignee?: string;
  impactAreas?: string[];
  relatedTickets?: string;
  dependsOn?: string;
  blocks?: string;
}

/**
 * Project configuration for test projects
 */
export interface ProjectConfig {
  repository?: string;
  name?: string;
  code?: string;
  description?: string;
  ticketsPath?: string;
  documentPaths?: string[];
  excludeFolders?: string[];
}

/**
 * Created project data
 */
export interface ProjectData {
  key: string;
  path: string;
  config: ProjectConfig;
}

/**
 * Test CR data structure
 */
export interface TestCRData {
  title: string;
  type: CRType;
  status?: CRStatus;
  priority?: CRPriority;
  phaseEpic?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  content: string;
}

/**
 * Test scenario results
 */
export interface TestScenario {
  projectCode: string;
  projectName: string;
  projectDir: string;
  crs: TestCRResult[];
}

/**
 * Result of creating a test CR
 */
export interface TestCRResult {
  success: boolean;
  crCode?: string;
  filePath?: string;
  error?: string;
}

/**
 * Error class for ProjectFactory operations
 */
export class ProjectFactoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ProjectFactoryError';
  }
}

/**
 * Factory for creating test projects and CRs using shared services
 */
export class ProjectFactory {
  private testEnv: TestEnvironment;
  private projectsDir: string;
  private retryHelper: RetryHelper;
  private projectConfigs: Map<string, ProjectConfig> = new Map();
  private registry: ProjectRegistry;
  private configService: ProjectConfigService;

  constructor(testEnv: TestEnvironment) {
    this.testEnv = testEnv;
    if (!testEnv.isInitialized()) {
      throw new ProjectFactoryError(
        'TestEnvironment must be initialized before creating ProjectFactory',
      );
    }

    // Initialize retry helper with specific options for file operations
    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelay: 100,
      backoffMultiplier: 2.0,
      maxDelay: 1000,
      timeout: 5000,
      retryableErrors: [
        'EACCES',
        'ENOENT',
        'EEXIST',
        'EBUSY',
        'EMFILE',
        'ENFILE',
      ],
      logContext: 'ProjectFactory',
    });

    // Initialize services in quiet mode for tests
    this.registry = new ProjectRegistry(true);
    this.configService = new ProjectConfigService(true);

    // Projects will be created in temp directory
    this.projectsDir = join(testEnv.getTempDirectory(), 'projects');
    if (!existsSync(this.projectsDir)) {
      mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  /**
   * Create a test project with default configuration
   */
  async createProject(
    type: 'empty' = 'empty',
    config: ProjectConfig = {},
  ): Promise<ProjectData> {
    const projectCode = config.code || this.generateUniqueProjectCode();
    const projectName = config.name || `Test Project ${projectCode}`;
    const finalConfig: ProjectConfig = {
      description: 'Test project for E2E testing',
      ticketsPath: 'docs/CRs',
      repository: 'test-repo',
      documentPaths: ['docs'],
      excludeFolders: ['node_modules', '.git', 'dist'],
      ...config,
    };

    this.projectConfigs.set(projectCode, finalConfig);

    const projectPath = await this.createProjectStructure(
      projectCode,
      projectName,
      finalConfig,
    );

    return { key: projectCode, path: projectPath, config: finalConfig };
  }

  /**
   * Generate unique project code using T{random} pattern
   */
  private generateUniqueProjectCode(): string {
    const randomPart =
      Math.random()
        .toString(36)
        .replace(/[^a-z]/g, '')
        .toUpperCase()
        .substr(0, 3) || 'AAA';
    return `T${randomPart}`.substr(0, 5);
  }

  /**
   * Create the project directory structure and configuration files
   */
  private async createProjectStructure(
    projectCode: string,
    projectName: string,
    config: ProjectConfig = {},
  ): Promise<string> {
    const projectPath = join(this.projectsDir, projectCode);

    try {
      // Create project directory with retry
      if (!existsSync(projectPath)) {
        await withRetry(
          async () => {
            mkdirSync(projectPath, { recursive: true });
          },
          {
            logContext: `ProjectFactory.createProjectDir(${projectCode})`,
          },
        );
      }

      // Create docs directory with retry
      const docsPath = join(projectPath, 'docs');
      if (!existsSync(docsPath)) {
        await withRetry(
          async () => {
            mkdirSync(docsPath, { recursive: true });
          },
          {
            logContext: `ProjectFactory.createDocsDir(${projectCode})`,
          },
        );
      }

      // Create CRs directory with retry
      const crsPath = join(projectPath, config.ticketsPath || 'docs/CRs');
      if (!existsSync(crsPath)) {
        await withRetry(
          async () => {
            mkdirSync(crsPath, { recursive: true });
          },
          {
            logContext: `ProjectFactory.createCRsDir(${projectCode})`,
          },
        );
      }

      // Create configuration files with retry
      await this.createProjectFiles(
        projectPath,
        projectCode,
        projectName,
        config,
        crsPath,
      );

      return projectPath;
    } catch (error) {
      throw new ProjectFactoryError(
        `Failed to create project structure for ${projectCode}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Create project configuration files using shared services
   */
  private async createProjectFiles(
    projectPath: string,
    projectCode: string,
    projectName: string,
    config: ProjectConfig,
    crsPath: string,
  ): Promise<void> {
    // Create .mdt-next counter file (test-specific)
    await withRetry(
      async () => {
        writeFileSync(join(projectPath, '.mdt-next'), '1', 'utf8');
      },
      {
        logContext: `ProjectFactory.createNextFile(${projectCode})`,
        retryableErrors: [
          'EACCES',
          'ENOENT',
          'EEXIST',
          'EBUSY',
          'EMFILE',
          'ENFILE',
          'EIO',
        ],
      },
    );

    // Create .gitkeep in CRs directory
    await withRetry(
      async () => {
        writeFileSync(join(crsPath, '.gitkeep'), '', 'utf8');
      },
      {
        logContext: `ProjectFactory.createGitkeep(${projectCode})`,
        retryableErrors: [
          'EACCES',
          'ENOENT',
          'EEXIST',
          'EBUSY',
          'EMFILE',
          'ENFILE',
          'EIO',
        ],
      },
    );

    // Create local config using ProjectConfigService
    this.configService.createOrUpdateLocalConfig(
      projectCode,
      projectPath,
      projectName,
      projectCode,
      config.description,
      config.repository,
      false, // globalOnly - we create local config for tests
      config.ticketsPath,
    );

    // Create Project object for registry
    const project: Project = {
      id: projectCode,
      project: {
        name: projectName,
        code: projectCode,
        path: projectPath,
        configFile: join(projectPath, '.mdt-config.toml'),
        active: true,
        description: config.description || 'Test project',
        repository: config.repository || 'test-repo',
        ticketsPath: config.ticketsPath || 'docs/CRs',
      },
      metadata: {
        dateRegistered: new Date().toISOString().split('T')[0],
        lastAccessed: new Date().toISOString().split('T')[0],
        version: '1.0.0',
      },
      document: {
        paths: config.documentPaths || ['docs'],
        excludeFolders: config.excludeFolders || ['node_modules', '.git', 'dist'],
      },
    };

    // Register project using ProjectRegistry
    this.registry.registerProject(project, {
      paths: config.documentPaths || ['docs'],
      maxDepth: 3,
    });
  }

  /**
   * Create a test CR using direct file I/O with retry logic
   */
  async createTestCR(
    projectCode: string,
    crData: TestCRData,
  ): Promise<TestCRResult> {
    try {
      const projectPath = join(this.projectsDir, projectCode);
      if (!existsSync(projectPath)) {
        return { success: false, error: `Project ${projectCode} not found` };
      }

      // Read next CR number with retry
      const nextPath = join(projectPath, '.mdt-next');
      let nextNumber = 1;
      if (existsSync(nextPath)) {
        nextNumber = await withRetry(
          async () => {
            const content = readFileSync(nextPath, 'utf8');
            return parseInt(content || '1', 10);
          },
          {
            logContext: `ProjectFactory.readNextNumber(${projectCode})`,
            timeout: 2000,
          },
        );
      }

      const crCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
      const titleSlug = this.createSlug(crData.title);
      const filename = `${crCode}-${titleSlug}.md`;
      const projectConfig = this.projectConfigs.get(projectCode);
      const crPath = join(
        projectPath,
        projectConfig?.ticketsPath || 'docs/CRs',
        filename,
      );

      // Build CR content using template with retry
      // Use simple embedded template
      const content = `# ${crData.title}

## 1. Description
${crData.content}

## 2. Rationale
To be filled...

## 3. Solution Analysis
To be filled...

## 4. Implementation Specification
To be filled...

## 5. Acceptance Criteria
To be filled...
`;

      // Create full markdown with frontmatter
      const fullContent = `---
code: ${crCode}
title: ${crData.title}
status: ${crData.status || 'Proposed'}
type: ${crData.type}
priority: ${crData.priority || 'Medium'}
${crData.phaseEpic ? `phaseEpic: ${crData.phaseEpic}` : ''}
${crData.dependsOn ? `dependsOn: ${crData.dependsOn}` : ''}
${crData.blocks ? `blocks: ${crData.blocks}` : ''}
${crData.assignee ? `assignee: ${crData.assignee}` : ''}
---

${content}`;

      // Write CR file with retry
      await withRetry(
        async () => {
          writeFileSync(crPath, fullContent, 'utf8');
        },
        {
          logContext: `ProjectFactory.writeCRFile(${crCode})`,
          retryableErrors: [
            'EACCES',
            'ENOENT',
            'EEXIST',
            'EBUSY',
            'EMFILE',
            'ENFILE',
            'EIO',
          ],
          timeout: 3000,
        },
      );

      // Update next number with retry
      await withRetry(
        async () => {
          writeFileSync(nextPath, String(nextNumber + 1), 'utf8');
        },
        {
          logContext: `ProjectFactory.updateNextNumber(${projectCode})`,
          timeout: 2000,
        },
      );

      return {
        success: true,
        crCode,
        filePath: crPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create multiple CRs for a project
   */
  async createMultipleCRs(
    projectCode: string,
    crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[],
  ): Promise<TestCRResult[]> {
    const results: TestCRResult[] = [];

    for (const crData of crsData) {
      const result = await this.createTestCR(projectCode, crData);
      results.push(result);
    }

    return results;
  }

  /**
   * Create a test scenario with predefined project and CRs
   */
  async createTestScenario(
    scenarioType: 'standard-project' | 'complex-project' = 'standard-project',
  ): Promise<TestScenario> {
    const project = await this.createProject('empty', {
      name: `${scenarioType === 'standard-project' ? 'Standard' : 'Complex'} Test Project`,
    });

    let crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[] = [];

    if (scenarioType === 'standard-project') {
      crsData = [
        {
          title: 'Initial Project Setup',
          type: 'Feature Enhancement',
          priority: 'High',
          content: 'Set up basic project structure and configuration',
        },
        {
          title: 'Add User Authentication',
          type: 'Feature Enhancement',
          priority: 'Medium',
          content: 'Implement user login and registration functionality',
        },
        {
          title: 'Fix Navigation Bug',
          type: 'Bug Fix',
          priority: 'High',
          content: 'Navigation menu not responding on mobile devices',
        },
      ];
    } else {
      // Complex project with more CRs
      crsData = [
        {
          title: 'Core Architecture Design',
          type: 'Architecture',
          priority: 'Critical',
          content: 'Design overall system architecture with microservices',
        },
        {
          title: 'Database Schema Design',
          type: 'Architecture',
          priority: 'High',
          content: 'Define database schema for all entities',
        },
        {
          title: 'User Management Service',
          type: 'Feature Enhancement',
          priority: 'High',
          content: 'Implement user CRUD operations and authentication',
        },
        {
          title: 'API Gateway Setup',
          type: 'Feature Enhancement',
          priority: 'High',
          content: 'Configure API gateway for routing and load balancing',
        },
        {
          title: 'Fix Race Condition',
          type: 'Bug Fix',
          priority: 'Critical',
          content: 'Race condition in concurrent user creation',
        },
        {
          title: 'Refactor Legacy Code',
          type: 'Technical Debt',
          priority: 'Medium',
          content: 'Update legacy authentication module to use new patterns',
        },
        {
          title: 'API Documentation',
          type: 'Documentation',
          priority: 'Low',
          content: 'Document all API endpoints with examples',
        },
      ];
    }

    const crResults = await this.createMultipleCRs(project.key, crsData);

    return {
      projectCode: project.key,
      projectName: project.config.name || project.key,
      projectDir: project.path,
      crs: crResults,
    };
  }

  /**
   * Clean up all created test projects
   */
  async cleanup(): Promise<void> {
    // Test environment cleanup will handle removing the temp directory
    // This is just for any additional cleanup if needed
  }

  /**
   * Create URL-safe slug from title (matches TicketService behavior)
   */
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
