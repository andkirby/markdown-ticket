/**
 * Scenario Builder Utility
 *
 * Extracted from ProjectFactory to handle complex test scenario creation.
 * Orchestrates ProjectSetup and TestDataFactory to create complete test scenarios.
 */

import { ProjectSetup } from './project-setup';
import { TestDataFactory } from './test-data-factory';
import { getScenarioDefinition } from './scenario-definitions';
import {
  TestScenario,
  ScenarioType,
  ProjectConfig,
  TestCRData,
  MCPResponse,
  ProjectFactoryError
} from '../types/project-factory-types';

export interface ScenarioBuilderOptions {
  projectSetup: ProjectSetup;
  testDataFactory: TestDataFactory;
}

export interface ScenarioDefinition {
  projectCode: string;
  projectName: string;
  projectConfig: ProjectConfig;
  crsData: TestCRData[];
}

export class ScenarioBuilder {
  private projectSetup: ProjectSetup;
  private testDataFactory: TestDataFactory;

  constructor(options: ScenarioBuilderOptions) {
    if (!options.projectSetup) throw new ProjectFactoryError('ProjectSetup is required');
    if (!options.testDataFactory) throw new ProjectFactoryError('TestDataFactory is required');
    this.projectSetup = options.projectSetup;
    this.testDataFactory = options.testDataFactory;
  }

  async createScenario(scenarioType: ScenarioType): Promise<TestScenario> {
    try {
      const definition = getScenarioDefinition(scenarioType);
      const projectDir = await this.projectSetup.createProjectStructure(
        definition.projectCode, definition.projectName, definition.projectConfig
      );
      const crs = await this.testDataFactory.createMultipleCRs(definition.projectCode, definition.crsData);

      if (scenarioType === 'complex-project' && crs.length >= 3) {
        await this.setupComplexDependencies(definition.projectCode, crs);
      }

      return { projectCode: definition.projectCode, projectName: definition.projectName, projectDir, crs };
    } catch (error) {
      throw new ProjectFactoryError(
        `Failed to create test scenario: ${scenarioType}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async createCustomScenario(definition: ScenarioDefinition): Promise<TestScenario> {
    try {
      const projectDir = await this.projectSetup.createProjectStructure(
        definition.projectCode, definition.projectName, definition.projectConfig
      );
      const crs = await this.testDataFactory.createMultipleCRs(definition.projectCode, definition.crsData);
      return { projectCode: definition.projectCode, projectName: definition.projectName, projectDir, crs };
    } catch (error) {
      throw new ProjectFactoryError(
        `Failed to create custom scenario for ${definition.projectCode}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async setupComplexDependencies(projectCode: string, crs: MCPResponse[]): Promise<void> {
    // Dependencies would be set up here using update_cr_attrs
  }
}