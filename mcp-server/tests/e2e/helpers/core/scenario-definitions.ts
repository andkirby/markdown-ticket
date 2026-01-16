/**
 * Scenario Definitions
 *
 * Predefined test scenario definitions extracted from ScenarioBuilder
 * to keep the main class within size constraints.
 */

import type { ScenarioDefinition } from './scenario-builder'
import { ContentTemplates } from '../config/content-templates'

export const STANDARD_PROJECT_SCENARIO: ScenarioDefinition = {
  projectCode: 'TEST',
  projectName: 'Test Project',
  projectConfig: {},
  crsData: [
    {
      title: 'Setup Project Infrastructure',
      type: 'Architecture',
      priority: 'High',
      content: ContentTemplates.generateScenarioCRContent('standard-project', {
        title: 'Setup Project Infrastructure',
        type: 'Architecture',
        description: 'Setup basic project infrastructure for testing',
      }),
    },
    {
      title: 'Fix Login Bug',
      type: 'Bug Fix',
      priority: 'High',
      content: ContentTemplates.generateScenarioCRContent('standard-project', {
        title: 'Fix Login Bug',
        type: 'Bug Fix',
        description: 'Users cannot login with valid credentials',
      }),
    },
  ],
}

export const COMPLEX_PROJECT_SCENARIO: ScenarioDefinition = {
  projectCode: 'COMP',
  projectName: 'Complex Test Project',
  projectConfig: {
    repository: 'https://github.com/example/complex-project',
    ticketsPath: 'tickets',
    documentPaths: ['docs', 'specifications', 'wiki'],
  },
  crsData: [
    {
      title: 'Database Schema Design',
      type: 'Architecture',
      priority: 'Critical',
      content: ContentTemplates.generateScenarioCRContent('complex-project', {
        title: 'Database Schema Design',
        type: 'Architecture',
        description: 'Design database schema for complex application',
      }),
    },
    {
      title: 'Implement User Management',
      type: 'Feature Enhancement',
      priority: 'High',
      content: ContentTemplates.generateScenarioCRContent('complex-project', {
        title: 'Implement User Management',
        type: 'Feature Enhancement',
        description: 'Implement user management features',
      }),
    },
    {
      title: 'Add User Management Tests',
      type: 'Documentation',
      priority: 'Medium',
      content: ContentTemplates.generateStandardCRContent({
        title: 'Add User Management Tests',
        description: 'Add test documentation for user management',
        rationale: 'Ensure user management features are well tested',
        solutionAnalysis: 'Creating comprehensive test suite covering all user management scenarios',
        implementationSteps: ['Write unit tests', 'Write integration tests', 'Add test documentation', 'Set up CI pipeline'],
        acceptanceCriteria: ['Test coverage > 90%', 'All tests pass', 'Documentation complete', 'CI pipeline configured'],
      }, 'Documentation'),
    },
  ],
}

export function getScenarioDefinition(scenarioType: 'standard-project' | 'complex-project'): ScenarioDefinition {
  return scenarioType === 'standard-project' ? STANDARD_PROJECT_SCENARIO : COMPLEX_PROJECT_SCENARIO
}
