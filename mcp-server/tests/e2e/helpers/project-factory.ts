/**
 * Project Factory
 *
 * Test utility for creating minimal project structures and CRs for E2E testing.
 * Follows TDD principles to provide reliable test data creation.
 *
 * Key Design Principles:
 * - **Test Data Isolation**: Each test gets its own isolated project structure
 * - **MCP API First**: Uses MCP API for all CR operations (no direct file manipulation)
 * - **Configurable Scenarios**: Supports both simple and complex test scenarios
 * - **Auto-Discovery Ready**: Creates proper .mdt-config.toml for MCP server discovery
 *
 * Usage Examples:
 * ```typescript
 * const factory = new ProjectFactory(testEnv, mcpClient);
 *
 * // Create a minimal project
 * const projectDir = await factory.createProjectStructure('TEST', 'Test Project');
 *
 * // Create a CR via API
 * const cr = await factory.createTestCR('TEST', {
 *   title: 'Test CR',
 *   type: 'Feature Enhancement',
 *   content: '## 1. Description\nTest content'
 * });
 *
 * // Create a complete test scenario
 * const scenario = await factory.createTestScenario('standard-project');
 * ```
 */

import { TestEnvironment } from './test-environment';
import { MCPClient, MCPResponse } from './mcp-client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Configuration options for creating test projects
 */
export interface ProjectConfig {
  /** Git repository URL for the project */
  repository?: string;
  /** Project description */
  description?: string;
  /** Custom path for CR storage (default: 'docs/CRs') */
  crPath?: string;
  /** Paths to scan for documents (default: ['docs']) */
  documentPaths?: string[];
  /** Folders to exclude from scanning */
  excludeFolders?: string[];
}

/**
 * Data structure for creating test CRs
 */
export interface TestCRData {
  /** CR title (required) */
  title: string;
  /** CR type (required) */
  type: 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation';
  /** CR status (default: 'Proposed') */
  status?: 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected';
  /** CR priority (default: 'Medium') */
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  /** Phase or epic identifier */
  phaseEpic?: string;
  /** CRs this CR depends on */
  dependsOn?: string;
  /** CRs blocked by this CR */
  blocks?: string;
  /** Assigned person for implementation */
  assignee?: string;
  /** Full markdown content with required sections */
  content: string;
}

/**
 * Complete test scenario with project and CRs
 */
export interface TestScenario {
  /** Project code (e.g., 'TEST') */
  projectCode: string;
  /** Project display name */
  projectName: string;
  /** Absolute path to project directory */
  projectDir: string;
  /** Created CRs via MCP API */
  crs: MCPResponse[];
}

/**
 * Error thrown when project factory operations fail
 */
export class ProjectFactoryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ProjectFactoryError';
  }
}

export class ProjectFactory {
  private testEnv: TestEnvironment;
  private mcpClient: MCPClient;

  private static readonly PROJECT_CODE_REGEX = /^[A-Z]{2,10}$/;
  private static readonly DEFAULT_CONFIG = {
    crPath: 'docs/CRs',
    documentPaths: ['docs'],
    excludeFolders: ['node_modules', '.git', 'test-results']
  };

  constructor(testEnv: TestEnvironment, mcpClient: MCPClient) {
    if (!testEnv) {
      throw new ProjectFactoryError('TestEnvironment is required');
    }
    if (!mcpClient) {
      throw new ProjectFactoryError('MCPClient is required');
    }

    this.testEnv = testEnv;
    this.mcpClient = mcpClient;
  }

