/**
 * Project Factory - Test utility for creating minimal project structures and CRs for E2E testing.
 *
 * NOTE: This is a legacy facade for backward compatibility.
 * New tests should import from 'shared/test-lib' directly:
 *
 * import { TestEnvironment, ProjectFactory } from 'shared/test-lib';
 */
import { TestEnvironment } from './test-environment';
import { MCPClient, MCPResponse } from './mcp-client';
import {
  ProjectConfig, ProjectData, TestCRData, TestScenario
} from './types/project-factory-types';
import { ProjectFactoryError } from '@mdt/shared/test-lib';
import { FileHelper } from './utils/file-helper';
import { ConfigurationGenerator } from './config/configuration-generator';
import { TestDataFactory } from './core/test-data-factory';
import { ProjectSetup } from './core/project-setup';
import { ScenarioBuilder } from './core/scenario-builder';

// Re-export from shared/test-lib for new usage
export {
  TestEnvironment as SharedTestEnvironment,
  ProjectFactory as SharedProjectFactory,
  TestServer,
  FileTicketCreator
} from '@mdt/shared/test-lib';

export interface ProjectFactoryDependencies {
  projectSetup?: ProjectSetup;
  testDataFactory?: TestDataFactory;
  scenarioBuilder?: ScenarioBuilder;
}

export class ProjectFactory {
  private testEnv: TestEnvironment;
  private mcpClient: MCPClient;
  private configGenerator: ConfigurationGenerator;
  private testDataFactory: TestDataFactory;
  private scenarioBuilder: ScenarioBuilder;
  private projectSetup: ProjectSetup;

  constructor(
    testEnv: TestEnvironment,
    mcpClient: MCPClient,
    dependencies: ProjectFactoryDependencies = {}
  ) {
    if (!testEnv) throw new ProjectFactoryError('TestEnvironment is required');
    if (!mcpClient) throw new ProjectFactoryError('MCPClient is required');

    this.testEnv = testEnv;
    this.mcpClient = mcpClient;
    this.configGenerator = new ConfigurationGenerator({
      configDir: testEnv.getConfigDir(),
      projectsConfigDir: FileHelper.joinPath(testEnv.getConfigDir(), 'projects')
    });

    this.projectSetup = dependencies.projectSetup ||
      new ProjectSetup({ testEnv, configGenerator: this.configGenerator });
    this.testDataFactory = dependencies.testDataFactory || new TestDataFactory(mcpClient);
    this.scenarioBuilder = dependencies.scenarioBuilder ||
      new ScenarioBuilder({ projectSetup: this.projectSetup, testDataFactory: this.testDataFactory });
  }

  async createProject(type: 'empty' = 'empty', config: ProjectConfig = {}): Promise<ProjectData> {
    const projectCode = config.code || this.generateUniqueProjectCode();
    const projectName = config.name || `Test Project ${projectCode}`;
    const finalConfig: ProjectConfig = {
      description: 'Test project for E2E testing',
      ticketsPath: 'docs/CRs',
      repository: 'test-repo',
      ...config
    };

    const projectPath = await this.createProjectStructure(projectCode, projectName, finalConfig);

    return { key: projectCode, path: projectPath, config: finalConfig };
  }

  private generateUniqueProjectCode(): string {
    const randomPart = Math.random().toString(36).replace(/[^a-z]/g, '').toUpperCase().substr(0, 3) || 'AAA';
    return `T${randomPart}`.substr(0, 5);
  }

  async createProjectStructure(
    projectCode: string,
    projectName: string,
    config: ProjectConfig = {}
  ): Promise<string> {
    return this.projectSetup.createProjectStructure(projectCode, projectName, config);
  }

  async createTestCR(projectCode: string, crData: TestCRData): Promise<MCPResponse> {
    return this.testDataFactory.createTestCR(projectCode, crData);
  }

  async createMultipleCRs(
    projectCode: string,
    crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[]
  ): Promise<MCPResponse[]> {
    return this.testDataFactory.createMultipleCRs(projectCode, crsData);
  }

  async createTestScenario(
    scenarioType: 'standard-project' | 'complex-project' = 'standard-project'
  ): Promise<TestScenario> {
    return this.scenarioBuilder.createScenario(scenarioType);
  }
}