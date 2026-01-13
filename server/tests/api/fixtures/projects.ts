/**
 * Project Fixtures - MDT-106
 *
 * Test data fixtures for project-related API tests.
 */

import type { ProjectConfig } from '@mdt/shared/test-lib';

/**
 * Default project configuration for API testing
 */
const defaultProjectConfig: ProjectConfig = {
  name: 'API Test Project',
  code: 'API',
  description: 'Test project for API integration testing',
  ticketsPath: 'docs/CRs',
  documentPaths: ['docs'],
  excludeFolders: ['node_modules', '.git', 'dist'],
  repository: 'test-repo',
};

/**
 * Minimal project configuration
 */
const minimalProjectConfig: ProjectConfig = {
  name: 'Minimal Test Project',
  code: 'MIN',
};

/**
 * Project configuration with custom tickets path
 */
const customPathProjectConfig: ProjectConfig = {
  name: 'Custom Path Project',
  code: 'CUST',
  ticketsPath: 'specifications/change-requests',
  documentPaths: ['specifications', 'docs'],
};

/**
 * Create project config with custom code
 */
function createProjectConfig(overrides?: Partial<ProjectConfig>): ProjectConfig {
  return {
    ...defaultProjectConfig,
    ...overrides,
  };
}

/**
 * Generate unique project code for testing
 */
export function generateTestProjectCode(): string {
  return `TEST${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

/**
 * CR creation data fixtures
 */
export const crFixtures = {
  feature: {
    title: 'New Feature Request',
    type: 'Feature Enhancement' as const,
    priority: 'High' as const,
    content: 'Description of the new feature to be implemented',
  },

  bug: {
    title: 'Fix Navigation Bug',
    type: 'Bug Fix' as const,
    priority: 'Critical' as const,
    content: 'Navigation menu not responding on mobile devices',
  },

  architecture: {
    title: 'Database Schema Design',
    type: 'Architecture' as const,
    priority: 'High' as const,
    content: 'Design and implement database schema for user management',
  },

  documentation: {
    title: 'Update API Documentation',
    type: 'Documentation' as const,
    priority: 'Low' as const,
    content: 'Update API docs to reflect recent changes',
  },

  technicalDebt: {
    title: 'Refactor Authentication Module',
    type: 'Technical Debt' as const,
    priority: 'Medium' as const,
    content: 'Update legacy authentication code to use new patterns',
  },
};

/**
 * CR update data fixtures for PATCH/PUT tests
 */
export const crUpdateFixtures = {
  statusChange: {
    status: 'In Progress' as const,
  },

  priorityChange: {
    priority: 'Critical' as const,
  },

  assigneeChange: {
    assignee: 'john.doe@example.com',
  },

  multipleFields: {
    status: 'In Progress' as const,
    priority: 'High' as const,
    assignee: 'jane.smith@example.com',
  },

  invalidStatus: {
    status: 'InvalidStatusValue' as string,
  },

  empty: {},
};

/**
 * Error scenario fixtures
 */
export const errorFixtures = {
  missingTitle: {
    type: 'Feature Enhancement',
    priority: 'High',
  },

  missingType: {
    title: 'Test CR without type',
    priority: 'Medium',
  },

  emptyCR: {},
};
