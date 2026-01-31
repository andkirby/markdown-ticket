/**
 * Project Factory - Test utility for creating minimal project structures and CRs for testing.
 *
 * Refactored to delegate to TestProjectBuilder and TestTicketBuilder for implementation.
 * This class acts as an orchestrator, coordinating the builders for creating test scenarios.
 */

import type { CRPriorityValue as CRPriority, CRTypeValue as CRType } from '@mdt/domain-contracts'
import type { CRStatus } from '../../models/Types.js'
import type { TestEnvironment } from './test-environment.js'
import { join } from 'node:path'
import { TestProjectBuilder } from '../ticket/test-project-builder.js'
import { TestTicketBuilder } from '../ticket/test-ticket-builder.js'

/** Simple CR data structure for testing (legacy compatibility) */
export interface SimpleCR {
  code: string
  title: string
  status: CRStatus
  type: CRType
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  dateCreated: string
  content: string
  phaseEpic?: string
  assignee?: string
  impactAreas?: string[]
  relatedTickets?: string
  dependsOn?: string
  blocks?: string
}

/** Project configuration for test projects */
export interface ProjectConfig {
  repository?: string
  name?: string
  code?: string
  description?: string
  ticketsPath?: string
  documentPaths?: string[]
  excludeFolders?: string[]
}

/** Created project data */
export interface ProjectData {
  key: string
  path: string
  config: ProjectConfig
}

/** Test CR data structure */
export interface TestCRData {
  title: string
  type: CRType
  status?: CRStatus
  priority?: CRPriority
  phaseEpic?: string
  dependsOn?: string
  blocks?: string
  assignee?: string
  content: string
}

/** Test scenario results */
export interface TestScenario {
  projectCode: string
  projectName: string
  projectDir: string
  crs: TestCRResult[]
}

/** Result of creating a test CR */
export interface TestCRResult {
  success: boolean
  crCode?: string
  filePath?: string
  error?: string
}

/**
 * Error class for ProjectFactory operations
 */
export class ProjectFactoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'ProjectFactoryError'
  }
}

/**
 * Factory for creating test projects and CRs using extracted builders.
 *
 * This class orchestrates TestProjectBuilder and TestTicketBuilder to provide
 * the same public API as before, while delegating implementation to the builders.
 */
export class ProjectFactory {
  private testEnv: TestEnvironment
  private projectsDir: string
  private projectBuilder: TestProjectBuilder
  private ticketBuilder: TestTicketBuilder

  constructor(testEnv: TestEnvironment) {
    this.testEnv = testEnv
    if (!testEnv.isInitialized()) {
      throw new ProjectFactoryError(
        'TestEnvironment must be initialized before creating ProjectFactory',
      )
    }

    // Projects will be created in temp directory
    this.projectsDir = join(testEnv.getTempDirectory(), 'projects')

    // Initialize builders with the projects directory
    this.projectBuilder = new TestProjectBuilder(this.projectsDir)
    this.ticketBuilder = new TestTicketBuilder(this.projectsDir)
  }

  /**
   * Get the projects directory path.
   */
  getProjectsDir(): string {
    return this.projectsDir
  }

  /**
   * Create a test project with default configuration
   */
  async createProject(
    _type: 'empty' = 'empty',
    config: ProjectConfig = {},
  ): Promise<ProjectData> {
    // Generate unique code if not provided
    const projectCode = config.code || this.projectBuilder.generateUniqueProjectCode()

    // Create project using TestProjectBuilder
    const result = await this.projectBuilder.createProject(projectCode, config)

    // Register the project config with the ticket builder
    this.ticketBuilder.registerProject(result.key, result.config.ticketsPath)

    return result
  }

  /**
   * Create a test CR using TestTicketBuilder
   */
  async createTestCR(
    projectCode: string,
    crData: TestCRData,
  ): Promise<TestCRResult> {
    return this.ticketBuilder.createTicket(projectCode, crData)
  }

  /**
   * Create multiple CRs for a project
   *
   * This orchestrator method calls TestTicketBuilder multiple times
   * to create a series of tickets for the same project.
   */
  async createMultipleCRs(
    projectCode: string,
    crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[],
  ): Promise<TestCRResult[]> {
    const results: TestCRResult[] = []

    for (const crData of crsData) {
      const result = await this.createTestCR(projectCode, crData)
      results.push(result)
    }

    return results
  }

  /**
   * Create a test scenario with predefined project and CRs
   *
   * This orchestrator method creates a project and then populates it
   * with a set of predefined CRs based on the scenario type.
   */
  async createTestScenario(
    scenarioType: 'standard-project' | 'complex-project' = 'standard-project',
  ): Promise<TestScenario> {
    const project = await this.createProject('empty', {
      name: `${scenarioType === 'standard-project' ? 'Standard' : 'Complex'} Test Project`,
    })

    let crsData: Omit<TestCRData, 'dependsOn' | 'blocks'>[] = []

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
      ]
    }
    else {
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
      ]
    }

    const crResults = await this.createMultipleCRs(project.key, crsData)

    return {
      projectCode: project.key,
      projectName: project.config.name || project.key,
      projectDir: project.path,
      crs: crResults,
    }
  }

  /**
   * Clean up all created test projects
   */
  async cleanup(): Promise<void> {
    // Test environment cleanup will handle removing the temp directory
    // This is just for any additional cleanup if needed
  }
}
