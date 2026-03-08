/**
 * Scenario Builder
 *
 * Defines predefined test scenarios with different complexity levels:
 * - Simple: 3 tickets (basic smoke test)
 * - Medium: 7 tickets (realistic project)
 * - Complex: 12 tickets (full project simulation)
 */

import { promises as fs } from 'node:fs'
import { join as pathJoin } from 'node:path'

import type { TestCRData } from '@mdt/shared/test-lib'
import type { ProjectFactory } from '@mdt/shared/test-lib'

/** Scenario types available for testing */
export type ScenarioType = 'simple' | 'medium' | 'complex'

/** Result of building a scenario */
export interface ScenarioResult {
  /** Project code (e.g., 'TEST') */
  projectCode: string
  /** Project name */
  projectName: string
  /** Project directory path */
  projectDir: string
  /** Created CR codes */
  crCodes: string[]
  /** Number of tickets created */
  ticketCount: number
}

/** Scenario configuration */
interface ScenarioConfig {
  name: string
  tickets: Omit<TestCRData, 'dependsOn' | 'blocks'>[]
}

/** Predefined scenario configurations */
const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  simple: {
    name: 'Simple Test Project',
    tickets: [
      {
        title: 'Setup Project Structure',
        type: 'Architecture',
        status: 'Implemented',
        priority: 'High',
        content: 'Initialize project with basic configuration and directory structure.',
      },
      {
        title: 'Add User Authentication',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'Medium',
        content: 'Implement login and registration with JWT tokens.',
      },
      {
        title: 'Fix Navigation Bug',
        type: 'Bug Fix',
        status: 'Proposed',
        priority: 'High',
        content: 'Navigation menu not responding on mobile devices.',
      },
    ],
  },
  medium: {
    name: 'Medium Test Project',
    tickets: [
      {
        title: 'Core Architecture Design',
        type: 'Architecture',
        status: 'Implemented',
        priority: 'Critical',
        content: 'Design overall system architecture with layered approach.',
      },
      {
        title: 'Database Schema',
        type: 'Architecture',
        status: 'Implemented',
        priority: 'High',
        content: 'Define database schema for all entities.',
      },
      {
        title: 'User Management Service',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'High',
        content: 'Implement user CRUD operations and authentication.',
      },
      {
        title: 'API Gateway Setup',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'High',
        content: 'Configure API gateway for routing.',
      },
      {
        title: 'Fix Race Condition',
        type: 'Bug Fix',
        status: 'Proposed',
        priority: 'Critical',
        content: 'Race condition in concurrent user creation.',
      },
      {
        title: 'Refactor Legacy Code',
        type: 'Technical Debt',
        status: 'Proposed',
        priority: 'Medium',
        content: 'Update legacy authentication module.',
      },
      {
        title: 'API Documentation',
        type: 'Documentation',
        status: 'Proposed',
        priority: 'Low',
        content: 'Document all API endpoints with examples.',
      },
    ],
  },
  complex: {
    name: 'Complex Test Project',
    tickets: [
      {
        title: 'System Architecture',
        type: 'Architecture',
        status: 'Implemented',
        priority: 'Critical',
        content: 'Overall system design with microservices.',
      },
      {
        title: 'Database Layer',
        type: 'Architecture',
        status: 'Implemented',
        priority: 'High',
        content: 'Database schema and migrations.',
      },
      {
        title: 'Authentication Module',
        type: 'Feature Enhancement',
        status: 'Implemented',
        priority: 'High',
        content: 'OAuth2 and JWT authentication.',
      },
      {
        title: 'User Dashboard',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'High',
        content: 'Main user dashboard with widgets.',
      },
      {
        title: 'Reporting Engine',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'Medium',
        content: 'PDF and Excel report generation.',
      },
      {
        title: 'Email Notifications',
        type: 'Feature Enhancement',
        status: 'In Progress',
        priority: 'Medium',
        content: 'Email notification service.',
      },
      {
        title: 'Fix Memory Leak',
        type: 'Bug Fix',
        status: 'In Progress',
        priority: 'Critical',
        content: 'Memory leak in file upload handler.',
      },
      {
        title: 'Fix Session Timeout',
        type: 'Bug Fix',
        status: 'Proposed',
        priority: 'High',
        content: 'Session timeout too aggressive.',
      },
      {
        title: 'Code Cleanup',
        type: 'Technical Debt',
        status: 'Proposed',
        priority: 'Medium',
        content: 'Remove deprecated functions.',
      },
      {
        title: 'Performance Optimization',
        type: 'Technical Debt',
        status: 'Proposed',
        priority: 'Medium',
        content: 'Optimize database queries.',
      },
      {
        title: 'User Guide',
        type: 'Documentation',
        status: 'Proposed',
        priority: 'Low',
        content: 'Comprehensive user documentation.',
      },
      {
        title: 'API Reference',
        type: 'Documentation',
        status: 'Proposed',
        priority: 'Low',
        content: 'OpenAPI specification update.',
      },
    ],
  },
}

/**
 * Build a test scenario with predefined project and tickets
 *
 * @param projectFactory - Factory for creating projects and CRs
 * @param type - Scenario type (simple, medium, complex)
 * @param fileWatcher - Optional file watcher service to initialize for test projects
 * @returns Scenario result with project and ticket info
 */
export async function buildScenario(
  projectFactory: ProjectFactory,
  type: ScenarioType = 'simple',
  fileWatcher?: {
    initMultiProjectWatcher: (projectPaths: Array<{ id: string; path: string }>) => void
  },
): Promise<ScenarioResult> {
  const scenario = SCENARIOS[type]

  // Create project
  const project = await projectFactory.createProject('empty', {
    name: scenario.name,
  })

  // Create tickets
  const results = await projectFactory.createMultipleCRs(
    project.key,
    scenario.tickets,
  )

  // Extract successful CR codes
  const crCodes = results
    .filter(r => r.success && r.crCode)
    .map(r => r.crCode!)

  // Create test documents folder structure for documents view tests
  const docsPath = pathJoin(project.path, 'docs')
  await fs.mkdir(docsPath, { recursive: true })

  // Create test markdown files
  await fs.writeFile(
    pathJoin(docsPath, 'README.md'),
    '# Test Project\n\nThis is a test document.',
  )
  await fs.writeFile(
    pathJoin(docsPath, 'architecture.md'),
    '# Architecture\n\nSystem design docs.',
  )
  // Create CRs folder (for tickets)
  await fs.mkdir(pathJoin(docsPath, 'CRs'), { recursive: true })

  // Initialize file watcher for this project (if provided)
  // This ensures SSE events are broadcast when tickets are updated
  if (fileWatcher) {
    fileWatcher.initMultiProjectWatcher([
      { id: project.key, path: `${project.path}/docs/CRs` },
    ])
  }

  return {
    projectCode: project.key,
    projectName: scenario.name,
    projectDir: project.path,
    crCodes,
    ticketCount: crCodes.length,
  }
}

/**
 * Get scenario metadata without building
 */
export function getScenarioInfo(type: ScenarioType): {
  name: string
  ticketCount: number
} {
  return {
    name: SCENARIOS[type].name,
    ticketCount: SCENARIOS[type].tickets.length,
  }
}