  /**
   * Create a minimal project structure that MCP server will auto-discover
   *
   * @param projectCode - Unique project identifier (e.g., 'TEST', 'MDT')
   * @param projectName - Human-readable project name
   * @param config - Optional project configuration overrides
   * @returns Absolute path to created project directory
   * @throws {ProjectFactoryError} If project creation fails
   */
  async createProjectStructure(
    projectCode: string,
    projectName: string,
    config: ProjectConfig = {}
  ): Promise<string> {
    // Validate inputs
    this.validateProjectCode(projectCode);
    this.validateProjectName(projectName);

    // Merge config with defaults
    const finalConfig = { ...ProjectFactory.DEFAULT_CONFIG, ...config };

    try {
      // Create project directory in config directory for MCP server discovery
      const configDir = this.testEnv.getConfigDir();
      const projectsConfigDir = join(configDir, 'projects');
      mkdirSync(projectsConfigDir, { recursive: true });

      // Create project directory in temp directory
      const projectDir = this.testEnv.createProjectDir(projectCode);

      // Create project structure
      this.testEnv.createProjectStructure(projectCode, {
        [finalConfig.crPath!]: true,
        '.mdt-config.toml': this.generateConfigFile(projectCode, projectName, finalConfig),
        '.mdt-next': '0', // Initialize counter
        'README.md': this.generateReadmeContent(projectName)
      });

      // Register project in MCP server config directory for discovery
      const projectConfigPath = join(projectsConfigDir, `${projectCode}.toml`);
      writeFileSync(projectConfigPath, `[project]
path = "${projectDir}"
registered = "${new Date().toISOString()}"
active = true
`, 'utf8');

      // Set CONFIG_DIR environment variable for MCP server
      process.env.CONFIG_DIR = configDir;

      return projectDir;
    } catch (error) {
      // Only wrap unexpected errors, not validation errors
      if (error instanceof ProjectFactoryError) {
        throw error;
      }
      throw new ProjectFactoryError(
        `Failed to create project structure for ${projectCode}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate project code format
   */
  private validateProjectCode(projectCode: string): void {
    if (!projectCode) {
      throw new ProjectFactoryError('Project code is required');
    }
    if (!ProjectFactory.PROJECT_CODE_REGEX.test(projectCode)) {
      throw new ProjectFactoryError(
        `Project code '${projectCode}' must be 2-10 uppercase letters (e.g., 'TEST', 'MDT')`
      );
    }
  }

  /**
   * Validate project name
   */
  private validateProjectName(projectName: string): void {
    if (!projectName || projectName.trim().length === 0) {
      throw new ProjectFactoryError('Project name is required');
    }
    if (projectName.length > 100) {
      throw new ProjectFactoryError('Project name must be 100 characters or less');
    }
  }

  /**
   * Generate README.md content for the project
   */
  private generateReadmeContent(projectName: string): string {
    return `# ${projectName}

Test project for E2E testing.

## Purpose

This project is automatically generated for testing purposes.

## Configuration

The project is configured with:
- \`.mdt-config.toml\`: MCP server configuration
- \`docs/CRs\`: Directory for CR files
- \`.mdt-next\`: Counter for CR numbering

## Testing

This project is used by the E2E test suite to verify:
- Project auto-discovery
- CR creation via MCP API
- CR management operations

---
*Generated by ProjectFactory for E2E testing*
`;
  }

  /**
   * Generate .mdt-config.toml content for auto-discovery
   */
  private generateConfigFile(
    projectCode: string,
    projectName: string,
    config: ProjectConfig
  ): string {
    const crPath = config.crPath || ProjectFactory.DEFAULT_CONFIG.crPath;
    const documentPaths = config.documentPaths || ProjectFactory.DEFAULT_CONFIG.documentPaths;
    const excludeFolders = config.excludeFolders || ProjectFactory.DEFAULT_CONFIG.excludeFolders;

    const lines = [
      '[project]',
      `name = "${projectName}"`,
      `code = "${projectCode}"`,
      `id = "${projectCode.toLowerCase()}"`,
      `ticketsPath = "${crPath}"`,
      'startNumber = 1',
      'counterFile = ".mdt-next"'
    ];

    // Only add description if explicitly provided
    if (config.description) {
      lines.push(`description = "${config.description}"`);
    }

    if (config.repository) {
      lines.push(`repository = "${config.repository}"`);
    }

    lines.push(
      `exclude_folders = [${excludeFolders.map(p => `"${p}"`).join(', ')}]`,
      `document_paths = [${documentPaths.map(p => `"${p}"`).join(', ')}]`,
      'max_depth = 3',
      ''
    );

    return lines.join('\n');
  }

  /**
   * Create a test CR using the MCP API
   *
   * @param projectCode - Project code where CR will be created
   * @param crData - CR data including title, type, and content
   * @returns MCP response with created CR details
   * @throws {ProjectFactoryError} If CR creation fails
   */
  async createTestCR(projectCode: string, crData: TestCRData): Promise<MCPResponse> {
    // Validate inputs
    this.validateCRData(crData);

    try {
      const response = await this.mcpClient.callTool('create_cr', {
        project: projectCode,
        type: crData.type,
        data: {
          title: crData.title,
          status: crData.status,
          priority: crData.priority || 'Medium',
          phaseEpic: crData.phaseEpic,
          dependsOn: crData.dependsOn,
          blocks: crData.blocks,
          assignee: crData.assignee,
          content: crData.content
        }
      });

      // Extract CR key from response and add it to the response object
      if (response.success && response.data) {
        // Look for "✅ **Created CR KEY**: Title" format
        const titleMatch = response.data.match(/✅ \*\*Created CR (.+?)\*\*:/);
        if (titleMatch) {
          response.key = titleMatch[1];
        } else {
          // Fallback to looking for "- Key: KEY" format
          const keyMatch = response.data.match(/- Key: (.+)$/m);
          if (keyMatch) {
            response.key = keyMatch[1];
          }
        }
      }

      return response;
    } catch (error) {
      // Only wrap unexpected errors, not validation errors
      if (error instanceof ProjectFactoryError) {
        throw error;
      }
      throw new ProjectFactoryError(
        `Failed to create CR '${crData.title}' in project ${projectCode}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate CR data before creation
   */
  private validateCRData(crData: TestCRData): void {
    if (!crData.title || crData.title.trim().length === 0) {
      throw new ProjectFactoryError('CR title is required');
    }
    if (!crData.type) {
      throw new ProjectFactoryError('CR type is required');
    }
    if (!crData.content || crData.content.trim().length === 0) {
      throw new ProjectFactoryError('CR content is required');
    }

    // Validate content has required sections
    const requiredSections = ['## 1. Description', '## 2. Rationale'];
    const missingSections = requiredSections.filter(
      section => !crData.content.includes(section)
    );
    if (missingSections.length > 0) {
      throw new ProjectFactoryError(
        `CR content is missing required sections: ${missingSections.join(', ')}`
      );
    }
  }

  /**
   * Create multiple test CRs
   *
   * @param projectCode - Project code where CRs will be created
   * @param crsData - Array of CR data (without dependencies for simplicity)
   * @returns Array of MCP responses for created CRs
   * @throws {ProjectFactoryError} If any CR creation fails
   */
  async createMultipleCRs(
    projectCode: string,
    crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[]
  ): Promise<MCPResponse[]> {
    const responses: MCPResponse[] = [];
    const errors: Error[] = [];

    for (const [index, crData] of crsData.entries()) {
      try {
        const response = await this.createTestCR(projectCode, crData as TestCRData);
        responses.push(response);
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error
            : new Error(`Failed to create CR at index ${index}`)
        );
      }
    }

    if (errors.length > 0) {
      throw new ProjectFactoryError(
        `Failed to create ${errors.length} of ${crsData.length} CRs`,
        new Error(errors.map(e => e.message).join('; '))
      );
    }

    return responses;
  }

  /**
   * Create a complete test scenario with project and CRs
   *
   * @param scenarioType - Type of test scenario to create
   * @returns Complete test scenario with project and CRs
   * @throws {ProjectFactoryError} If scenario creation fails
   */
  async createTestScenario(
    scenarioType: 'standard-project' | 'complex-project' = 'standard-project'
  ): Promise<TestScenario> {
    try {
      const { projectCode, projectName, projectConfig, crsData } = this.getScenarioDefinition(scenarioType);

      // Create project with specific configuration
      const projectDir = await this.createProjectStructure(
        projectCode,
        projectName,
        projectConfig
      );

      // Create CRs
      const crs = await this.createMultipleCRs(projectCode, crsData);

      // Set up dependencies for complex scenarios
      if (scenarioType === 'complex-project' && crs.length >= 3) {
        await this.setupComplexDependencies(projectCode, crs);
      }

      return {
        projectCode,
        projectName,
        projectDir,
        crs
      };
    } catch (error) {
      throw new ProjectFactoryError(
        `Failed to create test scenario: ${scenarioType}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get scenario definition based on type
   */
  private getScenarioDefinition(scenarioType: 'standard-project' | 'complex-project'): {
    projectCode: string;
    projectName: string;
    projectConfig: ProjectConfig;
    crsData: TestCRData[];
  } {
    if (scenarioType === 'standard-project') {
      return {
        projectCode: 'TEST',
        projectName: 'Test Project',
        projectConfig: {},
        crsData: [
          {
            title: 'Setup Project Infrastructure',
            type: 'Architecture',
            priority: 'High',
            content: this.generateStandardCRContent(
              'Setup Project Infrastructure',
              'Setup basic project infrastructure for testing',
              'Every project needs basic infrastructure to support development',
              'Using standard project template with minimal configuration',
              [
                'Create directory structure',
                'Initialize configuration files',
                'Setup documentation'
              ],
              [
                'Project structure created',
                'Configuration files in place',
                'Documentation initialized'
              ]
            )
          },
          {
            title: 'Fix Login Bug',
            type: 'Bug Fix',
            priority: 'High',
            content: this.generateStandardCRContent(
              'Fix Login Bug',
              'Users cannot login with valid credentials',
              'Login is critical functionality that must work',
              'Authentication token is not being set correctly in session',
              [
                'Debug authentication flow',
                'Fix token handling',
                'Add proper error handling'
              ],
              [
                'Users can login with valid credentials',
                'Error messages are clear',
                'Session persists correctly'
              ]
            )
          }
        ]
      };
    } else {
      // Complex project with dependencies
      return {
        projectCode: 'COMP',
        projectName: 'Complex Test Project',
        projectConfig: {
          repository: 'https://github.com/example/complex-project',
          crPath: 'tickets',
          documentPaths: ['docs', 'specifications', 'wiki']
        },
        crsData: [
          {
            title: 'Database Schema Design',
            type: 'Architecture',
            priority: 'Critical',
            content: this.generateStandardCRContent(
              'Database Schema Design',
              'Design database schema for complex application',
              'Proper schema design is critical for performance and scalability',
              'Will analyze requirements and design normalized schema with proper indexing',
              [
                'Analyze data requirements',
                'Design entity relationships',
                'Define indexes and constraints',
                'Create migration scripts'
              ],
              [
                'Schema diagram approved',
                'Migration scripts created',
                'Performance benchmarks met'
              ]
            )
          },
          {
            title: 'Implement User Management',
            type: 'Feature Enhancement',
            priority: 'High',
            content: this.generateStandardCRContent(
              'Implement User Management',
              'Implement user management features',
              'Users need to manage their profiles and settings',
              'Building on top of authentication system to add profile management',
              [
                'Create user profile models',
                'Implement CRUD operations',
                'Add profile update UI',
                'Integrate with authentication'
              ],
              [
                'Users can view profiles',
                'Users can edit profiles',
                'Profile changes persist',
                'Integration tests pass'
              ]
            )
          },
          {
            title: 'Add User Management Tests',
            type: 'Documentation',
            priority: 'Medium',
            content: this.generateStandardCRContent(
              'Add User Management Tests',
              'Add test documentation for user management',
              'Ensure user management features are well tested',
              'Creating comprehensive test suite covering all user management scenarios',
              [
                'Write unit tests',
                'Write integration tests',
                'Add test documentation',
                'Set up CI pipeline'
              ],
              [
                'Test coverage > 90%',
                'All tests pass',
                'Documentation complete',
                'CI pipeline configured'
              ]
            )
          }
        ]
      };
    }
  }

  /**
   * Generate standard CR content with all required sections
   */
  private generateStandardCRContent(
    title: string,
    description: string,
    rationale: string,
    solutionAnalysis: string,
    implementationSteps: string[],
    acceptanceCriteria: string[]
  ): string {
    const sections = [
      '## 1. Description',
      '',
      description,
      '',
      '## 2. Rationale',
      '',
      rationale,
      '',
      '## 3. Solution Analysis',
      '',
      solutionAnalysis,
      '',
      '## 4. Implementation Specification',
      ''
    ];

    implementationSteps.forEach((step, index) => {
      sections.push(`${index + 1}. ${step}`);
    });

    sections.push(
      '',
      '## 5. Acceptance Criteria',
      ''
    );

    acceptanceCriteria.forEach((criteria, index) => {
      sections.push(`- [ ] ${criteria}`);
    });

    return sections.join('\n');
  }

  /**
   * Set up dependencies for complex scenarios
   *
   * Note: Currently commented out as simulation doesn't support update_cr_attrs
   * In real implementation, this would set up CR dependencies
   */
  private async setupComplexDependencies(
    projectCode: string,
    crs: MCPResponse[]
  ): Promise<void> {
    // In real implementation, would set up dependencies like:
    // await this.mcpClient.callTool('update_cr_attrs', {
    //   project: projectCode,
    //   key: crs[2].data.key, // Test CR
    //   attributes: {
    //     dependsOn: crs[1].data.key // Depends on implementation CR
    //   }
    // });
    // await this.mcpClient.callTool('update_cr_attrs', {
    //   project: projectCode,
    //   key: crs[1].data.key, // Implementation CR
    //   attributes: {
    //     dependsOn: crs[0].data.key // Depends on architecture CR
    //   }
    // });
  }
}